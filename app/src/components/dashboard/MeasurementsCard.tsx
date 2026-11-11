import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';
import {
  clearCommandMeasurements,
  measurementsToCsv,
  useCommandMeasurements,
} from '@/services/command-measurements';

export function MeasurementsCard() {
  const measurements = useCommandMeasurements();
  const { colors, isDark } = useMonitorTheme();
  const web = Platform.OS === 'web';

  function exportCsv() {
    if (!web || measurements.length === 0 || typeof document === 'undefined') {
      return;
    }

    const csv = measurementsToCsv(measurements);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `iot-rtt-measurements-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function formatMs(val: number | null) {
    if (val === null || val === undefined) return '—';
    return `${val.toFixed(1).replace('.', ',')} ms`;
  }

  const confirmedRows = measurements.filter(
    (m) => m.outcome === 'confirmed' && m.rttMs !== null
  );
  const rtts = confirmedRows.map((m) => m.rttMs as number);
  const sorted = [...rtts].sort((a, b) => a - b);

  const avg =
    rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : null;

  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

  const min = sorted.length ? sorted[0] : null;
  const max = sorted.length ? sorted[sorted.length - 1] : null;

  const httpCount = measurements.filter((m) => m.protocol === 'HTTP/REST').length;
  const wsCount = measurements.filter((m) => m.protocol === 'WebSocket').length;

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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: fonts.bold }]}>
            Komparatívna analýza RTT
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Experimentálne merania latencie riadiacich príkazov · {measurements.length} pokusov
          </Text>
        </View>

        {measurements.length > 0 && (
          <Pressable
            onPress={clearCommandMeasurements}
            style={({ pressed }) => [
              styles.clearPillBtn,
              { backgroundColor: colors.backgroundSecondary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.clearBtnText, { color: colors.red, fontFamily: fonts.medium }]}>
              Vymazať
            </Text>
          </Pressable>
        )}
      </View>

      {/* Highlight Average Tile */}
      <View style={[styles.summaryTile, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          Priemerná latencia (Round-Trip Time)
        </Text>

        <Text style={[styles.largeAvgNumber, { color: colors.text, fontFamily: fonts.bold }]}>
          {formatMs(avg)}
        </Text>

        {/* 3 Metric Sub-stats */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.itemLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Minimum
            </Text>
            <Text style={[styles.itemVal, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(min)}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.line }]} />

          <View style={styles.metricItem}>
            <Text style={[styles.itemLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Medián (P50)
            </Text>
            <Text style={[styles.itemVal, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(median)}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.line }]} />

          <View style={styles.metricItem}>
            <Text style={[styles.itemLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Maximum
            </Text>
            <Text style={[styles.itemVal, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(max)}
            </Text>
          </View>
        </View>

        <View style={styles.countsFooter}>
          <Text style={[styles.countsFooterText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
            HTTP/REST: {httpCount} meraní · WebSocket: {wsCount} meraní
          </Text>
        </View>
      </View>

      {/* History Itinerary Cards (Screen 3 style: "Day 1 / Day 2" stacked cards) */}
      <View style={styles.historyBlock}>
        <Text style={[styles.historyHeading, { color: colors.text, fontFamily: fonts.semibold }]}>
          Posledné vykonané príkazy
        </Text>

        {measurements.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.emptyText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
              Zatiaľ neboli vykonané žiadne ovládacie príkazy.
            </Text>
          </View>
        ) : (
          measurements
            .slice(-4)
            .reverse()
            .map((item) => {
              const isSuccess = item.outcome === 'confirmed';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.commandItineraryCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <View style={styles.cmdCardLeft}>
                    <View style={[styles.statusIconCircle, { backgroundColor: colors.surface }]}>
                      <Text style={{ fontSize: 13 }}>
                        {isSuccess ? '✓' : item.outcome === 'timeout' ? '⏱' : '⚠️'}
                      </Text>
                    </View>

                    <View style={styles.cmdInfo}>
                      <Text style={[styles.cmdTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
                        {item.requestedOutput ? 'Zapnutie výstupu' : 'Vypnutie výstupu'}
                      </Text>
                      <Text style={[styles.cmdSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                        {item.protocol} · {new Date(item.sentAt).toLocaleTimeString('sk-SK')}
                      </Text>
                    </View>
                  </View>

                  {/* Latency Pill on the Right */}
                  <View
                    style={[
                      styles.rttBadge,
                      {
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rttBadgeText,
                        {
                          color: isSuccess ? colors.green : colors.red,
                          fontFamily: fonts.semibold,
                        },
                      ]}
                    >
                      {item.rttMs !== null ? `${item.rttMs.toFixed(1)} ms` : item.outcome}
                    </Text>
                  </View>
                </View>
              );
            })
        )}
      </View>

      {/* Screen 3 Style "Book a tour" Black Capsule Export Button */}
      <Pressable
        accessibilityRole="button"
        disabled={!web || measurements.length === 0}
        onPress={exportCsv}
        style={({ pressed }) => [
          styles.exportCapsuleButton,
          {
            backgroundColor: isDark ? '#FFFFFF' : '#121417',
            opacity: !web || measurements.length === 0 ? 0.4 : 1,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        <Text
          style={[
            styles.exportButtonText,
            {
              color: isDark ? '#121417' : '#FFFFFF',
              fontFamily: fonts.semibold,
            },
          ]}
        >
          Exportovať merania do CSV
        </Text>
      </Pressable>
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
  clearPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearBtnText: {
    fontSize: 12,
  },
  summaryTile: {
    padding: 18,
    borderRadius: 22,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
  },
  largeAvgNumber: {
    fontSize: 34,
    letterSpacing: -0.8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  itemLabel: {
    fontSize: 11,
  },
  itemVal: {
    fontSize: 15,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  countsFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  countsFooterText: {
    fontSize: 11,
  },
  historyBlock: {
    gap: 10,
  },
  historyHeading: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  commandItineraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  cmdCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cmdInfo: {
    gap: 2,
  },
  cmdTitle: {
    fontSize: 14,
  },
  cmdSubtitle: {
    fontSize: 11,
  },
  rttBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rttBadgeText: {
    fontSize: 12,
  },
  exportCapsuleButton: {
    height: 52,
    borderRadius: 999, // Plné zaoblenie (Screen 3 style)
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
