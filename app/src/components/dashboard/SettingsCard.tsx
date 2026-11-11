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
  { id: 'dark', label: 'Tmavý' },
  { id: 'light', label: 'Svetlý' },
  { id: 'system', label: 'Systém' },
];

export function SettingsCard({
  sampleCount,
  eventCount,
  onClearHistory,
  onClearEvents,
}: SettingsCardProps) {
  const { colors, preference, setPreference } = useMonitorTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
          Nastavenia
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Vzhľad a správa lokálnych dát
        </Text>
      </View>

      {/* Section: Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          MOTÍV
        </Text>

        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
          {THEMES.map((item) => {
            const active = preference === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setPreference(item.id)}
                style={[
                  styles.segmentItem,
                  active && [
                    styles.segmentActive,
                    { backgroundColor: colors.surface },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: active ? colors.text : colors.textSecondary,
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

      {/* Section: Session Data (Apple Inset Grouped) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          LOKÁLNE ÚDAJE V PAMÄTI
        </Text>

        <View style={[styles.insetGroup, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.insetRow}>
            <Text style={[styles.rowLabel, { color: colors.text, fontFamily: fonts.regular }]}>
              Vzorky telemetrie
            </Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {sampleCount} vzoriek
            </Text>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.line }]} />

          <View style={styles.insetRow}>
            <Text style={[styles.rowLabel, { color: colors.text, fontFamily: fonts.regular }]}>
              Udalosti denníka
            </Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {eventCount} záznamov
            </Text>
          </View>
        </View>
      </View>

      {/* Section: Actions */}
      <View style={styles.actionsBlock}>
        <Pressable
          disabled={sampleCount === 0}
          onPress={onClearHistory}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: colors.surfaceElevated, opacity: sampleCount === 0 ? 0.35 : 1 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.red, fontFamily: fonts.medium }]}>
            Vymazať históriu telemetrie
          </Text>
        </Pressable>

        <Pressable
          disabled={eventCount === 0}
          onPress={onClearEvents}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: colors.surfaceElevated, opacity: eventCount === 0 ? 0.35 : 1 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.red, fontFamily: fonts.medium }]}>
            Vymazať denník udalostí
          </Text>
        </Pressable>
      </View>

      {/* System Footer Info */}
      <Text style={[styles.footerText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
        Komparatívna analýza aplikačných protokolov pre riadenie a telemetriu vo Wi-Fi IoT sieťach · ESP32-WROOM-32
      </Text>
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
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.4,
    paddingLeft: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
  },
  insetGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  insetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
  },
  actionsBlock: {
    gap: 8,
    paddingTop: 4,
  },
  actionRow: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingTop: 4,
  },
});
