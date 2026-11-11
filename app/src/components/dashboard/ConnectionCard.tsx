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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Card Title */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
          Pripojenie k uzlu
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Výber protokolu a adresa rozhrania
        </Text>
      </View>

      {/* iOS Segmented Control for Protocol */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
        {PROTOCOLS.map((p) => {
          const active = protocol === p.id;
          return (
            <Pressable
              key={p.id}
              disabled={!isDisconnected}
              onPress={() => onProtocolChange(p.id)}
              style={[
                styles.segmentItem,
                active && [
                  styles.segmentActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: '#000000',
                  },
                ],
                !isDisconnected && !active && { opacity: 0.4 },
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
                {p.label}
              </Text>
            </Pressable>
          );
        })}

        {/* MQTT (Disabled / Coming Soon) */}
        <View style={[styles.segmentItem, { opacity: 0.45 }]}>
          <Text style={[styles.segmentText, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
            MQTT
          </Text>
        </View>
      </View>

      {/* Grouped Information Row (Apple Inset Style) */}
      <View style={[styles.insetGroup, { backgroundColor: colors.surfaceElevated }]}>
        <View style={styles.insetRow}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Adresa servera
          </Text>
          <Text selectable style={[styles.rowValue, { color: colors.text, fontFamily: fonts.medium }]}>
            {activeUrl}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.line }]} />

        <View style={styles.insetRow}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Cieľový uzol
          </Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {activeUrl.includes('127.0.0.1') ? 'Lokálny simulátor' : 'Hardvér ESP32'}
          </Text>
        </View>
      </View>

      {/* Primary Action Button (iOS Style) */}
      <Pressable
        accessibilityRole="button"
        disabled={outputBusy}
        onPress={isDisconnected ? onConnect : onDisconnect}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: isConnected
              ? isDark
                ? '#2C2C2E'
                : '#E5E5EA'
              : colors.tint,
            opacity: outputBusy ? 0.6 : 1,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        {isConnecting ? (
          <View style={styles.buttonInner}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontFamily: fonts.semibold }]}>
              Pripája sa… (Zrušiť)
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.actionButtonText,
              {
                color: isConnected
                  ? colors.red
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
        <View style={[styles.errorCallout, { backgroundColor: colors.errorSoft }]}>
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
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
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
  actionButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  errorCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
