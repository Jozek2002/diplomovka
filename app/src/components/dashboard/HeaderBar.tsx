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
import type { Protocol, Status } from '@/types/iot';

export type DashboardTab = 'overview' | 'measurements' | 'events' | 'settings';

type HeaderBarProps = {
  tab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  status: Status;
  protocol: Protocol;
  deviceId?: string;
  desktop: boolean;
};

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Prehľad' },
  { id: 'measurements', label: 'Merania RTT' },
  { id: 'events', label: 'Denník' },
  { id: 'settings', label: 'Nastavenia' },
];

export function HeaderBar({
  tab,
  onTabChange,
  status,
  protocol,
  deviceId,
  desktop,
}: HeaderBarProps) {
  const { colors, isDark, setPreference } = useMonitorTheme();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const statusBg = isConnecting
    ? colors.warningSoft
    : isConnected
    ? colors.successSoft
    : colors.surfaceElevated;

  const statusColor = isConnecting
    ? colors.orange
    : isConnected
    ? colors.green
    : colors.textSecondary;

  const statusLabel = isConnecting
    ? 'Pripája sa…'
    : isConnected
    ? 'Pripojené'
    : 'Odpojené';

  return (
    <View style={[styles.headerContainer, { borderBottomColor: colors.line }]}>
      {/* Top Bar: Title & Status Actions */}
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <View style={styles.deviceRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.deviceSubtitle, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
              {deviceId ? deviceId : 'ESP32 IoT Node'} · Wi-Fi
            </Text>
          </View>
          <Text style={[styles.largeTitle, { color: colors.text, fontFamily: fonts.bold }]}>
            IoT Monitor
          </Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Status Capsule */}
          <View style={[styles.statusCapsule, { backgroundColor: statusBg }]}>
            <View style={[styles.microDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusCapsuleText, { color: statusColor, fontFamily: fonts.semibold }]}>
              {statusLabel}
            </Text>
          </View>

          {/* Theme switch button */}
          <Pressable
            onPress={() => setPreference(isDark ? 'light' : 'dark')}
            style={({ pressed }) => [
              styles.roundButton,
              { backgroundColor: colors.surfaceElevated },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ fontSize: 13 }}>{isDark ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Desktop / iPad iOS Segmented Control */}
      {desktop && (
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onTabChange(item.id)}
                style={[
                  styles.segmentItem,
                  active && [
                    styles.segmentActive,
                    {
                      backgroundColor: colors.surface,
                      shadowColor: '#000000',
                    },
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleColumn: {
    gap: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceSubtitle: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  largeTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCapsuleText: {
    fontSize: 12,
  },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },
  segmentItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
  },
});
