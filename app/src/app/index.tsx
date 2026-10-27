import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

type Protocol = 'HTTP/REST' | 'WebSocket' | 'MQTT';

type Telemetry = {
  sequence: number;
  temperature: number;
  humidity: number;
  generatedAt: number;
};

const protocols: Protocol[] = ['HTTP/REST', 'WebSocket', 'MQTT'];

function generateTelemetry(sequence: number): Telemetry {
  return {
    sequence,
    temperature: 22 + Math.random() * 4,
    humidity: 40 + Math.random() * 15,
    generatedAt: Date.now(),
  };
}

export default function HomeScreen() {
  const [protocol, setProtocol] = useState<Protocol>('HTTP/REST');
  const [connected, setConnected] = useState(false);
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let sequence = 1;

    setTelemetry(generateTelemetry(sequence));

    const timer = setInterval(() => {
      sequence += 1;
      setTelemetry(generateTelemetry(sequence));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [connected]);

  function toggleConnection() {
    setOutputEnabled(false);
    setTelemetry(null);
    setConnected((previous) => !previous);
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
        <Text style={styles.noticeTitle}>DEMO REŽIM</Text>
        <Text style={styles.noticeText}>
          Dáta sa generujú priamo v aplikácii. Nejde o merania
          z ESP32 ani o skutočnú sieťovú komunikáciu.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Komunikačný protokol</Text>

        <View style={styles.protocols}>
          {protocols.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{
                selected: protocol === item,
                disabled: connected,
              }}
              disabled={connected}
              onPress={() => setProtocol(item)}
              style={[
                styles.protocol,
                protocol === item && styles.selectedProtocol,
              ]}
            >
              <Text
                style={[
                  styles.protocolText,
                  protocol === item && styles.selectedProtocolText,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Pred zmenou protokolu ukonči demo pripojenie.
          V demo režime je správanie pre všetky protokoly rovnaké.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Pripojenie</Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              connected && styles.connectedDot,
            ]}
          />
          <Text style={styles.value}>
            {connected ? 'Demo pripojené' : 'Odpojené'}
          </Text>
        </View>

        <Text style={styles.hint}>
          Vybraný protokol: {protocol}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={toggleConnection}
          style={[
            styles.button,
            connected && styles.disconnectButton,
          ]}
        >
          <Text style={styles.buttonText}>
            {connected ? 'Odpojiť demo' : 'Pripojiť demo'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Ovládanie uzla</Text>

        <View style={styles.row}>
          <View style={styles.outputLabel}>
            <Text style={styles.label}>Simulovaný výstup</Text>
            <Text style={styles.hint}>
              {outputEnabled ? 'Zapnutý' : 'Vypnutý'}
            </Text>
          </View>

          <Switch
            accessibilityLabel="Simulovaný výstup"
            value={outputEnabled}
            onValueChange={setOutputEnabled}
            disabled={!connected}
          />
        </View>

        <Text style={styles.hint}>
          Prepínač zatiaľ mení iba stav v aplikácii.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>
          Telemetria — simulované dáta
        </Text>

        {telemetry ? (
          <>
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

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.hint}>Číslo vzorky</Text>
              <Text style={styles.detail}>
                {telemetry.sequence}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.hint}>Vygenerované o</Text>
              <Text style={styles.detail}>
                {new Date(telemetry.generatedAt).toLocaleTimeString(
                  'sk-SK'
                )}
              </Text>
            </View>

            <Text style={styles.hint}>
              Nominálny interval generovania: 1 sekunda.
              Toto nie je meranie latencie ani RTT.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.value}>Zatiaľ bez dát</Text>
            <Text style={styles.hint}>
              Stlač „Pripojiť demo“. Aplikácia začne pravidelne
              generovať ukážkové hodnoty teploty a vlhkosti.
            </Text>
          </>
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
  selectedProtocolText: {
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94a3b8',
  },
  connectedDot: {
    backgroundColor: '#16a34a',
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
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  detail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
});