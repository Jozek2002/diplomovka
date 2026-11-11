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
import type { ThemePreference } from '@/theme/monitor-theme';

type SettingsCardProps = {
  sampleCount: number;
  eventCount: number;
  onClearHistory: () => void;
  onClearEvents: () => void;
};

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Svetlý (Light)' },
  { id: 'dark', label: 'Tmavý (Dark)' },
  { id: 'system', label: 'Systémový' },
];

export function SettingsCard({
  sampleCount,
  eventCount,
  onClearHistory,
  onClearEvents,
}: SettingsCardProps) {
  const { colors, preference, setPreference, isDark } = useMonitorTheme();

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
        <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: fonts.bold }]}>
          Nastavenia aplikácie
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Prispôsobenie vzhľadu a správa lokálnych dát
        </Text>
      </View>

      {/* Theme Choice Pills */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.blockTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
          Farebný motív rozhrania
        </Text>

        <View style={styles.pillsRow}>
          {THEMES.map((item) => {
            const active = preference === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setPreference(item.id)}
                style={({ pressed }) => [
                  styles.themePill,
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
                    styles.themePillText,
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
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Memory Status Box */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.blockTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
          Stav dočasnej pamäte relácie
        </Text>

        <View style={[styles.memoryBox, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.memoryRow}>
            <Text style={[styles.memoryLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Vzorky telemetrie
            </Text>
            <Text style={[styles.memoryValue, { color: colors.text, fontFamily: fonts.semibold }]}>
              {sampleCount} záznamov
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.memoryRow}>
            <Text style={[styles.memoryLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Udalosti v denníku
            </Text>
            <Text style={[styles.memoryValue, { color: colors.text, fontFamily: fonts.semibold }]}>
              {eventCount} záznamov
            </Text>
          </View>
        </View>
      </View>

      {/* Destructive Clear Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          disabled={sampleCount === 0}
          onPress={onClearHistory}
          style={({ pressed }) => [
            styles.actionPillButton,
            {
              backgroundColor: colors.backgroundSecondary,
              opacity: sampleCount === 0 ? 0.4 : 1,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.actionBtnText, { color: colors.red, fontFamily: fonts.medium }]}>
            Vymazať telemetriu
          </Text>
        </Pressable>

        <Pressable
          disabled={eventCount === 0}
          onPress={onClearEvents}
          style={({ pressed }) => [
            styles.actionPillButton,
            {
              backgroundColor: colors.backgroundSecondary,
              opacity: eventCount === 0 ? 0.4 : 1,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.actionBtnText, { color: colors.red, fontFamily: fonts.medium }]}>
            Vymazať denník
          </Text>
        </Pressable>
      </View>

      {/* Footer Info */}
      <Text style={[styles.footerText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
        Komparatívna analýza aplikačných protokolov pre riadenie a telemetriu vo Wi-Fi IoT sieťach · ESP32-WROOM-32
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeader: {
    gap: 2,
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  sectionBlock: {
    gap: 8,
  },
  blockTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  themePill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  themePillText: {
    fontSize: 13,
  },
  memoryBox: {
    padding: 14,
    borderRadius: 18,
    gap: 10,
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryLabel: {
    fontSize: 13,
  },
  memoryValue: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPillButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingTop: 4,
  },
});
