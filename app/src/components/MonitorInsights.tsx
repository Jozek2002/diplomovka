import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Telemetry } from '@/types/iot';

type EventKind = 'info' | 'success' | 'command' | 'error';

type MonitorEvent = {
  id: number;
  time: number;
  kind: EventKind;
  message: string;
};

type Sample = {
  id: number;
  receivedAt: number;
  temperature: number;
  humidity: number;
};

type ChartPoint = {
  time: number;
  value: number;
};

const SAMPLE_LIMIT = 60;
const EVENT_LIMIT = 20;

const colors = {
  surface: '#FCFAF5',
  background: '#F2EFE7',
  text: '#252923',
  muted: '#666B60',
  line: '#D8D5CA',
  olive: '#46543A',
  oliveSoft: '#E8EBE0',
  orange: '#B94F2D',
  orangeSoft: '#F5E8DD',
  error: '#993D32',
};

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
    average:
      values.reduce((total, value) => total + value, 0) /
      values.length,
    max: Math.max(...values),
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
  const [width, setWidth] = useState(0);

  const height = 132;
  const inset = 8;

  const values = points.map((point) => point.value);
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;

  // Voľný priestor nad a pod priebehom.
  const padding = Math.max((maximum - minimum) * 0.15, 0.5);
  const lower = minimum - padding;
  const upper = maximum + padding;

  const firstTime = points[0]?.time ?? 0;
  const lastTime = points[points.length - 1]?.time ?? firstTime;
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

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>

        <Text style={[styles.chartLatest, { color }]}>
          {latest
            ? `${formatValue(latest.value)} ${unit}`
            : `— ${unit}`}
        </Text>
      </View>

      <View style={styles.chartScale}>
        <Text style={styles.axisText}>
          {points.length > 0
            ? `${formatValue(upper)} ${unit}`
            : '—'}
        </Text>

        <Text style={styles.axisText}>
          {points.length > 0
            ? `${formatValue(lower)} ${unit}`
            : '—'}
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel={
          points.length > 0
            ? `${title}. Počet vzoriek: ${points.length}. ` +
              `Minimum ${formatValue(minimum)} ${unit}, ` +
              `maximum ${formatValue(maximum)} ${unit}.`
            : `${title}. Zatiaľ bez prijatých vzoriek.`
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
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            return (
              <View
                key={`${points[index].time}-${index}`}
                style={[
                  styles.segment,
                  {
                    width: length,
                    left: (previous.x + point.x) / 2 - length / 2,
                    top: (previous.y + point.y) / 2 - 1,
                    backgroundColor: color,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}

        {width > 0 && coordinates.length > 0 && (
          <View
            style={[
              styles.chartDot,
              {
                left: coordinates[coordinates.length - 1].x - 4,
                top: coordinates[coordinates.length - 1].y - 4,
                backgroundColor: color,
              },
            ]}
          />
        )}

        {points.length === 0 && (
          <View style={styles.chartEmpty}>
            <Text style={styles.emptyText}>
              Pripoj sa na načítanie priebehu.
            </Text>
          </View>
        )}

        {points.length === 1 && (
          <View style={styles.chartSingle}>
            <Text style={styles.axisText}>
              Prvá vzorka — čaká sa na ďalšiu.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.timeAxis}>
        <Text style={styles.axisText}>
          {points.length > 0 ? formatTime(firstTime) : '—'}
        </Text>
        <Text style={styles.axisText}>
          {points.length > 0 ? formatTime(lastTime) : '—'}
        </Text>
      </View>
    </View>
  );
}

type MonitorInsightsProps = {
  samples: Sample[];
  events: MonitorEvent[];
  connected: boolean;
  wideLayout: boolean;
  onClearEvents: () => void;
};

export function MonitorInsights({
  samples,
  events,
  connected,
  wideLayout,
  onClearEvents,
}: MonitorInsightsProps) {
  const temperature = summarize(
    samples.map((sample) => sample.temperature)
  );

  const humidity = summarize(
    samples.map((sample) => sample.humidity)
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

          <Text style={styles.counter}>
            {samples.length} / {SAMPLE_LIMIT} VZORIEK
          </Text>
        </View>

        <Text style={styles.cardTitle}>Priebeh hodnôt</Text>

        <Text style={styles.bodyText}>
          Posledných 60 vzoriek prijatých aplikáciou.
          Vodorovná os zobrazuje čas prijatia.
        </Text>

        {!connected && samples.length > 0 && (
          <View style={styles.retainedNotice}>
            <Text style={styles.smallText}>
              Spojenie nie je aktívne. Zobrazená história patrí
              poslednému pripojeniu a neaktualizuje sa.
            </Text>
          </View>
        )}

        <MiniChart
          title="TEPLOTA"
          unit="°C"
          color={colors.orange}
          points={samples.map((sample) => ({
            time: sample.receivedAt,
            value: sample.temperature,
          }))}
        />

        <View style={styles.divider} />

        <MiniChart
          title="VLHKOSŤ"
          unit="%"
          color={colors.olive}
          points={samples.map((sample) => ({
            time: sample.receivedAt,
            value: sample.humidity,
          }))}
        />

        <Text style={styles.smallText}>
          Zvislé stupnice sa prispôsobujú prijatým hodnotám.
          História sa vymaže pri začatí nového pripojenia.
        </Text>
      </View>

      <View
        style={[
          styles.bottomRow,
          wideLayout && styles.bottomRowWide,
        ]}
      >
        <View style={[styles.card, styles.bottomCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>05</Text>
            <Text style={styles.sectionTitle}>SÚHRN HODNÔT</Text>
          </View>

          <Text style={styles.cardTitle}>Vzorky v skratke</Text>

          <Text style={styles.bodyText}>
            Výpočet z rovnakých {samples.length} vzoriek ako
            v grafoch.
          </Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableLabel, styles.tableHeaderText]}>
              UKAZOVATEĽ
            </Text>
            <Text style={[styles.tableValue, styles.tableHeaderText]}>
              °C
            </Text>
            <Text style={[styles.tableValue, styles.tableHeaderText]}>
              %
            </Text>
          </View>

          {summaryRows.map((row) => (
            <View key={row.label} style={styles.tableRow}>
              <Text style={styles.tableLabel}>{row.label}</Text>

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

          <Text style={styles.smallText}>
            Ide o súhrn prijatej telemetrie, nie hodnotenie
            výkonu komunikačného protokolu.
          </Text>
        </View>

        <View style={[styles.card, styles.bottomCard]}>
          <View style={styles.headingRow}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>06</Text>
              <Text style={styles.sectionTitle}>UDALOSTI</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vymazať denník udalostí"
              accessibilityState={{
                disabled: events.length === 0,
              }}
              disabled={events.length === 0}
              onPress={onClearEvents}
              style={({ pressed }) => [
                styles.clearButton,
                events.length === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.clearButtonText}>Vymazať</Text>
            </Pressable>
          </View>

          <Text style={styles.cardTitle}>Denník komunikácie</Text>

          <Text style={styles.bodyText}>
            Posledných 20 udalostí. Najnovšie sú navrchu.
          </Text>

          {events.length === 0 ? (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyText}>
                Zatiaľ bez udalostí.
              </Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventTime}>
                      {formatTime(event.time)}
                    </Text>

                    <Text
                      style={[
                        styles.eventKind,
                        event.kind === 'success' &&
                          styles.eventSuccess,
                        event.kind === 'command' &&
                          styles.eventCommand,
                        event.kind === 'error' &&
                          styles.eventError,
                      ]}
                    >
                      {eventLabels[event.kind]}
                    </Text>
                  </View>

                  <Text style={styles.eventMessage}>
                    {event.message}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
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
    letterSpacing: 1.1,
    color: colors.muted,
  },
  counter: {
    fontFamily: monoFont,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
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
  retainedNotice: {
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.orange,
    backgroundColor: colors.background,
  },
  chartBlock: {
    gap: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartTitle: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.text,
  },
  chartLatest: {
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '600',
  },
  chartScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  axisText: {
    fontFamily: monoFont,
    fontSize: 9,
    lineHeight: 15,
    color: colors.muted,
  },
  plot: {
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
  chartDot: {
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
    padding: 16,
},
  chartSingle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.muted,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  bottomRow: {
    gap: 24,
    alignItems: 'stretch',
  },
  bottomRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bottomCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeaderText: {
    fontSize: 9,
    color: colors.muted,
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
    flex: 1.4,
    fontSize: 12,
    color: colors.text,
  },
  tableValue: {
    flex: 1,
    fontFamily: monoFont,
    fontSize: 13,
    textAlign: 'right',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 11,
    color: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyEvents: {
    paddingVertical: 24,
  },
  eventList: {
    gap: 12,
  },
  eventRow: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventTime: {
    fontFamily: monoFont,
    fontSize: 10,
    color: colors.muted,
  },
  eventKind: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
  },
  eventSuccess: {
    color: colors.olive,
  },
  eventCommand: {
    color: colors.orange,
  },
  eventError: {
    color: colors.error,
  },
  eventMessage: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.text,
  },
});