import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Telemetry } from '@/types/iot';

import { useMonitorTheme } from '@/theme/monitor-theme';
import type { MonitorColors } from '@/theme/monitor-theme';

export type EventKind =
  | 'info'
  | 'success'
  | 'command'
  | 'error';

export type MonitorEvent = {
  id: number;
  time: number;
  kind: EventKind;
  message: string;
};

export type Sample = {
  id: number;
  receivedAt: number;
  temperature: number;
  humidity: number;
};

export type EventFilter = 'all' | 'command' | 'error';
export type SampleWindow = 15 | 30 | 60;

type ChartPoint = {
  time: number;
  value: number;
};

const SAMPLE_LIMIT = 60;
const EVENT_LIMIT = 20;

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString('sk-SK');
}

function formatValue(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

function summarize(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average:
      values.reduce((sum, value) => sum + value, 0) /
      values.length,
  };
}

export function useMonitorInsights(
  telemetry: Telemetry | null,
  connected: boolean
) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [events, setEvents] = useState<MonitorEvent[]>([]);

  const sampleId = useRef(0);
  const eventId = useRef(0);
  const lastTelemetry = useRef<Telemetry | null>(null);

  useEffect(() => {
    if (
      !connected ||
      telemetry === null ||
      lastTelemetry.current === telemetry
    ) {
      return;
    }

    lastTelemetry.current = telemetry;

    if (
      !Number.isFinite(telemetry.temperature) ||
      !Number.isFinite(telemetry.humidity)
    ) {
      return;
    }

    sampleId.current += 1;

    const sample: Sample = {
      id: sampleId.current,
      receivedAt: Date.now(),
      temperature: telemetry.temperature,
      humidity: telemetry.humidity,
    };

    setSamples((previous) =>
      [...previous, sample].slice(-SAMPLE_LIMIT)
    );
  }, [telemetry, connected]);

  const resetHistory = useCallback(() => {
    lastTelemetry.current = null;
    setSamples([]);
  }, []);

  const addEvent = useCallback(
    (kind: EventKind, message: string) => {
      eventId.current += 1;

      const event: MonitorEvent = {
        id: eventId.current,
        time: Date.now(),
        kind,
        message,
      };

      setEvents((previous) =>
        [event, ...previous].slice(0, EVENT_LIMIT)
      );
    },
    []
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    samples,
    events,
    resetHistory,
    addEvent,
    clearEvents,
  };
}

type MiniChartProps = {
  title: string;
  unit: string;
  color: string;
  points: ChartPoint[];
};

