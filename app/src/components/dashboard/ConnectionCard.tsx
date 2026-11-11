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
import type { Protocol, Status } from '@/types/iot';
import { HTTP_URL } from '@/services/http-client';
import { WS_URL } from '@/services/websocket-client';

type ConnectionCardProps = {
  protocol: Protocol;
  status: Status;
  error: string | null;
  outputBusy: boolean;
  onProtocolChange: (p: Protocol) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

const PROTOCOLS: { id: Protocol; label: string }[] = [
  { id: 'HTTP/REST', label: 'HTTP / REST' },
  { id: 'WebSocket', label: 'WebSocket' },
];

export function ConnectionCard({
  protocol,
  status,
  error,
  outputBusy,
  onProtocolChange,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const { colors, isDark } = useMonitorTheme();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected';

  const activeUrl = protocol === 'HTTP/REST' ? HTTP_URL : WS_URL;

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
      {/* Title & Section Label (Screen 1: "Select your next trip") */}
      <View style={styles.headerBlock}>
        <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: fonts.bold }]}>
          Komunikačný protokol
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Vyber protokol pre riadenie a zber dát
        </Text>
      </View>

      {/* Pill Selector (Screen 1 style: "Asia | Europe | South America") */}
      <View style={styles.pillRow}>
        {PROTOCOLS.map((p) => {
          const active = protocol === p.id;
          return (
            <Pressable
              key={p.id}
              disabled={!isDisconnected}
              onPress={() => onProtocolChange(p.id)}
              style={({ pressed }) => [
                styles.filterPill,
                {
                  backgroundColor: active
                    ? isDark
                      ? '#FFFFFF'
                      : '#121417'
                    : colors.backgroundSecondary,
                  borderColor: active
                    ? 'transparent'
                    : colors.line,
                  opacity: !isDisconnected && !active ? 0.4 : 1,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
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
                {p.label}
              </Text>
            </Pressable>
          );
        })}

        {/* MQTT Pill */}
        <View
          style={[
            styles.filterPill,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.line,
              opacity: 0.45,
            },
          ]}
        >
          <Text style={[styles.filterPillText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
            MQTT (QoS 0/1/2)
          </Text>
        </View>
      </View>

      {/* Address & Target Card */}
      <View style={[styles.addressBox, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.addressLeft}>
          <Text style={[styles.addressLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
            Cieľový endpoint servera
          </Text>
          <Text selectable style={[styles.addressValue, { color: colors.text, fontFamily: fonts.semibold }]}>
            {activeUrl}
          </Text>
        </View>

        <View style={[styles.targetBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.targetBadgeText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
            {activeUrl.includes('127.0.0.1') ? 'Simulátor' : 'ESP32'}
          </Text>
        </View>
      </View>

      {/* Main Full-width Capsule Action Button (Screen 3 style: "Book a tour") */}
      <Pressable
        accessibilityRole="button"
        disabled={outputBusy}
        onPress={isDisconnected ? onConnect : onDisconnect}
        style={({ pressed }) => [
          styles.mainCapsuleButton,
          {
            backgroundColor: isConnected
              ? isDark
                ? '#242A35'
                : '#E2E6EC'
              : isDark
              ? '#FFFFFF'
              : '#121417',
            opacity: outputBusy ? 0.6 : 1,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        {isConnecting ? (
          <View style={styles.buttonInnerRow}>
            <ActivityIndicator size="small" color={isDark ? '#121417' : '#FFFFFF'} />
            <Text
              style={[
                styles.mainButtonText,
                { color: isDark ? '#121417' : '#FFFFFF', fontFamily: fonts.semibold },
              ]}
            >
              Pripája sa k uzlu… (Zrušiť)
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.mainButtonText,
              {
                color: isConnected
                  ? colors.red
                  : isDark
                  ? '#121417'
                  : '#FFFFFF',
                fontFamily: fonts.semibold,
              },
            ]}
          >
            {isConnected ? 'Odpojiť zariadenie' : 'Pripojiť k uzlu'}
          </Text>
        )}
      </Pressable>

      {/* Error Callout */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.errorSoft }]}>
          <Text style={{ fontSize: 14 }}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.red, fontFamily: fonts.regular }]}>
            {error}
          </Text>
        </View>
      )}
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
  headerBlock: {
    gap: 3,
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999, // Plné zaoblenie pill
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
  },
  addressLeft: {
    gap: 3,
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
  },
  addressValue: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  targetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  targetBadgeText: {
    fontSize: 11,
  },
  mainCapsuleButton: {
    height: 52,
    borderRadius: 999, // Plné zaoblenie
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainButtonText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
