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
  const { colors, isDark } = useMonitorTheme();

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
        <View>
          <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: fonts.bold }]}>
            Denník komunikácie
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Sieťové udalosti a záznamy protokolu
          </Text>
        </View>

        {events.length > 0 && (
          <Pressable
            onPress={onClearEvents}
            style={({ pressed }) => [
              styles.clearPill,
              { backgroundColor: colors.backgroundSecondary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.clearPillText, { color: colors.red, fontFamily: fonts.medium }]}>
              Zmazať
            </Text>
          </Pressable>
        )}
      </View>

      {/* Pill Filters */}
      <View style={styles.pillsRow}>
        {(['all', 'command', 'error'] as const).map((filter) => {
          const active = eventFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => onEventFilterChange(filter)}
              style={({ pressed }) => [
                styles.filterPill,
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
                {filter === 'all'
                  ? 'Všetky udalosti'
                  : filter === 'command'
                  ? 'Príkazy'
                  : 'Chyby'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Event List */}
      <View style={[styles.listWrapper, { backgroundColor: colors.backgroundSecondary }]}>
        {filtered.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary, fontFamily: fonts.regular }]}>
            Žiadne udalosti pre zvolený filter.
          </Text>
        ) : (
          <ScrollView style={styles.scrollContainer} nestedScrollEnabled>
            {filtered.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.eventRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
                ]}
              >
                <Text style={{ fontSize: 13 }}>{kindIcons[item.kind]}</Text>
                <View style={styles.eventTextGroup}>
                  <Text style={[styles.eventMessage, { color: colors.text, fontFamily: fonts.medium }]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                    {formatTime(item.time)}
                  </Text>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  clearPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearPillText: {
    fontSize: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterPillText: {
    fontSize: 12,
  },
  listWrapper: {
    borderRadius: 20,
    maxHeight: 250,
    overflow: 'hidden',
  },
  emptyText: {
    padding: 20,
    fontSize: 13,
    textAlign: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  eventTextGroup: {
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
});
