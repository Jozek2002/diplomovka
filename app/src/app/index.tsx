import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

import type {
  EventFilter,
  SampleWindow,
} from '@/components/MonitorInsights';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';

import type { MonitorColors } from '@/theme/monitor-theme';

type Tab = 'overview' | 'analysis' | 'events' | 'settings';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Prehľad' },
  { id: 'analysis', label: 'Analýza' },
  { id: 'events', label: 'Udalosti' },
  { id: 'settings', label: 'Nastavenia' },
];

const themeOptions = [
  { value: 'light', label: 'Svetlý' },
  { value: 'dark', label: 'Tmavý' },
  { value: 'system', label: 'Systém' },
] as const;

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

function numberText(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

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
  const { width } = useWindowDimensions();
  const wideLayout = width >= 1000;

  const {
    colors,
    preference,
    setPreference,
    isDark,
  } = useMonitorTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [tab, setTab] = useState<Tab>('overview');

  const [sampleWindow, setSampleWindow] =
    useState<SampleWindow>(60);

  const [eventFilter, setEventFilter] =
    useState<EventFilter>('all');

  const [protocol, setProtocol] =
    useState<Protocol>('HTTP/REST');

  const [status, setStatus] =
    useState<Status>('disconnected');

  const [telemetry, setTelemetry] =
    useState<Telemetry | null>(null);

  const [outputEnabled, setOutputEnabled] = useState(false);
  const [outputBusy, setOutputBusy] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const session = useRef(0);
  const requestCounter = useRef(0);

  const pendingRequestId =
    useRef<string | null>(null);

  const socketRef =
    useRef<WebSocket | null>(null);

  const scrollRef =
    useRef<ScrollView | null>(null);

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

    addEvent(
      message === null ? 'info' : 'error',
      message ?? 'Používateľ ukončil spojenie.'
    );
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

      addEvent(
        'success',
        'HTTP/REST pripojenie pripravené.'
      );
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
              message.data.outputEnabled
                ? 'zapnutý'
                : 'vypnutý'
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
        stopConnection(errorMessage(connectionError));
      }
    }
  }

  function connect() {
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
      const result =
        await requestJson<OutputState>('/output', {
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

  function selectTab(value: Tab) {
    setTab(value);

    scrollRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }

  const statusLabel = connecting
    ? 'Pripájanie'
    : connected
      ? 'Pripojené'
      : error
        ? 'Chyba spojenia'
        : 'Odpojené';

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        width < 600 && styles.compact,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={styles.brandLine} />

            <View
              style={[
                styles.brandLine,
                { width: 15 },
              ]}
            />

            <View style={styles.brandLine} />
          </View>

          <View style={{ flexShrink: 1 }}>
            <Text style={styles.eyebrow}>
              LAB / RIADENIE A TELEMETRIA
            </Text>

            <Text style={styles.title}>
              IoT Monitor
            </Text>
          </View>
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: error
                    ? colors.error
                    : connected
                      ? colors.olive
                      : connecting
                        ? colors.orange
                        : colors.muted,
                },
              ]}
            />

            <Text style={styles.badgeText}>
              {statusLabel}
            </Text>
          </View>

          <Text style={styles.mono}>{protocol}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View
          accessibilityRole="tablist"
          style={styles.choices}
        >
          {tabs.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{
                selected: tab === item.id,
              }}
              onPress={() => selectTab(item.id)}
              style={({ pressed }) => [
                styles.tab,
                tab === item.id && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === item.id && {
                    color: colors.onAccent,
                    fontFamily: fonts.bold,
                  },
                ]}
            >
              {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.themeControl}>
          <Text style={styles.label}>VZHĽAD</Text>

          <View style={styles.choices}>
            {themeOptions.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: preference === item.value,
                }}
                onPress={() =>
                  setPreference(item.value)
                }
                style={[
                  styles.smallChoice,
                  preference === item.value &&
                    styles.choiceSelected,
                ]}
              >
                <Text
                  style={[
                    styles.smallChoiceText,
                    preference === item.value &&
                      styles.selectedText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTag}>
          SIMULOVANÝ UZOL
        </Text>

        <Text style={styles.noticeText}>
          Testovacie prostredie na počítači.
          Telemetriu generuje simulátor, nie fyzické ESP32.
        </Text>
      </View>

      {error !== null && (
        <View
          accessibilityRole="alert"
          style={styles.errorBox}
        >
          <Text style={styles.errorTitle}>
            Chyba komunikácie
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {tab === 'overview' && (
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
                <Text style={styles.label}>PRIPOJENIE</Text>
              </View>

              <Text style={styles.cardTitle}>
                Komunikačný kanál
              </Text>

              <Text style={styles.body}>
                Vyber protokol a otvor spojenie so simulátorom.
              </Text>

              <View style={styles.protocolList}>
                {(
                  ['HTTP/REST', 'WebSocket'] as Protocol[]
                ).map((item, index) => (
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
                    style={({ pressed }) => [
                      styles.protocol,
                      protocol === item &&
                        styles.choiceSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.protocolIdentity}>
                      <Text style={styles.mono}>
                        0{index + 1}
                      </Text>

                      <Text
                        style={[
                          styles.protocolText,
                          protocol === item &&
                            styles.selectedText,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        protocol === item && {
                          borderColor: colors.olive,
                        },
                      ]}
                    >
                      {protocol === item && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </Pressable>
                ))}

                <View
                  style={[
                    styles.protocol,
                    { borderStyle: 'dashed' },
                  ]}
                >
                  <View style={styles.protocolIdentity}>
                    <Text style={styles.mono}>03</Text>
                    <Text style={styles.body}>MQTT</Text>
                  </View>

                  <Text style={styles.micro}>
                    PRIPRAVUJE SA
                  </Text>
                </View>
              </View>

              <View style={styles.inset}>
                <Text style={styles.label}>
                  ADRESA SERVERA
                </Text>

                <Text selectable style={styles.endpoint}>
                  {protocol === 'HTTP/REST'
                    ? HTTP_URL
                    : WS_URL}
                </Text>
              </View>

              <Text style={styles.small}>
                {protocol === 'HTTP/REST'
                  ? 'Telemetria sa načítava opakovanými HTTP požiadavkami.'
                  : 'Telemetria prichádza cez otvorené WebSocket spojenie.'}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: outputBusy,
                }}
                disabled={outputBusy}
                onPress={
                  status === 'disconnected'
                    ? connect
                    : () => stopConnection()
                }
                style={({ pressed }) => [
                  styles.button,
                  status !== 'disconnected' &&
                    styles.outlineButton,
                  outputBusy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    status !== 'disconnected' && {
                      color: colors.text,
                    },
                  ]}
                >
                  {connecting
                    ? 'Zrušiť pripájanie'
                    : connected
                      ? 'Odpojiť'
                      : 'Pripojiť k simulátoru'}
                </Text>
              </Pressable>

              <Text style={styles.small}>
                Pred zmenou protokolu sa odpoj.
              </Text>
            </View>

            <Text style={styles.small}>
              HTTP aj WebSocket ovládajú ten istý
              simulovaný uzol. Zmena protokolu nevypína
              výstup na serveri.
            </Text>
          </View>

          <View style={styles.main}>
            <View style={styles.card}>
              <View style={styles.headingRow}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionNumber}>02</Text>
                  <Text style={styles.label}>TELEMETRIA</Text>
                </View>

                <Text style={styles.micro}>
                  {telemetry
                    ? 'POSLEDNÁ PRIJATÁ VZORKA'
                    : 'BEZ DÁT'}
                </Text>
              </View>

              <Text style={styles.cardTitle}>
                Prehľad prostredia
              </Text>

              <Text style={styles.body}>
                {telemetry
                  ? `Uzol / ${telemetry.deviceId}`
                  : 'Údaje sa zobrazia po pripojení.'}
              </Text>

              <View style={styles.metrics}>
                <View
                  style={[
                    styles.metric,
                    {
                      backgroundColor: colors.orangeSoft,
                      borderTopColor: colors.orange,
                    },
                  ]}
                >
                  <View style={styles.headingRow}>
                    <Text style={styles.label}>TEPLOTA</Text>
                    <Text style={styles.micro}>T / 01</Text>
                  </View>

                  <View style={styles.reading}>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color: colors.orange,
                          fontSize: width < 600 ? 46 : 54,
                        },
                      ]}
                    >
                      {telemetry
                        ? numberText(telemetry.temperature)
                        : '—'}
                    </Text>

                    <Text style={styles.unit}>°C</Text>
                  </View>

                  <Text style={styles.small}>
                    {telemetry
                      ? 'Posledná prijatá hodnota'
                      : 'Čaká sa na prvú vzorku'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metric,
                    {
                      backgroundColor: colors.oliveSoft,
                      borderTopColor: colors.olive,
                    },
                  ]}
                >
                  <View style={styles.headingRow}>
                    <Text style={styles.label}>VLHKOSŤ</Text>
                    <Text style={styles.micro}>H / 02</Text>
                  </View>

                  <View style={styles.reading}>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color: colors.olive,
                          fontSize: width < 600 ? 46 : 54,
                        },
                      ]}
                    >
                      {telemetry
                        ? numberText(telemetry.humidity)
                        : '—'}
                    </Text>

                    <Text style={styles.unit}>%</Text>
                  </View>

                  <Text style={styles.small}>
                    {telemetry
                      ? 'Posledná prijatá hodnota'
                      : 'Čaká sa na prvú vzorku'}
                  </Text>
                </View>
              </View>

              <View style={styles.details}>
                <View style={styles.detail}>
                  <Text style={styles.label}>
                    ČÍSLO VZORKY
                  </Text>
                  <Text style={styles.detailValue}>
                    {telemetry
                      ? `#${telemetry.sequence}`
                      : '—'}
                  </Text>
                </View>

                <View style={styles.detail}>
                  <Text style={styles.label}>
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

                <View style={styles.detail}>
                  <Text style={styles.label}>
                    V HISTÓRII
                  </Text>
                  <Text style={styles.detailValue}>
                    {samples.length} / 60
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>03</Text>
                <Text style={styles.label}>VÝSTUP</Text>
              </View>

              <View style={styles.outputRow}>
                <View style={styles.flexible}>
                  <Text style={styles.cardTitle}>
                    Ovládanie uzla
                  </Text>
                  <Text style={styles.body}>
                    Digitálny výstup simulovaného zariadenia.
                  </Text>
                </View>

                <Switch
                  accessibilityLabel="Simulovaný výstup"
                  value={connected && outputEnabled}
                  disabled={!connected || outputBusy}
                  onValueChange={changeOutput}
                  trackColor={{
                    false: colors.line,
                    true: colors.olive,
                  }}
                  thumbColor={colors.onAccent}
                  ios_backgroundColor={colors.line}
                />
              </View>

              <View style={styles.outputState}>
                <View
                  style={[
                    styles.outputIndicator,
                    {
                      backgroundColor: outputBusy
                        ? colors.orange
                        : connected && outputEnabled
                          ? colors.olive
                          : colors.muted,
                    },
                  ]}
                />

                <View style={styles.flexible}>
                  <Text style={styles.outputTitle}>
                    {!connected
                      ? 'Stav nie je načítaný'
                      : outputBusy
                        ? 'Čaká sa na potvrdenie'
                        : outputEnabled
                          ? 'Výstup je zapnutý'
                          : 'Výstup je vypnutý'}
                  </Text>

                  <Text style={styles.small}>
                    {!connected
                      ? 'Pripoj sa na načítanie stavu zo servera.'
                      : outputBusy
                        ? 'Ovládanie bude dostupné po potvrdení.'
                        : 'Zobrazený stav bol prijatý zo servera.'}
                  </Text>
                </View>
              </View>

              <Text style={styles.small}>
                Vypnutie výstupu nezastaví telemetriu.
                Odpojenie aplikácie nemení stav výstupu
                na serveri.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.headingRow}>
                <Text style={styles.label}>
                  POSLEDNÁ UDALOSŤ
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => selectTab('events')}
                >
                  <Text style={styles.link}>
                    Otvoriť denník →
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.body}>
                {events[0]
                  ? `${new Date(
                      events[0].time
                    ).toLocaleTimeString('sk-SK')} / ${
                      events[0].message
                    }`
                  : 'Zatiaľ bez udalostí.'}
              </Text>
            </View>

            <Text style={styles.small}>
              Meranie latencie, RTT a spoľahlivosti zatiaľ
              nie je súčasťou tohto prehľadu.
            </Text>
          </View>
        </View>
      )}

      {(tab === 'analysis' || tab === 'events') && (
        <MonitorInsights
          view={tab}
          samples={samples}
          events={events}
          connected={connected}
          sampleWindow={sampleWindow}
          onSampleWindowChange={setSampleWindow}
          eventFilter={eventFilter}
          onEventFilterChange={setEventFilter}
          onClearEvents={clearEvents}
        />
      )}

      {tab === 'settings' && (
        <View style={styles.settingsGrid}>
          <View style={[styles.card, styles.settingsCard]}>
            <Text style={styles.label}>
              VZHĽAD A PROSTREDIE
            </Text>

            <Text style={styles.cardTitle}>
              Téma aplikácie
            </Text>

            <Text style={styles.body}>
              Aktívny vzhľad: {isDark ? 'tmavý' : 'svetlý'}.
              Voľba Systém sleduje nastavenie zariadenia.
            </Text>

            <View style={styles.choices}>
              {themeOptions.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: preference === item.value,
                  }}
                  onPress={() =>
                    setPreference(item.value)
                  }
                  style={[
                    styles.tab,
                    preference === item.value &&
                      styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      preference === item.value &&
                        styles.selectedText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.small}>
              Voľba sa zatiaľ uchováva iba počas behu
              aplikácie. Po obnovení stránky sa použije Systém.
            </Text>
          </View>

          <View style={[styles.card, styles.settingsCard]}>
            <Text style={styles.label}>
              KOMUNIKÁCIA
            </Text>

            <Text style={styles.cardTitle}>
              Testovací uzol
            </Text>

            <Text style={styles.body}>
              Zdroj údajov: lokálny simulátor.
              MQTT ešte nie je implementované.
            </Text>

            <View style={styles.inset}>
              <Text style={styles.label}>HTTP / REST</Text>
              <Text selectable style={styles.endpoint}>
                {HTTP_URL}
              </Text>
            </View>

            <View style={styles.inset}>
              <Text style={styles.label}>WEBSOCKET</Text>
              <Text selectable style={styles.endpoint}>
                {WS_URL}
              </Text>
            </View>

            <Text style={styles.small}>
              Adresy sú iba na čítanie a pochádzajú
              z konfigurácie služieb.
            </Text>
          </View>

          <View style={[styles.card, styles.settingsCard]}>
            <Text style={styles.label}>
              LOKÁLNE ÚDAJE
            </Text>

            <Text style={styles.cardTitle}>
              História a denník
            </Text>

            <Text style={styles.body}>
              V pamäti: {samples.length} vzoriek
              a {events.length} udalostí.
              Vymazanie nemení stav výstupu ani spojenia.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: samples.length === 0,
              }}
              disabled={samples.length === 0}
              onPress={resetHistory}
              style={[
                styles.button,
                styles.outlineButton,
                samples.length === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.outlineText}>
                Vymazať históriu telemetrie
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: events.length === 0,
              }}
              disabled={events.length === 0}
              onPress={clearEvents}
              style={[
                styles.button,
                styles.outlineButton,
                events.length === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.outlineText}>
                Vymazať denník udalostí
              </Text>
            </Pressable>

            <Text style={styles.small}>
              Pri aktívnom spojení sa história začne
              znovu plniť ďalšou prijatou vzorkou.
              Obnovením stránky sa všetky tieto údaje vymažú.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.mono}>
          IoT Monitor / Riadenie a telemetria
        </Text>

        <Text style={styles.mono}>
          HTTP · WebSocket · MQTT vo vývoji
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: MonitorColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      width: '100%',
      maxWidth: 1400,
      alignSelf: 'center',
      paddingHorizontal: 36,
      paddingTop: 32,
      paddingBottom: 32,
      gap: 24,
    },
    compact: {
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
      paddingBottom: 8,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexShrink: 1,
    },
    brandMark: {
      width: 48,
      height: 48,
      flexShrink: 0,
      backgroundColor: '#FF6B35',
      borderRadius: 17,
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 5,
    },
    brandLine: {
      width: 24,
      height: 3,
      borderRadius: 2,
      backgroundColor: '#FFFFFF',
    },
    eyebrow: {
      fontFamily: fonts.medium,
      fontSize: 10,
      letterSpacing: 0.8,
      color: colors.muted,
      marginBottom: 5,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 30,
      letterSpacing: -1.1,
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
      borderRadius: 100,
      paddingVertical: 10,
      paddingHorizontal: 15,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    badgeText: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: colors.text,
    },
    mono: {
      fontFamily: monoFont,
      fontSize: 10,
      lineHeight: 17,
      color: colors.muted,
    },

    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      paddingVertical: 8,
    },
    choices: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tab: {
      paddingVertical: 12,
      paddingHorizontal: 19,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    tabSelected: {
      borderColor: colors.olive,
      backgroundColor: colors.oliveSoft,
    },
    tabText: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: colors.text,
    },
    selectedText: {
      fontFamily: fonts.bold,
      color: colors.olive,
    },
    themeControl: {
      gap: 7,
    },
    smallChoice: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    smallChoiceText: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.text,
    },
    choiceSelected: {
      borderColor: colors.olive,
      backgroundColor: colors.oliveSoft,
    },

    notice: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      backgroundColor: colors.notice,
      borderRadius: 16,
    },
    noticeTag: {
      fontFamily: fonts.bold,
      fontSize: 10,
      letterSpacing: 0.5,
      color: colors.text,
    },
    noticeText: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 260,
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 20,
      color: colors.muted,
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
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: 20,
      minWidth: 0,
      shadowColor: '#0D1B32',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.035,
      shadowRadius: 16,
      elevation: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    sectionNumber: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: colors.orange,
    },
    label: {
      fontFamily: fonts.bold,
      fontSize: 9,
      letterSpacing: 0.7,
      lineHeight: 16,
      color: colors.muted,
    },
    cardTitle: {
      fontFamily: fonts.bold,
      fontSize: 21,
      letterSpacing: -0.6,
      color: colors.text,
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 22,
      color: colors.muted,
    },
    small: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 20,
      color: colors.muted,
    },
    flexible: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      gap: 6,
    },

    protocolList: {
      gap: 10,
    },
    protocol: {
      minHeight: 52,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 15,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.surface,
    },
    protocolIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    protocolText: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: colors.text,
    },
    radio: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.olive,
    },
    micro: {
      fontFamily: fonts.semibold,
      fontSize: 8,
      lineHeight: 14,
      letterSpacing: 0.4,
      color: colors.muted,
    },
    inset: {
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 14,
      gap: 7,
    },
    endpoint: {
      fontFamily: monoFont,
      fontSize: 12,
      lineHeight: 20,
      color: colors.text,
      flexShrink: 1,
    },

    button: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.olive,
      backgroundColor: colors.olive,
    },
    buttonText: {
      fontFamily: fonts.bold,
      fontSize: 13,
      textAlign: 'center',
      color: colors.onAccent,
    },
    outlineButton: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
    },
    outlineText: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      textAlign: 'center',
      color: colors.text,
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.75,
    },

    headingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    metric: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 230,
      minWidth: 0,
      padding: 22,
      borderRadius: 20,
      gap: 20,
    },
    reading: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      gap: 8,
    },
    metricValue: {
      fontFamily: fonts.extraBold,
      letterSpacing: -2.4,
      fontVariant: ['tabular-nums'],
    },
    unit: {
      fontFamily: fonts.medium,
      fontSize: 20,
      color: colors.muted,
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingTop: 20,
    },
    detail: {
      flexGrow: 1,
      flexBasis: 145,
      gap: 7,
    },
    detailValue: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.text,
    },

    outputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    outputState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 18,
      borderRadius: 17,
      backgroundColor: colors.background,
    },
    outputIndicator: {
      width: 11,
      height: 11,
      flexShrink: 0,
      borderRadius: 6,
    },
    outputTitle: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: colors.text,
    },
    link: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      lineHeight: 20,
      color: colors.olive,
    },

    errorBox: {
      padding: 18,
      borderRadius: 17,
      backgroundColor: colors.errorSoft,
      gap: 7,
    },
    errorTitle: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.error,
    },
    errorText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 22,
      color: colors.error,
    },

    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: 24,
    },
    settingsCard: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 330,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
}