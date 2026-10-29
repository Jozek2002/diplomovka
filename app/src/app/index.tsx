import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  HTTP_URL,
  requestJson,
} from '@/services/http-client';

import {
  createWebSocketClient,
  WS_URL,
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

import {
  finishMeasurement,
  startMeasurement,
} from '@/services/command-measurements';

import type {
  MeasurementOutcome,
} from '@/services/command-measurements';

type ActiveCommand = {
  measurementId: string;
  requestId: string;
  requestedOutput: boolean;
};

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'AbortError'
  );
}

function errorMessage(error: unknown): string {
  if (isTimeout(error)) {
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
  const sessionId = useRef('');

  const activeCommand =
    useRef<ActiveCommand | null>(null);

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

  function endActiveCommand(
    outcome: MeasurementOutcome,
    detail: string
  ) {
    const command = activeCommand.current;

    if (!command) {
      return;
    }

    activeCommand.current = null;

    finishMeasurement(command.measurementId, {
      outcome,
      detail,
    });
  }

  function releaseResources(
    outcome: MeasurementOutcome = 'interrupted',
    detail = 'Relácia bola ukončená.'
  ) {
    session.current += 1;

    endActiveCommand(outcome, detail);
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
    releaseResources(
      message === null ? 'interrupted' : 'error',
      message ?? 'Používateľ ukončil spojenie.'
    );

    setStatus('disconnected');
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);
    setError(message);

    addEvent(
      message === null ? 'info' : 'error',
      message ?? 'Používateľ ukončil spojenie.'
    );
  }

  useEffect(() => {
    return () => {
      releaseResources(
        'interrupted',
        'Obrazovka bola odpojená.'
      );
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

  function prepareConnection() {
    releaseResources();

    sessionId.current =
      `session-${Date.now()}-${session.current}`;

    setStatus('connecting');
    setError(null);
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);

    return session.current;
  }

  async function connectHttp() {
    const currentSession = prepareConnection();

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
    const currentSession = prepareConnection();

    const isCurrentSession = () =>
      session.current === currentSession;

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
          const endedAt = performance.now();
          const command = activeCommand.current;

          if (
            !isCurrentSession() ||
            command === null ||
            message.requestId !== command.requestId
          ) {
            return;
          }

          activeCommand.current = null;

          if (outputTimer.current !== null) {
            clearTimeout(outputTimer.current);
            outputTimer.current = null;
          }

          if (
            message.data.outputEnabled !==
            command.requestedOutput
          ) {
            finishMeasurement(
              command.measurementId,
              {
                outcome: 'error',
                endedAt,
                confirmedOutput:
                  message.data.outputEnabled,
                detail:
                  'Potvrdený stav nezodpovedá požiadavke.',
              }
            );

            stopConnection(
              'Server potvrdil iný stav výstupu, ' +
                'než bol požadovaný.'
            );

            return;
          }

          const measurement = finishMeasurement(
            command.measurementId,
            {
              outcome: 'confirmed',
              endedAt,
              confirmedOutput:
                message.data.outputEnabled,
            }
          );

          setOutputEnabled(
            message.data.outputEnabled
          );

          setOutputBusy(false);

          const timingText =
            measurement?.rttMs == null
              ? ''
              : ` Aplikačné RTT: ${
                  measurement.rttMs.toFixed(2)
                } ms.`;

          console.log(
            `[WS ACK] ${message.requestId}` +
              timingText
          );

          addEvent(
            'success',
            `WebSocket: potvrdený ${
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
      activeCommand.current !== null
    ) {
      return;
    }

    const currentSession = session.current;

    setOutputBusy(true);
    setError(null);

    requestCounter.current += 1;

    const requestId =
      `req-${Date.now()}-${requestCounter.current}`;

    addEvent(
      'command',
      `${protocol}: požadované ${
        nextValue ? 'zapnutie' : 'vypnutie'
      } výstupu. ID: ${requestId}`
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

      const payload = JSON.stringify({
        type: 'setOutput',
        requestId,
        outputEnabled: nextValue,
      });

      outputTimer.current = setTimeout(() => {
        if (
          session.current === currentSession &&
          activeCommand.current?.requestId ===
            requestId
        ) {
          endActiveCommand(
            'timeout',
            'Potvrdenie neprišlo do 5 sekúnd.'
          );

          stopConnection(
            `Server nepotvrdil príkaz ${requestId}. ` +
              'Stav výstupu je neistý; znovu sa pripoj.'
          );
        }
      }, 5000);

      const measurementId = startMeasurement({
        sessionId: sessionId.current,
        protocol,
        endpoint: WS_URL,
        requestId,
        requestedOutput: nextValue,
      });

      activeCommand.current = {
        measurementId,
        requestId,
        requestedOutput: nextValue,
      };

      try {
        socket.send(payload);
      } catch (sendError) {
        endActiveCommand(
          'error',
          errorMessage(sendError)
        );

        stopConnection(
          errorMessage(sendError)
        );
      }

      return;
    }

    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outputEnabled: nextValue,
      }),
    };

    const measurementId = startMeasurement({
      sessionId: sessionId.current,
      protocol,
      endpoint: `${HTTP_URL}/output`,
      requestId,
      requestedOutput: nextValue,
    });

    activeCommand.current = {
      measurementId,
      requestId,
      requestedOutput: nextValue,
    };

    try {
      const result =
        await requestJson<OutputState>(
          '/output',
          options
        );

      const endedAt = performance.now();

      if (
        session.current !== currentSession ||
        activeCommand.current?.measurementId !==
          measurementId
      ) {
        return;
      }

      activeCommand.current = null;

      if (result.outputEnabled !== nextValue) {
        finishMeasurement(measurementId, {
          outcome: 'error',
          endedAt,
          confirmedOutput: result.outputEnabled,
          detail:
            'Potvrdený stav nezodpovedá požiadavke.',
        });

        stopConnection(
          'Server potvrdil iný stav výstupu, ' +
            'než bol požadovaný.'
        );

        return;
      }

      const measurement = finishMeasurement(
        measurementId,
        {
          outcome: 'confirmed',
          endedAt,
          confirmedOutput: result.outputEnabled,
        }
      );

      setOutputEnabled(result.outputEnabled);
      setOutputBusy(false);

      const timingText =
        measurement?.rttMs == null
          ? ''
          : ` Aplikačné RTT: ${
              measurement.rttMs.toFixed(2)
            } ms.`;

      console.log(
        `[HTTP ACK] ${requestId}` +
          timingText
      );

      addEvent(
        'success',
        `HTTP/REST: potvrdený ${
          result.outputEnabled
            ? 'zapnutý'
            : 'vypnutý'
        } výstup.` +
          timingText +
          ` ID: ${requestId}`
      );
    } catch (requestError) {
      if (session.current !== currentSession) {
        return;
      }

      endActiveCommand(
        isTimeout(requestError)
          ? 'timeout'
          : 'error',
        errorMessage(requestError)
      );

      stopConnection(
        'Zmenu výstupu sa nepodarilo potvrdiť. ' +
          errorMessage(requestError) +
          ' Znovu sa pripoj na načítanie stavu.'
      );
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