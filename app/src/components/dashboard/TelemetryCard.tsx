import {
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';
import type { Telemetry } from '@/types/iot';
import type { Sample, SampleWindow } from '@/components/MonitorInsights';

type TelemetryCardProps = {
  telemetry: Telemetry | null;
  samples: Sample[];
  connected: boolean;
};

type MetricType = 'temperature' | 'humidity';

function formatVal(v: number) {
  return v.toFixed(1).replace('.', ',');
}

export function TelemetryCard({
  telemetry,
  samples,
  connected,
}: TelemetryCardProps) {
  const { colors, isDark } = useMonitorTheme();

  const [activeMetric, setActiveMetric] = useState<MetricType>('temperature');
  const [windowSize, setWindowSize] = useState<SampleWindow>(30);
  const [chartWidth, setChartWidth] = useState(0);

  const visibleSamples = useMemo(
    () => samples.slice(-windowSize),
    [samples, windowSize]
  );

  const values = useMemo(
    () => visibleSamples.map((s) => s[activeMetric]),
    [visibleSamples, activeMetric]
  );

  const stats = useMemo(() => {
    if (!values.length) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    return { min, max, avg };
  }, [values]);

  const activeColor = isDark ? '#FFFFFF' : '#121417';
  const unit = activeMetric === 'temperature' ? '°C' : '%';

  // Sparkline coordinates
  const chartHeight = 90;
  const paddingY = 6;
  const minVal = stats ? stats.min - 0.4 : 20;
  const maxVal = stats ? stats.max + 0.4 : 30;
  const range = maxVal - minVal || 1;

  const points = useMemo(() => {
    if (chartWidth <= 0 || visibleSamples.length < 2) return [];
    const count = visibleSamples.length;
    return visibleSamples.map((s, idx) => {
      const x = (idx / (count - 1)) * (chartWidth - 20) + 10;
      const y =
        chartHeight -
        paddingY -
        ((s[activeMetric] - minVal) / range) * (chartHeight - paddingY * 2);
      return { x, y };
    });
  }, [visibleSamples, chartWidth, activeMetric, minVal, range]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
      ]}
    >
      {/* Section Title (Screen 1 & 2 style: "Upcoming tours" -> "Senzory telemetrie") */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: fonts.bold }]}>
            Živá telemetria
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {connected
              ? `Vzorka #${telemetry?.sequence ?? '—'} · 1 vzorka / sekundu`
              : 'Čaká sa na pripojenie k uzlu'}
          </Text>
        </View>

        {/* Window Selector Pills (15s | 30s | 60s) */}
        <View style={styles.windowPillsRow}>
          {([15, 30, 60] as const).map((w) => {
            const active = windowSize === w;
            return (
              <Pressable
                key={w}
                onPress={() => setWindowSize(w)}
                style={({ pressed }) => [
                  styles.windowPill,
                  {
                    backgroundColor: active
                      ? isDark
                        ? '#FFFFFF'
                        : '#121417'
                      : colors.backgroundSecondary,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.windowPillText,
                    {
                      color: active
                        ? isDark
                          ? '#121417'
                          : '#FFFFFF'
                        : colors.textSecondary,
                      fontFamily: active ? fonts.semibold : fonts.medium,
                    },
                  ]}
                >
                  {w}s
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Screen 2 "Upcoming tours" Style Side-by-Side Cards */}
      <View style={styles.tilesGrid}>
        {/* Temperature Card */}
        <Pressable
          onPress={() => setActiveMetric('temperature')}
          style={({ pressed }) => [
            styles.sensorTile,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor:
                activeMetric === 'temperature'
                  ? colors.text
                  : 'transparent',
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.sensorTileHeader}>
            <View style={[styles.sensorTag, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sensorTagText, { color: colors.text, fontFamily: fonts.medium }]}>
                Teplota
              </Text>
            </View>
            <View style={[styles.activeDot, { backgroundColor: activeMetric === 'temperature' ? colors.green : 'transparent' }]} />
          </View>

          <Text style={[styles.sensorNumber, { color: colors.text, fontFamily: fonts.bold }]}>
            {telemetry ? `${formatVal(telemetry.temperature)} °C` : '—'}
          </Text>

          <Text style={[styles.sensorFootnote, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {stats && activeMetric === 'temperature'
              ? `Priemer ${formatVal(stats.avg)} °C`
              : 'Rozsah 22–26 °C'}
          </Text>
        </Pressable>

        {/* Humidity Card */}
        <Pressable
          onPress={() => setActiveMetric('humidity')}
          style={({ pressed }) => [
            styles.sensorTile,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor:
                activeMetric === 'humidity'
                  ? colors.text
                  : 'transparent',
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.sensorTileHeader}>
            <View style={[styles.sensorTag, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sensorTagText, { color: colors.text, fontFamily: fonts.medium }]}>
                Vlhkosť
              </Text>
            </View>
            <View style={[styles.activeDot, { backgroundColor: activeMetric === 'humidity' ? colors.green : 'transparent' }]} />
          </View>

          <Text style={[styles.sensorNumber, { color: colors.text, fontFamily: fonts.bold }]}>
            {telemetry ? `${formatVal(telemetry.humidity)} %` : '—'}
          </Text>

          <Text style={[styles.sensorFootnote, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {stats && activeMetric === 'humidity'
              ? `Priemer ${formatVal(stats.avg)} %`
              : 'Rozsah 40–55 %'}
          </Text>
        </Pressable>
      </View>

      {/* Sparkline Graph */}
      <View
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        style={[
          styles.chartBox,
          {
            backgroundColor: colors.backgroundSecondary,
            height: chartHeight,
          },
        ]}
      >
        {stats && (
          <View style={styles.chartLegend}>
            <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              {activeMetric === 'temperature' ? 'Priebeh teploty' : 'Priebeh vlhkosti'}
            </Text>
            <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              Min {formatVal(stats.min)} {unit} · Max {formatVal(stats.max)} {unit}
            </Text>
          </View>
        )}

        {/* Polyline line segments */}
        {points.length > 1 &&
          points.slice(1).map((pt, idx) => {
            const prev = points[idx];
            const dx = pt.x - prev.x;
            const dy = pt.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            return (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: (prev.x + pt.x) / 2 - length / 2,
                  top: (prev.y + pt.y) / 2 - 1,
                  width: length,
                  height: 2.5,
                  borderRadius: 1,
                  backgroundColor: activeColor,
                  transform: [{ rotate: `${angle}rad` }],
                }}
              />
            );
          })}

        {/* Tip Indicator */}
        {points.length > 0 && (
          <View
            style={[
              styles.chartTip,
              {
                left: points[points.length - 1].x - 4,
                top: points[points.length - 1].y - 4,
                backgroundColor: activeColor,
              },
            ]}
          />
        )}

        {(!connected || visibleSamples.length === 0) && (
          <View style={styles.emptyOverlay}>
            <Text style={[styles.emptyLabel, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
              {connected ? 'Čaká sa na prvé vzorky…' : 'Bez aktívneho spojenia'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  windowPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  windowPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  windowPillText: {
    fontSize: 11,
  },
  tilesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sensorTile: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 8,
  },
  sensorTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  sensorTagText: {
    fontSize: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sensorNumber: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  sensorFootnote: {
    fontSize: 12,
  },
  chartBox: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  chartLegend: {
    position: 'absolute',
    top: 8,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  legendText: {
    fontSize: 11,
  },
  chartTip: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 3,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    fontSize: 13,
  },
});
