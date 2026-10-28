import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { requestJson } from '@/services/http-client';

import {
  createWebSocketClient,
} from '@/services/websocket-client';

import type {
  OutputState,
  Protocol,
  Status,
  Telemetry,
} from '@/types/iot';

import {
  useMonitorInsights,
} from '@/components/MonitorInsights';

import {
  MonitorDashboard,
} from '@/components/MonitorDashboard';

function errorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.name === 'AbortError'
  ) {
    return 'Server neodpovedal do 5 sekúnd.';
  }

  return error instanceof Error
    ? error.message
    : 'Neznáma chyba komunikácie.';
}

export default function HomeScreen() {
  const [protocol, setProtocol] =
    useState<Protocol>('HTTP/REST');

  const [status, setStatus] =
    useState<Status>('disconnected');

  const [telemetry, setTelemetry] =
    useState<Telemetry | null>(null);

  const [outputEnabled, setOutputEnabled] =
    useState(false);

  const [outputBusy, setOutputBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const session = useRef(0);
  const requestCounter = useRef(0);

  const pendingRequestId =
    useRef<string | null>(null);

  const pendingStartedAt =
  useRef<number | null>(null);

  const socketRef =
    useRef<WebSocket | null>(null);

  const connectTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const outputTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const connected = status === 'connected';

  const {
    samples,
    events,
    resetHistory,
    addEvent,
    clearEvents,
  } = useMonitorInsights(telemetry, connected);

  function clearTimers() {
    if (connectTimer.current !== null) {
      clearTimeout(connectTimer.current);
      connectTimer.current = null;
    }

    if (outputTimer.current !== null) {
      clearTimeout(outputTimer.current);
      outputTimer.current = null;
    }
  }

  function releaseResources() {
    session.current += 1;
    pendingRequestId.current = null;
    pendingStartedAt.current = null;

    clearTimers();

    const socket = socketRef.current;
    socketRef.current = null;

    if (socket !== null) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
  }

  function stopConnection(
    message: string | null = null
  ) {
    releaseResources();

    setStatus('disconnected');
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);
    setError(message);

    if (message !== null) {
      addEvent('error', message);
    } else {
      addEvent(
        'info',
        'Používateľ ukončil spojenie.'
      );
    }
  }

  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, []);

  useEffect(() => {
    if (
      status !== 'connected' ||
      protocol !== 'HTTP/REST'
    ) {
      return;
    }

    const currentSession = session.current;

    let cancelled = false;

    let timer:
      | ReturnType<typeof setTimeout>
      | undefined;

    async function poll() {
      try {
        const data =
          await requestJson<Telemetry>('/telemetry');

        if (
          cancelled ||
          session.current !== currentSession
        ) {
          return;
        }

        setTelemetry(data);
        timer = setTimeout(poll, 1000);
      } catch (requestError) {
        if (
          !cancelled &&
          session.current === currentSession
        ) {
          stopConnection(
            errorMessage(requestError)
          );
        }
      }
    }

    timer = setTimeout(poll, 1000);

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [status, protocol]);

  async function connectHttp() {
    releaseResources();

    const currentSession = session.current;

    setStatus('connecting');
    setError(null);
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);

    try {
      const [data, output] = await Promise.all([
        requestJson<Telemetry>('/telemetry'),
        requestJson<OutputState>('/output'),
      ]);

      if (session.current !== currentSession) {
        return;
      }

      setTelemetry(data);
      setOutputEnabled(output.outputEnabled);
      setStatus('connected');

      addEvent(
        'success',
        'HTTP/REST pripojenie pripravené.'
      );
    } catch (requestError) {
      if (session.current === currentSession) {
        stopConnection(
          errorMessage(requestError)
        );
      }
    }
  }

  function connectWebSocket() {
    releaseResources();

    const currentSession = session.current;

    setStatus('connecting');
    setError(null);
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);

    function isCurrentSession() {
      return session.current === currentSession;
    }

    try {
      connectTimer.current = setTimeout(() => {
        if (isCurrentSession()) {
          stopConnection(
            'WebSocket neposlal úvodný stav do 5 sekúnd.'
          );
        }
      }, 5000);

      socketRef.current = createWebSocketClient({
        onTelemetry: (data) => {
          if (isCurrentSession()) {
            setTelemetry(data);
          }
        },

        onOutput: (data) => {
          if (isCurrentSession()) {
            setOutputEnabled(data.outputEnabled);
          }
        },

        onOutputAck: (message) => {
          const receivedAt = performance.now();

          if (
            !isCurrentSession() ||
            message.requestId !== pendingRequestId.current
          ) {
            return;
          }

          const startedAt = pendingStartedAt.current;

          if (outputTimer.current !== null) {
            clearTimeout(outputTimer.current);
            outputTimer.current = null;
          }

          pendingRequestId.current = null;
          pendingStartedAt.current = null;

          setOutputEnabled(message.data.outputEnabled);
          setOutputBusy(false);

          const rttMs =
            startedAt === null
              ? null
              : receivedAt - startedAt;

          const timingText =
            rttMs === null
              ? ''
              : ` Aplikačné RTT: ${rttMs.toFixed(2)} ms.`;

          console.log(
            `[WS ACK] ${message.requestId}` +
              timingText
          );

          addEvent(
            'success',
            `WebSocket: server potvrdil ${
              message.data.outputEnabled
                ? 'zapnutý'
                : 'vypnutý'
            } výstup.` +
              timingText +
              ` ID: ${message.requestId}`
          );
        },

        onReady: () => {
          if (!isCurrentSession()) {
            return;
          }

          if (connectTimer.current !== null) {
            clearTimeout(connectTimer.current);
            connectTimer.current = null;
          }

          setStatus('connected');

          addEvent(
            'success',
            'WebSocket spojenie pripravené.'
          );
        },

        onError: (message) => {
          if (isCurrentSession()) {
            stopConnection(message);
          }
        },

        onClose: () => {
          if (isCurrentSession()) {
            stopConnection(
              'Server ukončil WebSocket spojenie.'
            );
          }
        },
      });
    } catch (connectionError) {
      if (isCurrentSession()) {
        stopConnection(
          errorMessage(connectionError)
        );
      }
    }
  }

  function connect() {
    if (status !== 'disconnected') {
      return;
    }

    resetHistory();

    addEvent(
      'info',
      `Pripájanie cez ${protocol}.`
    );

    if (protocol === 'HTTP/REST') {
      void connectHttp();
    } else {
      connectWebSocket();
    }
  }

  async function changeOutput(
    nextValue: boolean
  ) {
    if (
      !connected ||
      outputBusy ||
      pendingRequestId.current !== null
    ) {
      return;
    }

    const currentSession = session.current;

    setOutputBusy(true);
    setError(null);

    addEvent(
      'command',
      `${protocol}: požadované ${
        nextValue ? 'zapnutie' : 'vypnutie'
      } výstupu.`
    );

    if (protocol === 'WebSocket') {
      const socket = socketRef.current;

      if (
        socket === null ||
        socket.readyState !== WebSocket.OPEN
      ) {
        stopConnection(
          'WebSocket spojenie nie je otvorené.'
        );

        return;
      }

      requestCounter.current += 1;

      const requestId =
        `req-${Date.now()}-${requestCounter.current}`;

      pendingRequestId.current = requestId;

      try {
        outputTimer.current = setTimeout(() => {
          if (
            session.current === currentSession &&
            pendingRequestId.current === requestId
          ) {
            stopConnection(
              `Server nepotvrdil príkaz ${requestId}. ` +
                'Stav výstupu je neistý; znovu sa pripoj ' +
                'na načítanie aktuálneho stavu.'
            );
          }
        }, 5000);

        const payload = JSON.stringify({
          type: 'setOutput',
          requestId,
          outputEnabled: nextValue,
        });

        pendingStartedAt.current = performance.now();

        socket.send(payload);

      } catch (sendError) {
        stopConnection(
          errorMessage(sendError)
        );
      }

      return;
    }

    try {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputEnabled: nextValue,
        }),
      };

      const startedAt = performance.now();

      const result =
        await requestJson<OutputState>(
          '/output',
          options
        );

      const receivedAt = performance.now();

      if (session.current !== currentSession) {
        return;
      }

      const rttMs = receivedAt - startedAt;

      setOutputEnabled(result.outputEnabled);
      setOutputBusy(false);

      console.log(
        `[HTTP ACK] Aplikačné RTT: ${rttMs.toFixed(2)} ms`
      );

      addEvent(
        'success',
        `HTTP/REST: server potvrdil ${
          result.outputEnabled
            ? 'zapnutý'
            : 'vypnutý'
        } výstup. Aplikačné RTT: ${rttMs.toFixed(2)} ms.`
      );
    } catch (requestError) {
      if (session.current === currentSession) {
        stopConnection(
          'Zmenu výstupu sa nepodarilo potvrdiť. ' +
            errorMessage(requestError) +
            ' Znovu sa pripoj na načítanie aktuálneho stavu.'
        );
      }
    }
  }

  return (
    <MonitorDashboard
      protocol={protocol}
      status={status}
      telemetry={telemetry}
      outputEnabled={outputEnabled}
      outputBusy={outputBusy}
      error={error}
      samples={samples}
      events={events}
      onProtocolChange={(value) => {
        if (status !== 'disconnected') {
          return;
        }

        setProtocol(value);
        setError(null);
      }}
      onConnect={connect}
      onDisconnect={() => stopConnection()}
      onOutputChange={(value) => {
        void changeOutput(value);
      }}
      onClearHistory={resetHistory}
      onClearEvents={clearEvents}
    />
  );
}