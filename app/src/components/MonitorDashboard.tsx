import {
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MiniChart,
  MonitorInsights,
} from '@/components/MonitorInsights';

import type {
  EventFilter,
  MonitorEvent,
  Sample,
  SampleWindow,
} from '@/components/MonitorInsights';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';

import type {
  MonitorColors,
} from '@/theme/monitor-theme';

import type {
  Protocol,
  Status,
  Telemetry,
} from '@/types/iot';

import { HTTP_URL } from '@/services/http-client';
import { WS_URL } from '@/services/websocket-client';

type Tab = 'overview' | 'analysis' | 'events' | 'settings';
type Metric = 'temperature' | 'humidity';

type Props = {
  protocol: Protocol;
  status: Status;
  telemetry: Telemetry | null;
  outputEnabled: boolean;
  outputBusy: boolean;
  error: string | null;
  samples: Sample[];
  events: MonitorEvent[];
  onProtocolChange: (value: Protocol) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOutputChange: (value: boolean) => void;
  onClearHistory: () => void;
  onClearEvents: () => void;
};

const navigation: {
  value: Tab;
  label: string;
  symbol: string;
}[] = [
  { value: 'overview', label: 'Prehľad', symbol: '◈' },
  { value: 'analysis', label: 'Analýza', symbol: '⌁' },
  { value: 'events', label: 'Udalosti', symbol: '≡' },
  { value: 'settings', label: 'Nastavenia', symbol: '⚙' },
];

const themeOptions = [
  { value: 'light', label: 'Svetlý' },
  { value: 'dark', label: 'Tmavý' },
  { value: 'system', label: 'Systém' },
] as const;

function formatValue(value: number) {
  return value.toFixed(1).replace('.', ',');
}

function formatTime(value: number) {
  return new Date(value).toLocaleTimeString('sk-SK');
}

function statistics(values: number[]) {
  if (!values.length) return null;

  return {
    min: Math.min(...values),
    average:
      values.reduce((sum, value) => sum + value, 0) /
      values.length,
    max: Math.max(...values),
  };
}

