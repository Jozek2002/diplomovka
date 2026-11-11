import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';

type OutputControlCardProps = {
  connected: boolean;
  outputEnabled: boolean;
  outputBusy: boolean;
  onOutputChange: (value: boolean) => void;
};

export function OutputControlCard({
  connected,
  outputEnabled,
  outputBusy,
  onOutputChange,
}: OutputControlCardProps) {
  const { colors, isDark } = useMonitorTheme();

  const isOn = connected && outputEnabled;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn, disabled: !connected || outputBusy }}
      disabled={!connected || outputBusy}
      onPress={() => onOutputChange(!outputEnabled)}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: !connected
            ? colors.surface
            : isOn
            ? isDark
              ? 'rgba(255, 214, 10, 0.12)'
              : '#FFFBEB'
            : colors.surface,
          borderColor: isOn
            ? isDark
              ? 'rgba(255, 214, 10, 0.3)'
              : '#FDE68A'
            : colors.line,
        },
        pressed && connected && !outputBusy && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.topRow}>
        {/* Accessory Round Icon */}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: !connected
                ? colors.surfaceElevated
                : isOn
                ? colors.yellow
                : colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={[
              styles.iconGlyph,
              { color: isOn ? '#000000' : colors.textSecondary },
            ]}
          >
            💡
          </Text>
        </View>

        {/* Switch / Loading */}
        <View style={styles.controlContainer}>
          {outputBusy ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Switch
              accessibilityLabel="Digitálny výstup"
              value={isOn}
              disabled={!connected || outputBusy}
              onValueChange={onOutputChange}
              trackColor={{
                false: isDark ? '#39393D' : '#E5E5EA',
                true: colors.green,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? '#39393D' : '#E5E5EA'}
            />
          )}
        </View>
      </View>

      {/* Label and Status */}
      <View style={styles.infoBlock}>
        <Text
          style={[
            styles.accessoryTitle,
            { color: colors.text, fontFamily: fonts.semibold },
          ]}
        >
          Digitálny výstup
        </Text>

        <Text
          style={[
            styles.statusLabel,
            {
              color: !connected
                ? colors.textTertiary
                : isOn
                ? colors.text
                : colors.textSecondary,
              fontFamily: fonts.medium,
            },
          ]}
        >
          {!connected
            ? 'Zariadenie odpojené'
            : outputBusy
            ? 'Čaká sa na potvrdenie…'
            : isOn
            ? 'Zapnuté (LED svieti)'
            : 'Vypnuté'}
        </Text>

        <Text
          style={[
            styles.footnote,
            { color: colors.textTertiary, fontFamily: fonts.regular },
          ]}
        >
          GPIO 2 · Vstavaná modrá LED dióda
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 20,
  },
  controlContainer: {
    minWidth: 50,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  infoBlock: {
    gap: 2,
  },
  accessoryTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  statusLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 12,
    marginTop: 2,
  },
});