function MiniChart({
  title,
  unit,
  color,
  points,
}: MiniChartProps) {
  const { colors } = useMonitorTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [width, setWidth] = useState(0);

  const height = 156;
  const inset = 8;

  const values = points.map((point) => point.value);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;

  const padding = Math.max(
    (maximum - minimum) * 0.15,
    0.5
  );

  const lower = minimum - padding;
  const upper = maximum + padding;

  const firstTime = points[0]?.time ?? 0;

  const lastTime =
    points[points.length - 1]?.time ?? firstTime;

  const duration = lastTime - firstTime;
  const plotWidth = Math.max(width - inset * 2, 0);

  const coordinates = points.map((point, index) => {
    const position =
      duration > 0
        ? (point.time - firstTime) / duration
        : points.length > 1
          ? index / (points.length - 1)
          : 0.5;

    return {
      x: inset + position * plotWidth,
      y:
        inset +
        ((upper - point.value) / (upper - lower)) *
          (height - inset * 2),
    };
  });

  const latest = points[points.length - 1];
  const lastCoordinate =
    coordinates[coordinates.length - 1];

  return (
    <View style={styles.chartBlock}>
      <View style={styles.headingRow}>
        <Text style={styles.sectionTitle}>{title}</Text>

        <Text style={[styles.chartLatest, { color }]}>
          {latest
            ? `${formatValue(latest.value)} ${unit}`
            : `— ${unit}`}
        </Text>
      </View>

      <View style={styles.chartWithScale}>
        <View style={[styles.verticalScale, { height }]}>
          <Text style={styles.axis}>
            {points.length ? formatValue(upper) : '—'}
          </Text>

          <Text style={styles.axis}>{unit}</Text>

          <Text style={styles.axis}>
            {points.length ? formatValue(lower) : '—'}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={
            points.length
              ? `${title}: ${points.length} vzoriek. ` +
                `Minimum ${formatValue(minimum)} ${unit}, ` +
                `maximum ${formatValue(maximum)} ${unit}.`
              : `${title}: bez vzoriek.`
          }
          onLayout={(event) => {
            setWidth(event.nativeEvent.layout.width);
          }}
          style={[styles.plot, { height }]}
        >
          {[0.25, 0.5, 0.75].map((position) => (
            <View
              key={position}
              style={[
                styles.gridLine,
                { top: height * position },
              ]}
            />
          ))}

          {width > 0 &&
            coordinates.slice(1).map((point, index) => {
              const previous = coordinates[index];
              const dx = point.x - previous.x;
              const dy = point.y - previous.y;

              const length = Math.sqrt(
                dx * dx + dy * dy
              );

              return (
                <View
                  key={index}
                  style={[
                    styles.segment,
                    {
                      width: length,
                      left:
                        (previous.x + point.x) / 2 -
                        length / 2,
                      top:
                        (previous.y + point.y) / 2 - 1,
                      backgroundColor: color,
                      transform: [
                        {
                          rotate:
                            `${Math.atan2(dy, dx)}rad`,
                        },
                      ],
                    },
                  ]}
                />
              );
            })}

          {width > 0 && lastCoordinate && (
            <View
              style={[
                styles.dot,
                {
                  left: lastCoordinate.x - 4,
                  top: lastCoordinate.y - 4,
                  backgroundColor: color,
                },
              ]}
            />
          )}

          {points.length === 0 && (
            <View style={styles.chartEmpty}>
              <Text style={styles.small}>
                Zatiaľ bez prijatých vzoriek.
              </Text>
            </View>
          )}

          {points.length === 1 && (
            <View style={styles.singleNote}>
              <Text style={styles.axis}>
                Prvá vzorka — čaká sa na ďalšiu.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.timeAxis}>
        <Text style={styles.axis}>
          {points.length ? formatTime(firstTime) : '—'}
        </Text>

        <Text style={styles.axis}>
          {points.length ? formatTime(lastTime) : '—'}
        </Text>
      </View>
    </View>
  );
}

type MonitorInsightsProps = {
  view: 'analysis' | 'events';
  samples: Sample[];
  events: MonitorEvent[];
  connected: boolean;
  sampleWindow: SampleWindow;
  onSampleWindowChange: (value: SampleWindow) => void;
  eventFilter: EventFilter;
  onEventFilterChange: (value: EventFilter) => void;
  onClearEvents: () => void;
};

export function MonitorInsights({
  view,
  samples,
  events,
  connected,
  sampleWindow,
  onSampleWindowChange,
  eventFilter,
  onEventFilterChange,
  onClearEvents,
}: MonitorInsightsProps) {
  const { colors } = useMonitorTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const selectedSamples = samples.slice(-sampleWindow);

  const temperature = summarize(
    selectedSamples.map((sample) => sample.temperature)
  );

  const humidity = summarize(
    selectedSamples.map((sample) => sample.humidity)
  );

  const summaryRows = [
    {
      label: 'Minimum',
      temperature: temperature?.min,
      humidity: humidity?.min,
    },
    {
      label: 'Priemer',
      temperature: temperature?.average,
      humidity: humidity?.average,
    },
    {
      label: 'Maximum',
      temperature: temperature?.max,
      humidity: humidity?.max,
    },
  ];

  const eventLabels: Record<EventKind, string> = {
    info: 'INFO',
    success: 'OK',
    command: 'PRÍKAZ',
    error: 'CHYBA',
  };

  const shownEvents = events.filter(
    (event) =>
      eventFilter === 'all' ||
      event.kind === eventFilter
  );

  if (view === 'events') {
    return (
      <View style={styles.card}>
        <View style={styles.headingRow}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>06</Text>
            <Text style={styles.sectionTitle}>
              UDALOSTI
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: events.length === 0,
            }}
            disabled={events.length === 0}
            onPress={onClearEvents}
            style={({ pressed }) => [
              styles.choice,
              events.length === 0 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.choiceText}>
              Vymazať denník
            </Text>
          </Pressable>
        </View>

        <Text style={styles.title}>
          Denník komunikácie
        </Text>

        <Text style={styles.body}>
          Posledných 20 udalostí naprieč pripojeniami.
          Najnovšie sú navrchu.
        </Text>

        <View style={styles.choices}>
          {(
            [
              { value: 'all', label: 'Všetky' },
              { value: 'command', label: 'Príkazy' },
              { value: 'error', label: 'Chyby' },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{
                selected: eventFilter === item.value,
              }}
              onPress={() =>
                onEventFilterChange(item.value)
              }
              style={[
                styles.choice,
                eventFilter === item.value &&
                  styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  eventFilter === item.value &&
                    styles.selectedText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.small}>
          Zobrazené: {shownEvents.length} / {events.length}
        </Text>

        {shownEvents.length === 0 && (
          <Text style={styles.empty}>
            Pre tento filter nie sú žiadne udalosti.
          </Text>
        )}

        {shownEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventMeta}>
              <Text style={styles.axis}>
                {formatTime(event.time)}
              </Text>

              <Text
                style={[
                  styles.eventKind,
                  {
                    color:
                      event.kind === 'error'
                        ? colors.error
                        : event.kind === 'command'
                          ? colors.orange
                          : event.kind === 'success'
                            ? colors.olive
                            : colors.muted,
                  },
                ]}
              >
                {eventLabels[event.kind]}
              </Text>
            </View>

            <Text selectable style={styles.eventMessage}>
              {event.message}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headingRow}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>04</Text>
            <Text style={styles.sectionTitle}>
              HISTÓRIA TELEMETRIE
            </Text>
          </View>

          <Text style={styles.axis}>
            {selectedSamples.length} / {sampleWindow} VZORIEK
          </Text>
        </View>

        <Text style={styles.title}>Priebeh hodnôt</Text>

        <Text style={styles.body}>
          Vyber počet posledných prijatých vzoriek.
          Grafy aj súhrn používajú rovnaký výber.
        </Text>

        <View style={styles.choices}>
          {([15, 30, 60] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{
                selected: sampleWindow === value,
              }}
              onPress={() => onSampleWindowChange(value)}
              style={[
                styles.choice,
                sampleWindow === value &&
                  styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  sampleWindow === value &&
                    styles.selectedText,
                ]}
              >
                {value} vzoriek
              </Text>
            </Pressable>
          ))}
        </View>

        {!connected && samples.length > 0 && (
          <View style={styles.notice}>
            <Text style={styles.small}>
              Spojenie nie je aktívne. História posledného
              pripojenia sa neaktualizuje.
            </Text>
          </View>
        )}

        <MiniChart
          title="TEPLOTA"
          unit="°C"
          color={colors.orange}
          points={selectedSamples.map((sample) => ({
            time: sample.receivedAt,
            value: sample.temperature,
          }))}
        />

        <View style={styles.divider} />

        <MiniChart
          title="VLHKOSŤ"
          unit="%"
          color={colors.olive}
          points={selectedSamples.map((sample) => ({
            time: sample.receivedAt,
            value: sample.humidity,
          }))}
        />

        <Text style={styles.small}>
          Vodorovná os: čas prijatia v aplikácii.
          Zvislé stupnice sú automatické. História sa
          vymaže pri novom pripojení.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>05</Text>
          <Text style={styles.sectionTitle}>
            SÚHRN HODNÔT
          </Text>
        </View>

        <Text style={styles.title}>Vzorky v skratke</Text>

        <Text style={styles.body}>
          Výpočet z {selectedSamples.length} vzoriek
          zobrazených v grafoch.
        </Text>

        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, styles.small]}>
            UKAZOVATEĽ
          </Text>
          <Text style={[styles.tableValue, styles.small]}>
            TEPLOTA / °C
          </Text>
          <Text style={[styles.tableValue, styles.small]}>
            VLHKOSŤ / %
          </Text>
        </View>

        {summaryRows.map((row) => (
          <View key={row.label} style={styles.tableRow}>
            <Text style={styles.tableLabel}>
              {row.label}
            </Text>

            <Text
              style={[
                styles.tableValue,
                { color: colors.orange },
              ]}
            >
              {row.temperature === undefined
                ? '—'
                : formatValue(row.temperature)}
            </Text>

            <Text
              style={[
                styles.tableValue,
                { color: colors.olive },
              ]}
            >
              {row.humidity === undefined
                ? '—'
                : formatValue(row.humidity)}
            </Text>
          </View>
        ))}

        <Text style={styles.small}>
          Ide o súhrn prijatých hodnôt, nie o meranie
          výkonu protokolu.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: MonitorColors) {
  return StyleSheet.create({
    container: { gap: 24 },
    card: {
      padding: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: 18,
      minWidth: 0,
    },
    headingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
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
      letterSpacing: 1,
      color: colors.muted,
    },
    title: {
      fontSize: 21,
      fontWeight: '600',
      letterSpacing: -0.4,
      color: colors.text,
    },
    body: {
      fontSize: 13,
      lineHeight: 21,
      color: colors.muted,
    },
    small: {
      fontSize: 11,
      lineHeight: 18,
      color: colors.muted,
    },
    choices: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choice: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 4,
    },
    choiceSelected: {
      backgroundColor: colors.oliveSoft,
      borderColor: colors.olive,
    },
    choiceText: {
      fontSize: 12,
      color: colors.text,
    },
    selectedText: {
      color: colors.olive,
      fontWeight: '600',
    },
    notice: {
      padding: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.orange,
      backgroundColor: colors.background,
    },
    chartBlock: { gap: 12 },
    chartLatest: {
      fontFamily: monoFont,
      fontSize: 15,
      fontWeight: '600',
    },
    chartWithScale: {
      flexDirection: 'row',
      gap: 8,
    },
    verticalScale: {
      width: 42,
      paddingVertical: 2,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    axis: {
      fontFamily: monoFont,
      fontSize: 9,
      lineHeight: 15,
      color: colors.muted,
    },
    plot: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.background,
      borderRadius: 4,
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.line,
    },
    segment: {
      position: 'absolute',
      height: 2,
    },
    dot: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chartEmpty: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    singleNote: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      right: 8,
      alignItems: 'center',
    },
    timeAxis: {
      marginLeft: 50,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    divider: {
      height: 1,
      backgroundColor: colors.line,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    tableLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
    },
    tableValue: {
      flex: 1,
      fontFamily: monoFont,
      fontSize: 13,
      textAlign: 'right',
      color: colors.text,
    },
    empty: {
      paddingVertical: 24,
      fontSize: 12,
      textAlign: 'center',
      color: colors.muted,
    },
    eventRow: {
      gap: 8,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    eventMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    eventKind: {
      fontFamily: monoFont,
      fontSize: 10,
      fontWeight: '700',
    },
    eventMessage: {
      fontSize: 13,
      lineHeight: 21,
      color: colors.text,
    },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.7 },
  });
}