export function MonitorDashboard({
  protocol,
  status,
  telemetry,
  outputEnabled,
  outputBusy,
  error,
  samples,
  events,
  onProtocolChange,
  onConnect,
  onDisconnect,
  onOutputChange,
  onClearHistory,
  onClearEvents,
}: Props) {
  const { width } = useWindowDimensions();

  const {
    colors,
    isDark,
    preference,
    setPreference,
  } = useMonitorTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const desktop = width >= 1180;
  const compact = width < 650;

  const [tab, setTab] = useState<Tab>('overview');
  const [metric, setMetric] = useState<Metric>('temperature');

  const [sampleWindow, setSampleWindow] =
    useState<SampleWindow>(60);

  const [eventFilter, setEventFilter] =
    useState<EventFilter>('all');

  const connected = status === 'connected';
  const connecting = status === 'connecting';

  const visibleSamples = samples.slice(-sampleWindow);

  const selectedValues = visibleSamples.map(
    (sample) => sample[metric]
  );

  const summary = statistics(selectedValues);

  const metricColor =
    metric === 'temperature'
      ? colors.olive
      : colors.orange;

  const metricUnit =
    metric === 'temperature' ? '°C' : '%';

  const statusText = connecting
    ? 'Pripájanie'
    : connected
      ? 'Pripojené'
      : error
        ? 'Chyba spojenia'
        : 'Odpojené';

  const eventLabels = {
    info: 'Informácia',
    success: 'Potvrdené',
    command: 'Príkaz',
    error: 'Chyba',
  };

  const currentTitle = navigation.find(
    (item) => item.value === tab
  )?.label;

  const latestSample = samples[samples.length - 1];

  const connectionPanel = (
    <View style={styles.connectionPanel}>
      <View style={styles.headingRow}>
        <Text style={styles.panelTitle}>Pripojenie</Text>

        <View style={styles.statusLabel}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: error
                  ? colors.error
                  : connected
                    ? colors.olive
                    : colors.muted,
              },
            ]}
          />
          <Text style={styles.caption}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.protocolOptions}>
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
              onPress={() => onProtocolChange(item)}
              style={[
                styles.protocol,
                protocol === item && styles.protocolSelected,
              ]}
            >
              <Text
                style={[
                  styles.protocolText,
                  protocol === item && styles.accentText,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          )
        )}
      </View>

      <View style={styles.addressBlock}>
        <Text style={styles.caption}>Adresa servera</Text>
        <Text selectable style={styles.address}>
          {protocol === 'HTTP/REST' ? HTTP_URL : WS_URL}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: outputBusy }}
        disabled={outputBusy}
        onPress={
          status === 'disconnected'
            ? onConnect
            : onDisconnect
        }
        style={({ pressed }) => [
          styles.action,
          status !== 'disconnected' && styles.actionSecondary,
          outputBusy && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.actionText,
            status !== 'disconnected' &&
              styles.actionSecondaryText,
          ]}
        >
          {connecting
            ? 'Zrušiť pripájanie'
            : connected
              ? 'Odpojiť zariadenie'
              : 'Pripojiť zariadenie'}
        </Text>
      </Pressable>

      <Text style={styles.caption}>
        Pred zmenou protokolu sa odpoj.
      </Text>
    </View>
  );

  const outputPanel = (
    <View style={styles.controlBlock}>
      <Text style={styles.panelTitle}>Digitálny výstup</Text>

      <View style={styles.headingRow}>
        <View style={styles.flexible}>
          <Text style={styles.outputValue}>
            {!connected
              ? 'Nenačítaný'
              : outputBusy
                ? 'Čaká sa'
                : outputEnabled
                  ? 'Zapnutý'
                  : 'Vypnutý'}
          </Text>

          <Text style={styles.caption}>
            {!connected
              ? 'Najprv pripoj zariadenie.'
              : outputBusy
                ? 'Čaká sa na potvrdenie servera.'
                : 'Stav prijatý zo servera.'}
          </Text>
        </View>

        <Switch
          accessibilityLabel="Simulovaný digitálny výstup"
          value={connected && outputEnabled}
          disabled={!connected || outputBusy}
          onValueChange={onOutputChange}
          trackColor={{
            false: colors.line,
            true: colors.olive,
          }}
          thumbColor={isDark ? '#EAF6F2' : '#FFFFFF'}
          ios_backgroundColor={colors.line}
        />
      </View>

      <Text style={styles.caption}>
        Odpojenie aplikácie nemení stav výstupu na serveri.
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.outer,
        compact && styles.outerCompact,
      ]}
    >
      <View style={[styles.shell, desktop && styles.shellWide]}>
        <View
          style={[
            styles.sidebar,
            desktop && styles.sidebarDesktop,
          ]}
        >
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <View style={styles.brandDot} />
              <View style={styles.brandDot} />
              <View style={styles.brandDot} />
            </View>

            <View>
              <Text style={styles.brandTitle}>IoT Monitor</Text>
              <Text style={styles.brandSubtitle}>
                Riadenie a telemetria
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.navigation,
              !desktop && styles.navigationHorizontal,
            ]}
          >
            {navigation.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: tab === item.value,
                }}
                onPress={() => setTab(item.value)}
                style={({ pressed }) => [
                  styles.navItem,
                  tab === item.value && styles.navItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  accessible={false}
                  style={[
                    styles.navSymbol,
                    tab === item.value &&
                      styles.navTextSelected,
                  ]}
                >
                  {item.symbol}
                </Text>

                <Text
                  style={[
                    styles.navText,
                    tab === item.value &&
                      styles.navTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {desktop && <View style={styles.sidebarSpacer} />}

          <View style={styles.sidebarBottom}>
            <View style={styles.headingRow}>
              <Text style={styles.caption}>Tmavý vzhľad</Text>

              <Switch
                accessibilityLabel="Tmavý vzhľad"
                value={isDark}
                onValueChange={(value) =>
                  setPreference(value ? 'dark' : 'light')
                }
                trackColor={{
                  false: colors.line,
                  true: colors.olive,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.line}
              />
            </View>

            <View style={styles.environment}>
              <Text style={styles.environmentTitle}>
                Simulované zariadenie
              </Text>

              <Text style={styles.caption}>
                Lokálny simulátor · nie fyzické ESP32
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.workspace}>
          <View style={styles.pageHeader}>
            <View style={styles.flexible}>
              <Text style={styles.pageTitle}>
                {tab === 'overview'
                  ? 'Prehľad zariadenia'
                  : currentTitle}
              </Text>

              <Text style={styles.body}>
                {telemetry?.deviceId ??
                  'Zariadenie zatiaľ nie je načítané'}
              </Text>
            </View>

            <View style={styles.headerStatus}>
              <Text style={styles.caption}>{protocol}</Text>
              <Text style={styles.headerStatusText}>
                {statusText}
              </Text>
            </View>
          </View>

          {error !== null && (
            <View accessibilityRole="alert" style={styles.error}>
              <Text style={styles.errorTitle}>
                Chyba komunikácie
              </Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {tab === 'overview' && (
            <View style={styles.overview}>
              <View style={styles.statGrid}>
                {[
                  {
                    label: 'Teplota',
                    value: telemetry
                      ? formatValue(telemetry.temperature)
                      : '—',
                    unit: '°C',
                    color: colors.olive,
                  },
                  {
                    label: 'Vlhkosť',
                    value: telemetry
                      ? formatValue(telemetry.humidity)
                      : '—',
                    unit: '%',
                    color: colors.orange,
                  },
                  {
                    label: 'Vzorka na serveri',
                    value: telemetry
                      ? `#${telemetry.sequence}`
                      : '—',
                    unit: '',
                    color: colors.muted,
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.stat}>
                    <View style={styles.headingRow}>
                      <View
                        style={[
                          styles.statMarker,
                          { backgroundColor: item.color },
                        ]}
                      />

                      <Text style={styles.statLabel}>
                        {item.label}
                      </Text>
                    </View>

                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={styles.statValue}
                    >
                      {item.value}
                      <Text style={styles.statUnit}>
                        {item.unit ? ` ${item.unit}` : ''}
                      </Text>
                    </Text>

                    <Text style={styles.caption}>
                      {telemetry
                        ? 'Posledný prijatý stav'
                        : 'Čaká sa na údaje'}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartPanel}>
                <View style={styles.headingRow}>
                  <View style={styles.flexible}>
                    <Text style={styles.panelTitle}>
                      Priebeh telemetrie
                    </Text>

                    <Text style={styles.caption}>
                      Posledných {visibleSamples.length}
                      {' '}prijatých vzoriek
                    </Text>
                  </View>

                  <View style={styles.smallChoices}>
                    {([15, 30, 60] as const).map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: sampleWindow === value,
                        }}
                        onPress={() => setSampleWindow(value)}
                        style={[
                          styles.smallChoice,
                          sampleWindow === value &&
                            styles.smallChoiceSelected,
                        ]}
                      >
                        <Text style={styles.smallChoiceText}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.metricSelector}>
                  {(
                    [
                      { value: 'temperature', label: 'Teplota' },
                      { value: 'humidity', label: 'Vlhkosť' },
                    ] as const
                  ).map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: metric === item.value,
                      }}
                      onPress={() => setMetric(item.value)}
                      style={[
                        styles.metricOption,
                        metric === item.value &&
                          styles.metricOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricOptionText,
                          metric === item.value &&
                            styles.metricOptionTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <MiniChart
                  title={
                    metric === 'temperature'
                      ? 'TEPLOTA / °C'
                      : 'VLHKOSŤ / %'
                  }
                  unit={metricUnit}
                  color={metricColor}
                  points={visibleSamples.map((sample) => ({
                    time: sample.receivedAt,
                    value: sample[metric],
                  }))}
                />

                <View style={styles.chartSummary}>
                  {[
                    { label: 'Minimum', value: summary?.min },
                    { label: 'Priemer', value: summary?.average },
                    { label: 'Maximum', value: summary?.max },
                  ].map((item) => (
                    <View key={item.label} style={styles.summaryItem}>
                      <Text style={styles.caption}>
                        {item.label}
                      </Text>

                      <Text style={styles.summaryValue}>
                        {item.value === undefined
                          ? '—'
                          : `${formatValue(item.value)} ${metricUnit}`}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.chartFootnote}>
                  {!connected && samples.length > 0
                    ? 'Uchovaná história. Spojenie nie je aktívne.'
                    : 'Čas prijatia v aplikácii · automatická zvislá stupnica'}
                </Text>
              </View>

              <View style={styles.eventsPanel}>
                <View style={styles.headingRow}>
                  <Text style={styles.panelTitle}>
                    Posledné udalosti
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTab('events')}
                  >
                    <Text style={styles.link}>
                      Otvoriť denník →
                    </Text>
                  </Pressable>
                </View>

                {events.length === 0 && (
                  <Text style={styles.body}>
                    Denník zatiaľ neobsahuje udalosti.
                  </Text>
                )}

                {events.slice(0, 5).map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <View
                      style={[
                        styles.eventIndicator,
                        {
                          backgroundColor:
                            event.kind === 'error'
                              ? colors.errorSoft
                              : event.kind === 'command'
                                ? colors.orangeSoft
                                : colors.oliveSoft,
                        },
                      ]}
                    >
                      <Text
                        accessible={false}
                        style={{
                          fontFamily: fonts.semibold,
                          fontSize: 12,
                          color:
                            event.kind === 'error'
                              ? colors.error
                              : event.kind === 'command'
                                ? colors.orange
                                : colors.olive,
                        }}
                      >
                        {event.kind === 'error'
                          ? '!'
                          : event.kind === 'command'
                            ? '↗'
                            : event.kind === 'success'
                              ? '✓'
                              : 'i'}
                      </Text>
                    </View>

                    <View style={styles.flexible}>
                      <Text style={styles.eventTitle}>
                        {eventLabels[event.kind]}
                      </Text>
                      <Text style={styles.eventMessage}>
                        {event.message}
                      </Text>
                    </View>

                    <Text style={styles.eventTime}>
                      {formatTime(event.time)}
                    </Text>
                  </View>
                ))}
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
              onClearEvents={onClearEvents}
            />
          )}

          {tab === 'settings' && (
            <View style={styles.overview}>
              <View style={styles.settingsPanel}>
                <Text style={styles.panelTitle}>Vzhľad aplikácie</Text>

                <View style={styles.settingsChoices}>
                  {themeOptions.map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: preference === item.value,
                      }}
                      onPress={() => setPreference(item.value)}
                      style={[
                        styles.settingChoice,
                        preference === item.value &&
                          styles.protocolSelected,
                      ]}
                    >
                      <Text style={styles.protocolText}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.body}>
                  Voľba platí počas aktuálneho behu aplikácie.
                  Po obnovení stránky sa použije tmavý vzhľad.
                  Možnosť Systém sleduje vzhľad zariadenia.
                </Text>
              </View>

              <View style={styles.settingsPanel}>
                <Text style={styles.panelTitle}>Lokálne údaje</Text>

                <Text style={styles.body}>
                  V pamäti: {samples.length} vzoriek
                  {' '}a {events.length} udalostí.
                  Vymazanie nepreruší spojenie.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: samples.length === 0,
                  }}
                  disabled={samples.length === 0}
                  onPress={onClearHistory}
                  style={[
                    styles.action,
                    styles.actionSecondary,
                    samples.length === 0 && styles.disabled,
                  ]}
                >
                  <Text style={styles.actionSecondaryText}>
                    Vymazať históriu telemetrie
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: events.length === 0,
                  }}
                  disabled={events.length === 0}
                  onPress={onClearEvents}
                  style={[
                    styles.action,
                    styles.actionSecondary,
                    events.length === 0 && styles.disabled,
                  ]}
                >
                  <Text style={styles.actionSecondaryText}>
                    Vymazať denník udalostí
                  </Text>
                </Pressable>

                <Text style={styles.caption}>
                  História a denník nie sú uložené natrvalo.
                  Pri aktívnom spojení história pribúda ďalšími vzorkami.
                </Text>
              </View>

              <View style={styles.settingsPanel}>
                <Text style={styles.panelTitle}>Testovacie prostredie</Text>

                <Text style={styles.body}>
                  Údaje generuje lokálny simulátor.
                  HTTP/REST a WebSocket sú implementované.
                  MQTT a meranie RTT zatiaľ nie.
                </Text>

                <Text selectable style={styles.address}>
                  HTTP: {HTTP_URL}
                </Text>

                <Text selectable style={styles.address}>
                  WebSocket: {WS_URL}
                </Text>
              </View>
            </View>
          )}

          {!desktop && tab === 'overview' && (
            <View style={styles.mobileControls}>
              {connectionPanel}
              {outputPanel}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.caption}>
              IoT Monitor · Diplomová práca
            </Text>
            <Text style={styles.caption}>
              Bez merania RTT
            </Text>
          </View>
        </View>

        {desktop && (
          <View style={styles.rightPanel}>
            {connectionPanel}

            {outputPanel}

            <View style={styles.controlBlock}>
              <Text style={styles.panelTitle}>
                Informácie o vzorke
              </Text>

              {[
                {
                  label: 'Vzorka na serveri',
                  value: telemetry
                    ? `#${telemetry.sequence}`
                    : '—',
                },
                {
                  label: 'Vytvorené na serveri',
                  value: telemetry
                    ? new Date(
                        telemetry.generatedAt
                      ).toLocaleTimeString('sk-SK')
                    : '—',
                },
                {
                  label: 'Posledná vzorka v histórii',
                  value: latestSample
                    ? formatTime(latestSample.receivedAt)
                    : '—',
                },
                {
                  label: 'Uchované vzorky',
                  value: `${samples.length} / 60`,
                },
              ].map((item) => (
                <View key={item.label} style={styles.detailRow}>
                  <Text style={styles.caption}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.rightNote}>
              <View style={styles.statusLabel}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: colors.olive },
                  ]}
                />
                <Text style={styles.noteTitle}>
                  Testovacie prostredie
                </Text>
              </View>

              <Text style={styles.caption}>
                Zobrazené hodnoty sú simulované.
                Nie sú výsledkom merania na fyzickom ESP32.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c: MonitorColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    outer: {
      width: '100%',
      maxWidth: 1700,
      alignSelf: 'center',
      padding: 24,
    },
    outerCompact: {
      padding: 10,
    },
    shell: {
      backgroundColor: c.background,
      borderRadius: 27,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.line,
    },
    shellWide: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 820,
    },

    sidebar: {
      backgroundColor: c.notice,
      padding: 21,
      gap: 25,
    },
    sidebarDesktop: {
      width: 207,
      flexShrink: 0,
      borderRightWidth: 1,
      borderRightColor: c.line,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 7,
    },
    brandMark: {
      width: 31,
      height: 33,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderRadius: 10,
      backgroundColor: c.oliveSoft,
    },
    brandDot: {
      width: 4,
      height: 12,
      borderRadius: 2,
      backgroundColor: c.olive,
    },
    brandTitle: {
      fontFamily: fonts.bold,
      fontSize: 17,
      letterSpacing: -0.6,
      color: c.olive,
    },
    brandSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 9,
      color: c.muted,
      marginTop: 3,
    },
    navigation: {
      gap: 9,
    },
    navigationHorizontal: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    navItemSelected: {
      backgroundColor: c.olive,
    },
    navSymbol: {
      width: 20,
      textAlign: 'center',
      fontSize: 19,
      color: c.muted,
    },
    navText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: c.muted,
    },
    navTextSelected: {
      color: c.onAccent,
    },
    sidebarSpacer: {
      flex: 1,
      minHeight: 120,
    },
    sidebarBottom: {
      gap: 20,
    },
    environment: {
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 18,
    },
    environmentTitle: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.text,
    },

    workspace: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      padding: 24,
      gap: 25,
    },
    pageHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      paddingVertical: 8,
    },
    flexible: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    pageTitle: {
      fontFamily: fonts.semibold,
      fontSize: 26,
      letterSpacing: -0.8,
      color: c.text,
    },
    headerStatus: {
      gap: 5,
      alignItems: 'flex-end',
    },
    headerStatusText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.text,
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 20,
      color: c.muted,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 10,
      lineHeight: 17,
      color: c.muted,
    },
    overview: {
      gap: 22,
    },
    headingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    panelTitle: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      letterSpacing: -0.25,
      color: c.text,
    },

    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 13,
    },
    stat: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 150,
      minWidth: 0,
      backgroundColor: c.surface,
      padding: 18,
      borderRadius: 17,
      gap: 18,
    },
    statMarker: {
      width: 8,
      height: 8,
      borderRadius: 3,
    },
    statLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: c.muted,
    },
    statValue: {
      fontFamily: fonts.semibold,
      fontSize: 29,
      letterSpacing: -0.8,
      fontVariant: ['tabular-nums'],
      color: c.text,
    },
    statUnit: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: c.muted,
    },

    chartPanel: {
      backgroundColor: c.surface,
      borderRadius: 19,
      padding: 22,
      gap: 23,
    },
    smallChoices: {
      flexDirection: 'row',
      gap: 4,
    },
    smallChoice: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 7,
    },
    smallChoiceSelected: {
      backgroundColor: c.notice,
    },
    smallChoiceText: {
      fontFamily: fonts.medium,
      fontSize: 10,
      color: c.text,
    },
    metricSelector: {
      flexDirection: 'row',
      gap: 20,
    },
    metricOption: {
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    metricOptionSelected: {
      borderBottomColor: c.olive,
    },
    metricOptionText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.muted,
    },
    metricOptionTextSelected: {
      fontFamily: fonts.medium,
      color: c.text,
    },
    chartSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    summaryItem: {
      flexGrow: 1,
      gap: 7,
    },
    summaryValue: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: c.text,
    },
    chartFootnote: {
      fontFamily: fonts.regular,
      fontSize: 9,
      lineHeight: 16,
      color: c.muted,
    },

    eventsPanel: {
      gap: 18,
      paddingTop: 3,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    eventIndicator: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventTitle: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.text,
    },
    eventMessage: {
      fontFamily: fonts.regular,
      fontSize: 11,
      lineHeight: 18,
      color: c.muted,
    },
    eventTime: {
      fontFamily: fonts.regular,
      fontSize: 9,
      color: c.muted,
      paddingTop: 3,
    },
    link: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.olive,
    },

    rightPanel: {
      width: 282,
      flexShrink: 0,
      backgroundColor: c.notice,
      padding: 20,
      gap: 26,
      borderLeftWidth: 1,
      borderLeftColor: c.line,
    },
    connectionPanel: {
      backgroundColor: c.surface,
      borderRadius: 17,
      padding: 17,
      gap: 18,
    },
    statusLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    protocolOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    protocol: {
      flexGrow: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: c.notice,
    },
    protocolSelected: {
      backgroundColor: c.oliveSoft,
      borderWidth: 1,
      borderColor: c.olive,
    },
    protocolText: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.text,
    },
    accentText: {
      color: c.olive,
    },
    addressBlock: {
      gap: 6,
    },
    address: {
      fontFamily: fonts.regular,
      fontSize: 10,
      lineHeight: 18,
      color: c.text,
      flexShrink: 1,
    },
    action: {
      minHeight: 41,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: c.olive,
    },
    actionText: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.onAccent,
      textAlign: 'center',
    },
    actionSecondary: {
      backgroundColor: c.notice,
      borderWidth: 1,
      borderColor: c.line,
    },
    actionSecondaryText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.text,
      textAlign: 'center',
    },
    controlBlock: {
      gap: 18,
    },
    outputValue: {
      fontFamily: fonts.medium,
      fontSize: 18,
      letterSpacing: -0.4,
      color: c.text,
    },
    detailRow: {
      gap: 5,
    },
    detailValue: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: c.text,
    },
    rightNote: {
      padding: 15,
      backgroundColor: c.background,
      borderRadius: 13,
      gap: 10,
    },
    noteTitle: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.text,
    },

    mobileControls: {
      gap: 26,
      paddingTop: 6,
    },
    settingsPanel: {
      backgroundColor: c.surface,
      padding: 21,
      borderRadius: 16,
      gap: 19,
    },
    settingsChoices: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    settingChoice: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 9,
      backgroundColor: c.notice,
    },
    error: {
      padding: 16,
      borderRadius: 13,
      backgroundColor: c.errorSoft,
      gap: 6,
    },
    errorTitle: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: c.error,
    },
    errorText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 20,
      color: c.error,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
      paddingTop: 10,
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}