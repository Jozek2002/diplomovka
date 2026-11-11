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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
            Merania latencie (RTT)
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Odozva ovládacích príkazov · {measurements.length} pokusov
          </Text>
        </View>

        {/* Clear Button */}
        {measurements.length > 0 && (
          <Pressable
            onPress={clearCommandMeasurements}
            style={({ pressed }) => [
              styles.textBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.textBtnLabel, { color: colors.red, fontFamily: fonts.medium }]}>
              Vymazať
            </Text>
          </Pressable>
        )}
      </View>

      {/* Apple Health Style Highlight Tile */}
      <View style={[styles.healthTile, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={[styles.healthTileLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          Priemerný Round-Trip Time
        </Text>

        <Text style={[styles.healthLargeNumber, { color: colors.text, fontFamily: fonts.bold }]}>
          {formatMs(avg)}
        </Text>

        {/* 3 Metric Columns */}
        <View style={styles.subStatsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statColLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Minimum
            </Text>
            <Text style={[styles.statColValue, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(min)}
            </Text>
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.line }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statColLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Medián (P50)
            </Text>
            <Text style={[styles.statColValue, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(median)}
            </Text>
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.line }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statColLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Maximum
            </Text>
            <Text style={[styles.statColValue, { color: colors.text, fontFamily: fonts.semibold }]}>
              {formatMs(max)}
            </Text>
          </View>
        </View>

        {/* Protocol breakdown subtitle */}
        <View style={styles.protoBadgeRow}>
          <Text style={[styles.breakdownText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
            HTTP: {httpCount} požiadaviek · WebSocket: {wsCount} požiadaviek
          </Text>
        </View>
      </View>

      {/* Recent Commands Grouped Inset List */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          HISTÓRIA POSLEDNÝCH PRÍKAZOV
        </Text>
      </View>

      <View style={[styles.insetGroup, { backgroundColor: colors.surfaceElevated }]}>
        {measurements.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
            Zatiaľ neboli vykonané žiadne merania.
          </Text>
        ) : (
          measurements
            .slice(-4)
            .reverse()
            .map((item, index) => {
              const isSuccess = item.outcome === 'confirmed';
              return (
                <View key={item.id}>
                  {index > 0 && <View style={[styles.separator, { backgroundColor: colors.line }]} />}
                  <View style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={{ fontSize: 14 }}>
                        {isSuccess ? '✓' : item.outcome === 'timeout' ? '⏱' : '⚠️'}
                      </Text>
                      <View>
                        <Text style={[styles.historyAction, { color: colors.text, fontFamily: fonts.medium }]}>
                          {item.requestedOutput ? 'Zapnutie výstupu' : 'Vypnutie výstupu'}
                        </Text>
                        <Text style={[styles.historyMeta, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                          {item.protocol} · {new Date(item.sentAt).toLocaleTimeString('sk-SK')}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.latencyPill,
                        {
                          backgroundColor: isSuccess
                            ? isDark
                              ? 'rgba(48, 209, 88, 0.15)'
                              : '#E8F5E9'
                            : isDark
                            ? 'rgba(255, 69, 58, 0.15)'
                            : '#FFEBEE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.latencyText,
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
                </View>
              );
            })
        )}
      </View>

      {/* iOS Action Button (Export CSV) */}
      <Pressable
        disabled={!web || measurements.length === 0}
        onPress={exportCsv}
        style={({ pressed }) => [
          styles.exportButton,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.line,
            opacity: !web || measurements.length === 0 ? 0.4 : 1,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.exportButtonText, { color: colors.tint, fontFamily: fonts.semibold }]}>
          Exportovať merania do CSV
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
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
  textBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textBtnLabel: {
    fontSize: 13,
  },
  healthTile: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  healthTileLabel: {
    fontSize: 13,
  },
  healthLargeNumber: {
    fontSize: 32,
    letterSpacing: -1,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statColLabel: {
    fontSize: 11,
  },
  statColValue: {
    fontSize: 14,
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  protoBadgeRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  breakdownText: {
    fontSize: 11,
  },
  sectionHeader: {
    paddingTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  insetGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  emptyText: {
    padding: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyAction: {
    fontSize: 14,
  },
  historyMeta: {
    fontSize: 12,
  },
  latencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  latencyText: {
    fontSize: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  exportButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: 14,
  },
});
