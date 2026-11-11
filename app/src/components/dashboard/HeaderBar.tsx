import {
  Pressable,
  ScrollView,
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
  { id: 'overview', label: 'Prehľad & Riadenie' },
  { id: 'measurements', label: 'Merania RTT' },
  { id: 'events', label: 'Denník udalostí' },
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

  const statusLabel = isConnecting
    ? 'Pripája sa…'
    : isConnected
    ? 'Online'
    : 'Offline';

  return (
    <View style={styles.headerContainer}>
      {/* Top Profile / App Header (Screen 1 style: "Hello, Vanessa" -> "IoT Monitor") */}
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <Text
            accessibilityRole="header"
            style={[
              styles.mainTitle,
              {
                color: colors.text,
                fontFamily: fonts.bold,
                fontSize: desktop ? 26 : 23,
                lineHeight: desktop ? 32 : 29,
              },
            ]}
          >
            IoT Monitor
          </Text>

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.welcomeSub,
              {
                color: colors.textSecondary,
                fontFamily: fonts.medium,
              },
            ]}
          >
            {deviceId
              ? `${deviceId} · Wi-Fi Node`
              : 'ESP32-WROOM-32 · Wi-Fi Node'}
          </Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Status Capsule Indicator */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isConnected
                    ? colors.green
                    : isConnecting
                    ? colors.orange
                    : colors.textTertiary,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.text, fontFamily: fonts.medium }]}>
              {statusLabel}
            </Text>
          </View>

          {/* Theme switch button */}
          <Pressable
            accessibilityLabel="Prepnúť motív"
            onPress={() => setPreference(isDark ? 'light' : 'dark')}
            style={({ pressed }) => [
              styles.avatarButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{isDark ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Pill Navigation Tabs (Screen 3 style: "Tour schedule | Accommodation | Booking details") */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={({ pressed }) => [
                styles.pillButton,
                {
                  backgroundColor: active
                    ? isDark
                      ? '#FFFFFF'
                      : '#121417'
                    : isDark
                    ? colors.surfaceElevated
                    : '#FFFFFF',
                  borderColor: active
                    ? 'transparent'
                    : colors.line,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  welcomeSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  mainTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999, // Plné zaoblenie pill
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  pillText: {
    fontSize: 13,
  },
});
