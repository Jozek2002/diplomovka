import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const HTTP_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/ws';

type Protocol = 'HTTP/REST' | 'WebSocket';
type Status = 'disconnected' | 'connecting' | 'connected';

type Telemetry = {
  deviceId: string;
  simulated: boolean;
  sequence: number;
  temperature: number;
  humidity: number;
  generatedAt: number;
};

type OutputState = {
  outputEnabled: boolean;
};

type ServerMessage =
  | { type: 'telemetry'; data: Telemetry }
  | { type: 'output'; data: OutputState }
  | { type: 'error'; message: string };

async function requestJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${HTTP_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Server vrátil HTTP ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Server neodpovedal do 5 sekúnd.';
  }

  return error instanceof Error
    ? error.message
    : 'Neznáma chyba komunikácie.';
}

export default function HomeScreen() {
  const [protocol, setProtocol] = useState<Protocol>('HTTP/REST');
  const [status, setStatus] = useState<Status>('disconnected');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [outputBusy, setOutputBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  const connectTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const outputTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const connected = status === 'connected';
  const connecting = status === 'connecting';

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

  function stopConnection(message: string | null = null) {
    releaseResources();
    setStatus('disconnected');
    setTelemetry(null);
    setOutputEnabled(false);
    setOutputBusy(false);
    setError(message);
  }

  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, []);

  // HTTP polling: ďalšia požiadavka sa plánuje až po odpovedi.
  useEffect(() => {
    if (status !== 'connected' || protocol !== 'HTTP/REST') {
      return;
    }

    const currentSession = session.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const data = await requestJson<Telemetry>('/telemetry');

        if (cancelled || session.current !== currentSession) {
          return;
        }

        setTelemetry(data);
        timer = setTimeout(poll, 1000);
      } catch (requestError) {
        if (!cancelled && session.current === currentSession) {
          stopConnection(errorMessage(requestError));
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
    } catch (requestError) {
      if (session.current === currentSession) {
        stopConnection(errorMessage(requestError));
      }
    }
  }

  function connectWebSocket() {
    releaseResources();
    const currentSession = session.current;

    setStatus('connecting');
    setError(null);
    setTelemetry(null);
    setOutputBusy(false);

    let receivedTelemetry = false;
    let receivedOutput = false;

    try {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      connectTimer.current = setTimeout(() => {
        if (session.current === currentSession) {
          stopConnection(
            'WebSocket neposlal úvodný stav do 5 sekúnd.'
          );
        }
      }, 5000);

      function markReady() {
        if (receivedTelemetry && receivedOutput) {
          if (connectTimer.current !== null) {
            clearTimeout(connectTimer.current);
            connectTimer.current = null;
          }

          setStatus('connected');
        }
      }

      socket.onmessage = (event) => {
        if (session.current !== currentSession) {
          return;
        }

        try {
          const message = JSON.parse(
            String(event.data)
          ) as ServerMessage;

          switch (message.type) {
            case 'telemetry':
              setTelemetry(message.data);
              receivedTelemetry = true;
              markReady();
              break;

            case 'output':
              setOutputEnabled(message.data.outputEnabled);
              receivedOutput = true;

              if (outputTimer.current !== null) {
                clearTimeout(outputTimer.current);
                outputTimer.current = null;
              }

              setOutputBusy(false);
              markReady();
              break;

            case 'error':
              stopConnection(message.message);
              break;

            default:
              stopConnection('Server poslal neznámy typ správy.');
          }
        } catch {
          stopConnection('Nepodarilo sa spracovať správu servera.');
        }
      };

      socket.onerror = () => {
        if (session.current === currentSession) {
          stopConnection(
            'WebSocket spojenie zlyhalo. Skontroluj simulátor.'
          );
        }
      };

      socket.onclose = () => {
        if (session.current === currentSession) {
          stopConnection('Server ukončil WebSocket spojenie.');
        }
      };
    } catch (connectionError) {
      stopConnection(errorMessage(connectionError));
    }
  }

  function connect() {
    if (protocol === 'HTTP/REST') {
      void connectHttp();
    } else {
      connectWebSocket();
    }
  }

  async function changeOutput(nextValue: boolean) {
    if (!connected || outputBusy) {
      return;
    }

    const currentSession = session.current;
    setOutputBusy(true);
    setError(null);

    if (protocol === 'WebSocket') {
      const socket = socketRef.current;

      if (socket === null || socket.readyState !== WebSocket.OPEN) {
        stopConnection('WebSocket spojenie nie je otvorené.');
        return;
      }

      try {
        outputTimer.current = setTimeout(() => {
          if (session.current === currentSession) {
            stopConnection(
              'Server nepotvrdil výstup. Jeho stav je neistý; ' +
                'znovu sa pripoj na načítanie aktuálneho stavu.'
            );
          }
        }, 5000);

        socket.send(
          JSON.stringify({
            type: 'setOutput',
            outputEnabled: nextValue,
          })
        );
      } catch (sendError) {
        stopConnection(errorMessage(sendError));
      }

      return;
    }

    try {
      const result = await requestJson<OutputState>('/output', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputEnabled: nextValue,
        }),
      });

      if (session.current === currentSession) {
        setOutputEnabled(result.outputEnabled);
        setOutputBusy(false);
      }
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>IoT Monitor</Text>
      <Text style={styles.subtitle}>
        Riadenie a telemetria vo Wi-Fi sieti
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>SIMULOVANÝ UZOL</Text>
        <Text style={styles.noticeText}>
          Komunikácia používa vybraný protokol. Hodnoty generuje
          simulátor na počítači, nie ESP32.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Komunikačný protokol</Text>

        <View style={styles.protocols}>
          {(['HTTP/REST', 'WebSocket'] as Protocol[]).map(
            (item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{
                  selected: protocol === item,
                  disabled: status !== 'disconnected',
                }}
                disabled={status !== 'disconnected'}
                onPress={() => {
                  setProtocol(item);
                  setError(null);
                }}
                style={[
                  styles.protocol,
                  protocol === item && styles.selectedProtocol,
                ]}
              >
                <Text
                  style={[
                    styles.protocolText,
                    protocol === item && styles.selectedText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )
          )}

          <View style={[styles.protocol, styles.disabled]}>
            <Text style={styles.protocolText}>MQTT — neskôr</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          {protocol === 'HTTP/REST' ? HTTP_URL : WS_URL}
        </Text>
        <Text style={styles.hint}>
          Pred zmenou protokolu sa odpoj.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Pripojenie</Text>

        <Text style={styles.value}>
          {connecting
            ? 'Pripájam…'
            : connected
              ? `${protocol} — aktívne`
              : 'Odpojené'}
        </Text>

        <Text style={styles.hint}>
          {protocol === 'HTTP/REST'
            ? 'Aplikácia pravidelne žiada telemetriu cez HTTP.'
            : 'Server posiela telemetriu cez WebSocket.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={outputBusy}
          onPress={
            status === 'disconnected'
              ? connect
              : () => stopConnection()
          }
          style={[
            styles.button,
            status !== 'disconnected' && styles.disconnectButton,
            outputBusy && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {connecting
              ? 'Zrušiť pripájanie'
              : connected
                ? 'Odpojiť'
                : 'Pripojiť k simulátoru'}
          </Text>
        </Pressable>
      </View>

      {error !== null && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Chyba komunikácie</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.heading}>Ovládanie uzla</Text>

        <View style={styles.row}>
          <View style={styles.outputLabel}>
            <Text style={styles.label}>Simulovaný výstup</Text>
            <Text style={styles.hint}>
              {!connected
                ? 'Stav nie je načítaný'
                : outputBusy
                  ? 'Čakám na potvrdenie…'
                  : outputEnabled
                    ? 'Zapnutý'
                    : 'Vypnutý'}
            </Text>
          </View>

          <Switch
            accessibilityLabel="Simulovaný výstup"
            value={connected && outputEnabled}
            disabled={!connected || outputBusy}
            onValueChange={changeOutput}
          />
        </View>

        <Text style={styles.hint}>
          Vypnutie výstupu nezastaví telemetriu. Odpojenie
          aplikácie nemení stav výstupu na serveri.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>
          Telemetria zo simulátora
        </Text>

        {telemetry ? (
          <>
            <Text style={styles.hint}>
              Uzol: {telemetry.deviceId}
            </Text>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.hint}>Teplota</Text>
                <Text style={styles.metricValue}>
                  {telemetry.temperature.toFixed(1)} °C
                </Text>
              </View>

              <View style={styles.metric}>
                <Text style={styles.hint}>Vlhkosť</Text>
                <Text style={styles.metricValue}>
                  {telemetry.humidity.toFixed(1)} %
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.hint}>Číslo vzorky na serveri</Text>
              <Text style={styles.detail}>
                {telemetry.sequence}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.hint}>Vygenerované na serveri</Text>
              <Text style={styles.detail}>
                {new Date(telemetry.generatedAt).toLocaleTimeString(
                  'sk-SK'
                )}
              </Text>
            </View>

            <Text style={styles.hint}>
              Toto zatiaľ nie je meranie latencie, RTT ani
              spoľahlivosti protokolu.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>
            Pripoj sa k simulátoru na načítanie dát.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  notice: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    gap: 4,
  },
  noticeTitle: {
    color: '#92400e',
    fontWeight: '700',
  },
  noticeText: {
    color: '#92400e',
    lineHeight: 21,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  protocols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  protocol: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  selectedProtocol: {
    backgroundColor: '#2563eb',
  },
  protocolText: {
    color: '#334155',
    fontWeight: '600',
  },
  selectedText: {
    color: '#ffffff',
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  hint: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
  },
  button: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#b91c1c',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  outputLabel: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#0f172a',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    gap: 6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  detail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  errorBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    gap: 4,
  },
  errorTitle: {
    color: '#991b1b',
    fontWeight: '700',
  },
  errorText: {
    color: '#991b1b',
    lineHeight: 21,
  },
});