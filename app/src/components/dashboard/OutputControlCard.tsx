import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
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
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
      ]}
    >
      {/* Top Tag Row (Screen 1 style: e.g. location tag "Brazil") */}
      <View style={styles.topRow}>
        <View style={[styles.badgePill, { backgroundColor: colors.backgroundSecondary }]}>
          <View
            style={[
              styles.badgeDot,
              {
                backgroundColor: !connected
                  ? colors.textTertiary
                  : isOn
                  ? colors.green
                  : colors.textSecondary,
              },
            ]}
          />
          <Text style={[styles.badgeText, { color: colors.text, fontFamily: fonts.medium }]}>
            GPIO 2 · Vstavaná LED
          </Text>
        </View>

        {/* Status chip */}
        <View
          style={[
            styles.stateChip,
            {
              backgroundColor: isOn
                ? isDark
                  ? 'rgba(16, 185, 129, 0.18)'
                  : '#ECFDF5'
                : colors.backgroundSecondary,
            },
          ]}
        >
          <Text
            style={[
              styles.stateChipText,
              {
                color: !connected
                  ? colors.textTertiary
                  : isOn
                  ? colors.green
                  : colors.textSecondary,
                fontFamily: fonts.semibold,
              },
            ]}
          >
            {!connected ? 'Odpojené' : outputBusy ? 'Potvrdzuje sa…' : isOn ? 'Zapnuté' : 'Vypnuté'}
          </Text>
        </View>
      </View>

      {/* Hero Visual Block / Card Body */}
      <View
        style={[
          styles.heroVisualBlock,
          {
            backgroundColor: isOn
              ? isDark
                ? '#242A35'
                : '#1A202C'
              : isDark
              ? colors.surfaceElevated
              : '#F1F3F6',
          },
        ]}
      >
        <View style={styles.heroTextContent}>
          <Text
            style={[
              styles.heroMainTitle,
              {
                color: isOn ? '#FFFFFF' : colors.text,
                fontFamily: fonts.bold,
              },
            ]}
          >
            Digitálny výstup
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              {
                color: isOn ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary,
                fontFamily: fonts.regular,
              },
            ]}
          >
            {!connected
              ? 'Pre zmenu stavu sa najprv pripoj k uzlu'
              : outputBusy
              ? 'Čaká sa na obojsmerné potvrdenie uzla (ACK)…'
              : isOn
              ? 'Výstup je aktívny · Modrá LED dióda svieti (HIGH 3.3V)'
              : 'Výstup je vypnutý · LED dióda nesvieti (LOW 0V)'}
          </Text>
        </View>

        {/* Bottom Hero Capsule Action Button (Screen 1 style: "See more (→)") */}
        <Pressable
          accessibilityRole="button"
          disabled={!connected || outputBusy}
          onPress={() => onOutputChange(!outputEnabled)}
          style={({ pressed }) => [
            styles.capsuleActionButton,
            {
              backgroundColor: isOn
                ? '#FFFFFF'
                : isDark
                ? '#FFFFFF'
                : '#121417',
              opacity: !connected || outputBusy ? 0.45 : 1,
            },
            pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text
            style={[
              styles.capsuleActionText,
              {
                color: isOn
                  ? '#121417'
                  : isDark
                  ? '#121417'
                  : '#FFFFFF',
                fontFamily: fonts.semibold,
              },
            ]}
          >
            {outputBusy
              ? 'Spracovávam príkaz…'
              : !connected
              ? 'Uzol nie je pripojený'
              : isOn
              ? 'Vypnúť výstup'
              : 'Zapnúť výstup'}
          </Text>

          {/* Round Circle Arrow Button */}
          <View
            style={[
              styles.circleArrowBtn,
              {
                backgroundColor: isOn
                  ? '#121417'
                  : isDark
                  ? '#121417'
                  : '#FFFFFF',
              },
            ]}
          >
            {outputBusy ? (
              <ActivityIndicator size="small" color={isOn ? '#FFFFFF' : colors.text} />
            ) : (
              <Text
                style={[
                  styles.arrowIcon,
                  {
                    color: isOn
                      ? '#FFFFFF'
                      : isDark
                      ? '#FFFFFF'
                      : '#121417',
                  },
                ]}
              >
                →
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 7,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
  },
  stateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stateChipText: {
    fontSize: 12,
  },
  heroVisualBlock: {
    borderRadius: 22,
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
    gap: 20,
  },
  heroTextContent: {
    gap: 6,
  },
  heroMainTitle: {
    fontSize: 24,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  capsuleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
  },
  capsuleActionText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  circleArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
});
