import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const API_URL = 'http://127.0.0.1:3000';

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

async function requestJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Server vrátil HTTP ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Server neodpovedal do 5 sekúnd.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Nastala neznáma chyba komunikácie.';
}

export default function HomeScreen() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [outputBusy, setOutputBusy] = useState(false);
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rozlišuje aktuálne pripojenie od už ukončených požiadaviek.
  const session = useRef(0);

  useEffect(() => {
    return () => {
      session.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const currentSession = session.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function pollTelemetry() {
      try {
        const data = await requestJson<Telemetry>('/telemetry');

        if (cancelled || session.current !== currentSession) {
          return;
        }

        setTelemetry(data);
      } catch (requestError) {
        if (cancelled || session.current !== currentSession) {
          return;
        }

        session.current += 1;
        setConnected(false);
        setTelemetry(null);
        setError(errorMessage(requestError));
        return;
      }

      if (!cancelled && session.current === currentSession) {
        timer = setTimeout(pollTelemetry, 1000);
      }
    }

    timer = setTimeout(pollTelemetry, 1000);

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [connected]);

  async function connect() {
    const currentSession = ++session.current;

    setConnecting(true);
    setError(null);

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
      setConnected(true);
    } catch (requestError) {
      if (session.current === currentSession) {
        setError(errorMessage(requestError));
      }
    } finally {
      if (session.current === currentSession) {
        setConnecting(false);
      }
    }
  }

  function disconnect() {
    session.current += 1;
    setConnected(false);
    setTelemetry(null);
    setError(null);
    setOutputBusy(false);
  }

  async function changeOutput(nextValue: boolean) {
    const currentSession = session.current;

    setOutputBusy(true);
    setError(null);

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
      }
    } catch (requestError) {
      if (session.current === currentSession) {
        setError(
          `Zmenu výstupu sa nepodarilo potvrdiť. ${errorMessage(
            requestError
          )} Odpoj sa a znovu pripoj na načítanie aktuálneho stavu.`
        );
      }
    } finally {
      if (session.current === currentSession) {
        setOutputBusy(false);
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
          HTTP komunikácia je skutočná. Hodnoty však generuje
          simulátor na počítači, nie ESP32.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Komunikačný protokol</Text>

        <View style={styles.protocols}>
          <View style={styles.selectedProtocol}>
            <Text style={styles.selectedProtocolText}>
              HTTP/REST
            </Text>
          </View>

          <View style={styles.pendingProtocol}>
            <Text style={styles.pendingProtocolText}>
              WebSocket — neskôr
            </Text>
          </View>

          <View style={styles.pendingProtocol}>
            <Text style={styles.pendingProtocolText}>
              MQTT — neskôr
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>Server: {API_URL}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Pripojenie</Text>

        <Text style={styles.value}>
          {connecting
            ? 'Pripájam…'
            : connected
              ? 'HTTP komunikácia aktívna'
              : 'Odpojené'}
        </Text>

        <Text style={styles.hint}>
          {connected
            ? 'Aplikácia pravidelne načítava telemetriu zo simulátora.'
            : 'Pripojenie overí telemetriu a načíta stav výstupu.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={connecting || outputBusy}
          onPress={connected ? disconnect : connect}
          style={[
            styles.button,
            connected && styles.disconnectButton,
            (connecting || outputBusy) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {connecting
              ? 'Pripájam…'
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
            <Text style={styles.label}>Výstup simulátora</Text>
            <Text style={styles.hint}>
              {!connected
                ? 'Aktuálny stav nie je načítaný'
                : outputBusy
                  ? 'Čakám na potvrdenie…'
                  : outputEnabled
                    ? 'Zapnutý'
                    : 'Vypnutý'}
            </Text>
          </View>

          <Switch
            accessibilityLabel="Výstup simulátora"
            value={connected && outputEnabled}
            onValueChange={changeOutput}
            disabled={!connected || outputBusy}
          />
        </View>

        <Text style={styles.hint}>
          Stav sa zmení až po odpovedi servera. Odpojenie aplikácie
          nemení výstup na serveri.
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
              Ďalšie načítanie sa plánuje 1 sekundu po dokončení
              predchádzajúceho. Zatiaľ nemeriame latenciu ani RTT.
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
  selectedProtocol: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  selectedProtocolText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pendingProtocol: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  pendingProtocolText: {
    color: '#64748b',
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