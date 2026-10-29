import {
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  clearCommandMeasurements,
  measurementsToCsv,
  useCommandMeasurements,
} from '@/services/command-measurements';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';

export function CommandMeasurementsPanel() {
  const measurements = useCommandMeasurements();
  const { colors } = useMonitorTheme();

  const web = Platform.OS === 'web';

  function exportCsv() {
    if (
      !web ||
      measurements.length === 0 ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const csv = measurementsToCsv(measurements);

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `iot-command-measurements-${
        new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
      }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  const bodyStyle = {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
  };

  const valueStyle = {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: 21,
        borderRadius: 16,
        gap: 19,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 15,
          color: colors.text,
        }}
      >
        Merania ovládacích príkazov
      </Text>

      <Text style={bodyStyle}>
        Ukončené pokusy: {measurements.length}.
        Súhrny zahŕňajú všetky uchované relácie.
        Nejde o porovnanie za kontrolovaných podmienok.
      </Text>

      {(['HTTP/REST', 'WebSocket'] as const).map(
        (protocol) => {
          const rows = measurements.filter(
            (row) => row.protocol === protocol
          );

          const successful = rows.filter(
            (row) =>
              row.outcome === 'confirmed' &&
              row.rttMs !== null
          );

          const values = successful.map(
            (row) => row.rttMs as number
          );

          const sorted = [...values].sort(
            (a, b) => a - b
          );

          const middle = Math.floor(
            sorted.length / 2
          );

          const median =
            sorted.length === 0
              ? null
              : sorted.length % 2
                ? sorted[middle]
                : (
                    sorted[middle - 1] +
                    sorted[middle]
                  ) / 2;

          const average =
            values.length === 0
              ? null
              : values.reduce(
                  (sum, value) => sum + value,
                  0
                ) / values.length;

          const timeoutCount = rows.filter(
            (row) => row.outcome === 'timeout'
          ).length;

          const errorCount = rows.filter(
            (row) => row.outcome === 'error'
          ).length;

          const interruptedCount = rows.filter(
            (row) =>
              row.outcome === 'interrupted'
          ).length;

          function ms(value: number | null) {
            return value === null
              ? '—'
              : `${
                  value
                    .toFixed(2)
                    .replace('.', ',')
                } ms`;
          }

          return (
            <View
              key={protocol}
              style={{
                gap: 10,
                paddingTop: 15,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              <Text style={valueStyle}>
                {protocol}
              </Text>

              <Text style={bodyStyle}>
                Potvrdené: {successful.length}
                {' · '}Timeout: {timeoutCount}
                {' · '}Chyba: {errorCount}
                {' · '}Prerušené: {interruptedCount}
              </Text>

              <Text style={valueStyle}>
                Priemer: {ms(average)}
                {' · '}Medián: {ms(median)}
              </Text>

              <Text style={bodyStyle}>
                Minimum:{' '}
                {ms(
                  sorted.length
                    ? sorted[0]
                    : null
                )}
                {' · '}Maximum:{' '}
                {ms(
                  sorted.length
                    ? sorted[sorted.length - 1]
                    : null
                )}
              </Text>
            </View>
          );
        }
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled:
            !web || measurements.length === 0,
        }}
        disabled={
          !web || measurements.length === 0
        }
        onPress={exportCsv}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: colors.olive,
          opacity:
            !web || measurements.length === 0
              ? 0.4
              : 1,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.onAccent,
          }}
        >
          Exportovať merania do CSV
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: measurements.length === 0,
        }}
        disabled={measurements.length === 0}
        onPress={clearCommandMeasurements}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.line,
          opacity:
            measurements.length === 0
              ? 0.4
              : 1,
        }}
      >
        <Text style={valueStyle}>
          Vymazať ukončené merania
        </Text>
      </Pressable>

      <Text style={bodyStyle}>
        RTT sa počíta iba z potvrdených príkazov.
        Prvé meranie sa automaticky nevyraďuje.
        Timeout neznamená preukázanú stratu paketu.
      </Text>

      <Text style={bodyStyle}>
        Údaje sú iba v pamäti aplikácie.
        Pred obnovením stránky ich exportuj.
        CSV export je zatiaľ dostupný iba na webe.
      </Text>
    </View>
  );
}