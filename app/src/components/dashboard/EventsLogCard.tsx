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
import type { EventFilter, EventKind, MonitorEvent } from '@/components/MonitorInsights';

type EventsLogCardProps = {
  events: MonitorEvent[];
  eventFilter: EventFilter;
  onEventFilterChange: (f: EventFilter) => void;
  onClearEvents: () => void;
};

function formatTime(t: number) {
  return new Date(t).toLocaleTimeString('sk-SK');
}

export function EventsLogCard({
  events,
  eventFilter,
  onEventFilterChange,
  onClearEvents,
}: EventsLogCardProps) {
  const { colors } = useMonitorTheme();

  const filtered = events.filter((e) => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'command') return e.kind === 'command' || e.kind === 'success';
    if (eventFilter === 'error') return e.kind === 'error';
    return true;
  });

  const kindIcons: Record<EventKind, string> = {
    info: 'ℹ️',
    command: '↗️',
    success: '✅',
    error: '⚠️',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.semibold }]}>
            Denník komunikácie
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Záznam sieťových stavov a udalostí
          </Text>
        </View>

        {events.length > 0 && (
          <Pressable
            onPress={onClearEvents}
            style={({ pressed }) => [
              styles.textBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.textBtnLabel, { color: colors.red, fontFamily: fonts.medium }]}>
              Zmazať
            </Text>
          </Pressable>
        )}
      </View>

      {/* iOS Segmented Filter */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
        {(['all', 'command', 'error'] as const).map((filter) => {
          const active = eventFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => onEventFilterChange(filter)}
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
                {filter === 'all'
                  ? 'Všetky'
                  : filter === 'command'
                  ? 'Príkazy'
                  : 'Chyby'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Inset Grouped Events List */}
      <View style={[styles.insetGroup, { backgroundColor: colors.surfaceElevated }]}>
        {filtered.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
            Žiadne udalosti pre zvolený filter.
          </Text>
        ) : (
          <ScrollView style={styles.scrollList} nestedScrollEnabled>
            {filtered.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={[styles.separator, { backgroundColor: colors.line }]} />}
                <View style={styles.eventRow}>
                  <Text style={{ fontSize: 13 }}>{kindIcons[item.kind]}</Text>
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventMessage, { color: colors.text, fontFamily: fonts.regular }]}>
                      {item.message}
                    </Text>
                    <Text style={[styles.eventTime, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                      {formatTime(item.time)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
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
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 9,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
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
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 240,
  },
  emptyText: {
    padding: 20,
    fontSize: 13,
    textAlign: 'center',
  },
  scrollList: {
    paddingHorizontal: 14,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  eventContent: {
    flex: 1,
    gap: 2,
  },
  eventMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  eventTime: {
    fontSize: 11,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
