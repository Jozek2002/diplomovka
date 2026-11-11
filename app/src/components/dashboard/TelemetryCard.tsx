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

  const activeColor = activeMetric === 'temperature' ? colors.orange : colors.tint;
  const unit = activeMetric === 'temperature' ? '°C' : '%';

  // Sparkline coordinates
  const chartHeight = 100;
  const paddingY = 8;
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Card Header with Segmented Window Control */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
            Telemetrické senzory
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {connected
              ? `Vzorka #${telemetry?.sequence ?? '—'} · 1 vzorka za sekundu`
              : 'Zariadenie odpojené'}
          </Text>
        </View>

        {/* Window Selector */}
        <View style={[styles.windowSelector, { backgroundColor: colors.surfaceElevated }]}>
          {([15, 30, 60] as const).map((w) => {
            const active = windowSize === w;
            return (
              <Pressable
                key={w}
                onPress={() => setWindowSize(w)}
                style={[
                  styles.windowOption,
                  active && [
                    styles.windowOptionActive,
                    { backgroundColor: colors.surface },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.windowText,
                    {
                      color: active ? colors.text : colors.textSecondary,
                      fontFamily: active ? fonts.semibold : fonts.medium,
                    },
                  ]}
                >
                  {w} s
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Apple HomeKit Climate Tiles */}
      <View style={styles.tilesRow}>
        {/* Temperature Tile */}
        <Pressable
          onPress={() => setActiveMetric('temperature')}
          style={({ pressed }) => [
            styles.climateTile,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor:
                activeMetric === 'temperature'
                  ? colors.orange
                  : 'transparent',
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.tileTop}>
            <View
              style={[
                styles.tileIconCircle,
                {
                  backgroundColor:
                    activeMetric === 'temperature'
                      ? colors.orangeSoft
                      : colors.surfaceHighlight,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>🌡️</Text>
            </View>
            <Text style={[styles.tileLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              Teplota
            </Text>
          </View>

          <Text
            style={[
              styles.tileValue,
              {
                color: telemetry ? colors.text : colors.textTertiary,
                fontFamily: fonts.bold,
              },
            ]}
          >
            {telemetry ? `${formatVal(telemetry.temperature)} °C` : '—'}
          </Text>

          <Text style={[styles.tileFootnote, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {stats && activeMetric === 'temperature'
              ? `Priemer ${formatVal(stats.avg)} °C`
              : 'Rozsah 22–26 °C'}
          </Text>
        </Pressable>

        {/* Humidity Tile */}
        <Pressable
          onPress={() => setActiveMetric('humidity')}
          style={({ pressed }) => [
            styles.climateTile,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor:
                activeMetric === 'humidity'
                  ? colors.tint
                  : 'transparent',
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.tileTop}>
            <View
              style={[
                styles.tileIconCircle,
                {
                  backgroundColor:
                    activeMetric === 'humidity'
                      ? colors.httpSoft
                      : colors.surfaceHighlight,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>💧</Text>
            </View>
            <Text style={[styles.tileLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              Vlhkosť
            </Text>
          </View>

          <Text
            style={[
              styles.tileValue,
              {
                color: telemetry ? colors.text : colors.textTertiary,
                fontFamily: fonts.bold,
              },
            ]}
          >
            {telemetry ? `${formatVal(telemetry.humidity)} %` : '—'}
          </Text>

          <Text style={[styles.tileFootnote, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {stats && activeMetric === 'humidity'
              ? `Priemer ${formatVal(stats.avg)} %`
              : 'Rozsah 40–55 %'}
          </Text>
        </Pressable>
      </View>

      {/* Minimalist Apple Stocks/Health Style Chart */}
      <View
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        style={[
          styles.chartWrapper,
          {
            backgroundColor: colors.surfaceElevated,
            height: chartHeight,
          },
        ]}
      >
        {/* Subtle Scale Label */}
        {stats && (
          <View style={styles.chartHeaderLabels}>
            <Text style={[styles.chartRangeText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              {activeMetric === 'temperature' ? 'Priebeh teploty' : 'Priebeh vlhkosti'}
            </Text>
            <Text style={[styles.chartRangeText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              Min {formatVal(stats.min)} {unit} · Max {formatVal(stats.max)} {unit}
            </Text>
          </View>
        )}

        {/* Clean Line Segments */}
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

        {/* Tip Dot */}
        {points.length > 0 && (
          <View
            style={[
              styles.tipDot,
              {
                left: points[points.length - 1].x - 4,
                top: points[points.length - 1].y - 4,
                backgroundColor: activeColor,
              },
            ]}
          />
        )}

        {/* Empty state */}
        {(!connected || visibleSamples.length === 0) && (
          <View style={styles.chartPlaceholder}>
            <Text style={[styles.placeholderText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
              {connected ? 'Čaká sa na vzorky…' : 'Bez aktívneho spojenia'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  windowSelector: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
  },
  windowOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  windowOptionActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  windowText: {
    fontSize: 12,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  climateTile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tileIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 13,
  },
  tileValue: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  tileFootnote: {
    fontSize: 12,
  },
  chartWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  chartHeaderLabels: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  chartRangeText: {
    fontSize: 11,
  },
  tipDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 3,
  },
  chartPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 13,
  },
});
