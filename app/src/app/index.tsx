import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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
  MonitorInsights,
  useMonitorInsights,
} from '@/components/MonitorInsights';

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Server neodpovedal do 5 sekúnd.';
  }

  return error instanceof Error
    ? error.message
    : 'Neznáma chyba komunikácie.';
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const wideLayout = width >= 1000;
  const compactLayout = width < 600;

  const [protocol, setProtocol] = useState<Protocol>('HTTP/REST');
  const [status, setStatus] = useState<Status>('disconnected');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [outputBusy, setOutputBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useRef(0);
  const requestCounter = useRef(0);
  const pendingRequestId = useRef<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connectTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const outputTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const connected = status === 'connected';
  const connecting = status === 'connecting';

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

  if (message !== null) {
    addEvent('error', message);
  } else {
    addEvent('info', 'Používateľ ukončil spojenie.');
  }
}

  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, []);

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
      addEvent('success', 'HTTP/REST pripojenie pripravené.');
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
          if (
            !isCurrentSession() ||
            message.requestId !== pendingRequestId.current
          ) {
            return;
          }

          if (outputTimer.current !== null) {
            clearTimeout(outputTimer.current);
            outputTimer.current = null;
          }

          pendingRequestId.current = null;
          setOutputEnabled(message.data.outputEnabled);
          setOutputBusy(false);

          console.log(
            `[WS ACK] Potvrdený príkaz ${message.requestId}`
          );

          addEvent(
            'success',
            `WebSocket: server potvrdil ${
              message.data.outputEnabled ? 'zapnutý' : 'vypnutý'
            } výstup. ID: ${message.requestId}`
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

          addEvent('success', 'WebSocket spojenie pripravené.');
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
      stopConnection(errorMessage(connectionError));
    }
  }

  function connect() {
  resetHistory();
  addEvent('info', `Pripájanie cez ${protocol}.`);

  if (protocol === 'HTTP/REST') {
    void connectHttp();
  } else {
    connectWebSocket();
  }
}

  async function changeOutput(nextValue: boolean) {
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
        stopConnection('WebSocket spojenie nie je otvorené.');
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

        socket.send(
          JSON.stringify({
            type: 'setOutput',
            requestId,
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

        addEvent(
          'success',
          `HTTP/REST: server potvrdil ${
            result.outputEnabled ? 'zapnutý' : 'vypnutý'
          } výstup.`
        );
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
      contentContainerStyle={[
        styles.content,
        compactLayout && styles.contentCompact,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={styles.brandLine} />
            <View style={[styles.brandLine, styles.brandLineShort]} />
            <View style={styles.brandLine} />
          </View>

          <View>
            <Text style={styles.eyebrow}>
              LAB / RIADENIE A TELEMETRIA
            </Text>
            <Text style={styles.title}>IoT Monitor</Text>
          </View>
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                connected && styles.statusDotConnected,
                connecting && styles.statusDotConnecting,
                error !== null && styles.statusDotError,
              ]}
            />

            <Text style={styles.statusBadgeText}>
              {connecting
                ? 'Pripájanie'
                : connected
                  ? 'Pripojené'
                  : error !== null
                    ? 'Chyba spojenia'
                    : 'Odpojené'}
            </Text>
          </View>

          <Text style={styles.headerProtocol}>{protocol}</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <View style={styles.noticeTag}>
          <Text style={styles.noticeTagText}>
            SIMULOVANÝ UZOL
          </Text>
        </View>

        <Text style={styles.noticeText}>
          Testovacie prostredie na počítači. Telemetriu generuje
          simulátor, nie fyzické ESP32.
        </Text>
      </View>

      <View
        style={[
          styles.workspace,
          wideLayout && styles.workspaceWide,
        ]}
      >
        <View
          style={[
            styles.sidebar,
            wideLayout && styles.sidebarWide,
          ]}
        >
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>01</Text>
              <Text style={styles.sectionTitle}>PRIPOJENIE</Text>
            </View>

            <Text style={styles.cardTitle}>
              Komunikačný kanál
            </Text>

            <Text style={styles.bodyText}>
              Vyber protokol a otvor spojenie so simulátorom.
            </Text>

            <View style={styles.protocolList}>
              {(['HTTP/REST', 'WebSocket'] as Protocol[]).map(
                (item, index) => {
                  const selected = protocol === item;

                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,
                        disabled: status !== 'disconnected',
                      }}
                      disabled={status !== 'disconnected'}
                      onPress={() => {
                        setProtocol(item);
                        setError(null);
                      }}
                      style={({ pressed }) => [
                        styles.protocol,
                        selected && styles.protocolSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.protocolIdentity}>
                        <Text
                          style={[
                            styles.protocolIndex,
                            selected &&
                              styles.protocolIndexSelected,
                          ]}
                        >
                          0{index + 1}
                        </Text>

                        <Text
                          style={[
                            styles.protocolText,
                            selected &&
                              styles.protocolTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radio,
                          selected && styles.radioSelected,
                        ]}
                      >
                        {selected && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </Pressable>
                  );
                }
              )}

              <View style={styles.protocolUnavailable}>
                <View style={styles.protocolIdentity}>
                  <Text style={styles.protocolIndex}>03</Text>
                  <Text style={styles.protocolUnavailableText}>
                    MQTT
                  </Text>
                </View>

                <Text style={styles.soonText}>
                  PRIPRAVUJE SA
                </Text>
              </View>
            </View>

            <View style={styles.endpointBox}>
              <Text style={styles.fieldLabel}>
                ADRESA SERVERA
              </Text>

              <Text selectable style={styles.endpointText}>
                {protocol === 'HTTP/REST' ? HTTP_URL : WS_URL}
              </Text>
            </View>

            <Text style={styles.smallText}>
              {protocol === 'HTTP/REST'
                ? 'Telemetria sa načítava opakovanými HTTP požiadavkami.'
                : 'Telemetria prichádza cez otvorené WebSocket spojenie.'}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: outputBusy }}
              disabled={outputBusy}
              onPress={
                status === 'disconnected'
                  ? connect
                  : () => stopConnection()
              }
              style={({ pressed }) => [
                styles.button,
                status !== 'disconnected' &&
                  styles.disconnectButton,
                outputBusy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  status !== 'disconnected' &&
                    styles.disconnectButtonText,
                ]}
              >
                {connecting
                  ? 'Zrušiť pripájanie'
                  : connected
                    ? 'Odpojiť'
                    : 'Pripojiť k simulátoru'}
              </Text>
            </Pressable>

            <Text style={styles.connectionFootnote}>
              Pred zmenou protokolu sa odpoj.
            </Text>
          </View>

          <View style={styles.sideNote}>
            <Text style={styles.fieldLabel}>
              O TESTOVACOM PROSTREDÍ
            </Text>

            <Text style={styles.smallText}>
              HTTP aj WebSocket ovládajú ten istý simulovaný
              uzol. Zmena protokolu nevypína výstup na serveri.
            </Text>
          </View>
        </View>

        <View style={styles.main}>
          {error !== null && (
            <View
              accessibilityRole="alert"
              style={styles.errorBox}
            >
              <Text style={styles.errorTitle}>
                Chyba komunikácie
              </Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>02</Text>
                <Text style={styles.sectionTitle}>
                  TELEMETRIA
                </Text>
              </View>

              <View style={styles.sourceTag}>
                <Text style={styles.sourceTagText}>
                  SIMULÁTOR
                </Text>
              </View>
            </View>

            <View style={styles.telemetryIntro}>
              <View style={styles.flexible}>
                <Text style={styles.cardTitle}>
                  Prehľad prostredia
                </Text>

                <Text style={styles.bodyText}>
                  {telemetry
                    ? `Uzol / ${telemetry.deviceId}`
                    : 'Údaje sa zobrazia po pripojení.'}
                </Text>
              </View>

              <Text style={styles.liveLabel}>
                {telemetry
                  ? connected
                    ? 'PRÍJEM DÁT AKTÍVNY'
                    : 'NAČÍTAVANIE STAVU'
                  : 'BEZ DÁT'}
              </Text>
            </View>

            <View style={styles.metrics}>
              <View
                style={[
                  styles.metric,
                  styles.temperatureMetric,
                ]}
              >
                <View style={styles.metricHeading}>
                  <Text style={styles.metricLabel}>
                    TEPLOTA
                  </Text>
                  <Text style={styles.metricCode}>T / 01</Text>
                </View>

                <View style={styles.metricReading}>
                  <Text
                    style={[
                      styles.metricValue,
                      styles.temperatureValue,
                      compactLayout &&
                        styles.metricValueCompact,
                    ]}
                  >
                    {telemetry
                      ? telemetry.temperature
                          .toFixed(1)
                          .replace('.', ',')
                      : '—'}
                  </Text>

                  <Text style={styles.metricUnit}>°C</Text>
                </View>

                <Text style={styles.metricCaption}>
                  {telemetry
                    ? 'Posledná prijatá hodnota'
                    : 'Čaká sa na prvú vzorku'}
                </Text>
              </View>

              <View
                style={[
                  styles.metric,
                  styles.humidityMetric,
                ]}
              >
                <View style={styles.metricHeading}>
                  <Text style={styles.metricLabel}>
                    VLHKOSŤ
                  </Text>
                  <Text style={styles.metricCode}>H / 02</Text>
                </View>

                <View style={styles.metricReading}>
                  <Text
                    style={[
                      styles.metricValue,
                      styles.humidityValue,
                      compactLayout &&
                        styles.metricValueCompact,
                    ]}
                  >
                    {telemetry
                      ? telemetry.humidity
                          .toFixed(1)
                          .replace('.', ',')
                      : '—'}
                  </Text>

                  <Text style={styles.metricUnit}>%</Text>
                </View>

                <Text style={styles.metricCaption}>
                  {telemetry
                    ? 'Posledná prijatá hodnota'
                    : 'Čaká sa na prvú vzorku'}
                </Text>
              </View>
            </View>

            <View style={styles.sampleDetails}>
              <View style={styles.sampleDetail}>
                <Text style={styles.fieldLabel}>
                  ČÍSLO VZORKY
                </Text>
                <Text style={styles.detailValue}>
                  {telemetry ? `#${telemetry.sequence}` : '—'}
                </Text>
              </View>

              <View style={styles.sampleDetail}>
                <Text style={styles.fieldLabel}>
                  VYGENEROVANÉ NA SERVERI
                </Text>
                <Text style={styles.detailValue}>
                  {telemetry
                    ? new Date(
                        telemetry.generatedAt
                      ).toLocaleTimeString('sk-SK')
                    : '—'}
                </Text>
              </View>

              <View style={styles.sampleDetail}>
                <Text style={styles.fieldLabel}>PROTOKOL</Text>
                <Text style={styles.detailValue}>
                  {protocol}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>03</Text>
              <Text style={styles.sectionTitle}>VÝSTUP</Text>
            </View>

            <View style={styles.outputRow}>
              <View style={styles.flexible}>
                <Text style={styles.cardTitle}>
                  Ovládanie uzla
                </Text>
                <Text style={styles.bodyText}>
                  Digitálny výstup simulovaného zariadenia.
                </Text>
              </View>

              <View style={styles.switchBox}>
                <Switch
                  accessibilityLabel="Simulovaný výstup"
                  accessibilityHint={
                    'Zapne alebo vypne výstup na simulátore.'
                  }
                  value={connected && outputEnabled}
                  disabled={!connected || outputBusy}
                  onValueChange={changeOutput}
                  trackColor={{
                    false: '#D8D5CA',
                    true: '#46543A',
                  }}
                  thumbColor="#FCFAF5"
                  ios_backgroundColor="#D8D5CA"
                />
              </View>
            </View>

            <View style={styles.outputStatePanel}>
              <View
                style={[
                  styles.outputIndicator,
                  connected &&
                    outputEnabled &&
                    styles.outputIndicatorOn,
                  outputBusy &&
                    styles.outputIndicatorPending,
                ]}
              />

              <View style={styles.flexible}>
                <Text style={styles.outputStateTitle}>
                  {!connected
                    ? 'Stav nie je načítaný'
                    : outputBusy
                      ? 'Čaká sa na potvrdenie'
                      : outputEnabled
                        ? 'Výstup je zapnutý'
                        : 'Výstup je vypnutý'}
                </Text>

                <Text style={styles.smallText}>
                  {!connected
                    ? 'Pripoj sa a načítaj aktuálny stav zo servera.'
                    : outputBusy
                      ? 'Ovládanie bude dostupné po potvrdení príkazu.'
                      : 'Zobrazený stav bol prijatý zo servera.'}
                </Text>
              </View>
            </View>

            <Text style={styles.smallText}>
              Vypnutie výstupu nezastaví telemetriu.
              Odpojenie aplikácie nemení stav výstupu na serveri.
            </Text>
          </View>

          <View style={styles.measurementNote}>
            <Text style={styles.fieldLabel}>
              ROZSAH AKTUÁLNEHO NÁHĽADU
            </Text>
            <Text style={styles.smallText}>
              Panel zobrazuje telemetriu a stav výstupu.
              Meranie latencie, RTT a spoľahlivosti zatiaľ
              nie je súčasťou tohto prehľadu.
            </Text>
          </View>
        </View>
      </View>
      <MonitorInsights
        samples={samples}
        events={events}
        connected={connected}
        wideLayout={wideLayout}
        onClearEvents={clearEvents}
      />
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          IoT Monitor / Laboratórny panel
        </Text>
        <Text style={styles.footerText}>
          HTTP · WebSocket · MQTT vo vývoji
        </Text>
      </View>
    </ScrollView>
  );
}

const colors = {
  background: '#F2EFE7',
  surface: '#FCFAF5',
  text: '#252923',
  muted: '#666B60',
  line: '#D8D5CA',
  olive: '#46543A',
  oliveSoft: '#E8EBE0',
  orange: '#B94F2D',
  orangeSoft: '#F5E8DD',
  error: '#993D32',
  errorSoft: '#F7E8E3',
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingTop: 36,
    paddingBottom: 28,
    gap: 24,
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  brandMark: {
    width: 44,
    height: 48,
    flexShrink: 0,
    backgroundColor: colors.olive,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    gap: 5,
  },
  brandLine: {
    width: 24,
    height: 3,
    backgroundColor: colors.surface,
  },
  brandLineShort: {
    width: 15,
    backgroundColor: '#D9B58E',
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.muted,
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  statusDotConnected: {
    backgroundColor: colors.olive,
  },
  statusDotConnecting: {
    backgroundColor: colors.orange,
  },
  statusDotError: {
    backgroundColor: colors.error,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  headerProtocol: {
    fontFamily: monoFont,
    fontSize: 11,
    color: colors.muted,
  },
  notice: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#EBE6D9',
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  noticeTag: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#CEB9A4',
    borderRadius: 3,
  },
  noticeTagText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#7D4229',
  },
  noticeText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 260,
    fontSize: 12,
    lineHeight: 19,
    color: '#625A4C',
  },
  workspace: {
    gap: 24,
    alignItems: 'stretch',
  },
  workspaceWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sidebar: {
    width: '100%',
    gap: 18,
  },
  sidebarWide: {
    width: 310,
    flexShrink: 0,
  },
  main: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 24,
  },
  card: {
    padding: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionNumber: {
    fontFamily: monoFont,
    fontSize: 11,
    color: colors.orange,
  },
  sectionTitle: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.muted,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: colors.text,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.muted,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.muted,
  },
  flexible: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 5,
  },
  protocolList: {
    gap: 8,
  },
  protocol: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  protocolSelected: {
    borderColor: colors.olive,
    backgroundColor: colors.oliveSoft,
  },
  protocolIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  protocolIndex: {
    fontFamily: monoFont,
    fontSize: 10,
    color: colors.muted,
  },
  protocolIndexSelected: {
    color: colors.olive,
  },
  protocolText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  protocolTextSelected: {
    color: colors.olive,
  },
  radio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5A99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.olive,
  },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.olive,
  },
  protocolUnavailable: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  protocolUnavailableText: {
    fontSize: 13,
    color: colors.muted,
  },
  soonText: {
    fontFamily: monoFont,
    fontSize: 8,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  endpointBox: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
    gap: 7,
  },
  fieldLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 15,
    color: colors.muted,
  },
  endpointText: {
    fontFamily: monoFont,
    fontSize: 12,
    lineHeight: 20,
    color: colors.text,
    flexShrink: 1,
  },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.olive,
    backgroundColor: colors.olive,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.surface,
  },
  disconnectButton: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  disconnectButtonText: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
  connectionFootnote: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: colors.muted,
  },
  sideNote: {
    paddingHorizontal: 6,
    gap: 8,
  },
  sourceTag: {
    backgroundColor: colors.background,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sourceTagText: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  telemetryIntro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  liveLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.olive,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metric: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 230,
    minWidth: 0,
    padding: 20,
    borderRadius: 4,
    gap: 20,
  },
  temperatureMetric: {
    backgroundColor: colors.orangeSoft,
    borderTopWidth: 2,
    borderTopColor: colors.orange,
  },
  humidityMetric: {
    backgroundColor: colors.oliveSoft,
    borderTopWidth: 2,
    borderTopColor: colors.olive,
  },
  metricHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.text,
  },
  metricCode: {
    fontFamily: monoFont,
    fontSize: 9,
    color: colors.muted,
  },
  metricReading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
  },
  metricValue: {
    fontSize: 54,
    fontWeight: '600',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  metricValueCompact: {
    fontSize: 46,
  },
  temperatureValue: {
    color: colors.orange,
  },
  humidityValue: {
    color: colors.olive,
  },
  metricUnit: {
    fontFamily: monoFont,
    fontSize: 19,
    color: colors.muted,
  },
  metricCaption: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
  },
  sampleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 18,
  },
  sampleDetail: {
    flexGrow: 1,
    flexBasis: 145,
    gap: 6,
  },
  detailValue: {
    fontFamily: monoFont,
    fontSize: 13,
    color: colors.text,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  switchBox: {
    minWidth: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputStatePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  outputIndicator: {
    width: 12,
    height: 12,
    flexShrink: 0,
    borderRadius: 3,
    backgroundColor: '#8B8F83',
  },
  outputIndicatorOn: {
    backgroundColor: colors.olive,
  },
  outputIndicatorPending: {
    backgroundColor: colors.orange,
  },
  outputStateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  measurementNote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
    paddingLeft: 14,
    gap: 6,
  },
  errorBox: {
    padding: 18,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.errorSoft,
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerText: {
    fontFamily: monoFont,
    fontSize: 10,
    lineHeight: 17,
    color: colors.muted,
  },
});