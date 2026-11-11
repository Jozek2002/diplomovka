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

import type {
  EventFilter,
  EventKind,
  MonitorEvent,
} from '@/components/MonitorInsights';

type EventsLogCardProps = {
  events: MonitorEvent[];
  eventFilter: EventFilter;
  onEventFilterChange: (filter: EventFilter) => void;
  onClearEvents: () => void;
};

const EVENT_LABELS: Record<EventKind, string> = {
  info: 'Info',
  command: 'Príkaz',
  success: 'Potvrdené',
  error: 'Chyba',
};

const FILTERS: {
  id: EventFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: 'Všetky udalosti',
  },
  {
    id: 'command',
    label: 'Príkazy',
  },
  {
    id: 'error',
    label: 'Chyby',
  },
];

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString('sk-SK');
}

export function EventsLogCard({
  events,
  eventFilter,
  onEventFilterChange,
  onClearEvents,
}: EventsLogCardProps) {
  const { colors, isDark } = useMonitorTheme();

  const filteredEvents = events.filter((event) => {
    if (eventFilter === 'all') {
      return true;
    }

    if (eventFilter === 'command') {
      return (
        event.kind === 'command' ||
        event.kind === 'success'
      );
    }

    if (eventFilter === 'error') {
      return event.kind === 'error';
    }

    return true;
  });

  function getEventColor(kind: EventKind): string {
    switch (kind) {
      case 'error':
        return colors.red;

      case 'success':
        return colors.green;

      case 'command':
        return colors.text;

      default:
        return colors.textSecondary;
    }
  }

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
      <View style={styles.cardHeader}>
        <View style={styles.headingGroup}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: colors.text,
                fontFamily: fonts.bold,
              },
            ]}
          >
            Denník komunikácie
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: colors.textSecondary,
                fontFamily: fonts.regular,
              },
            ]}
          >
            Sieťové udalosti a záznamy protokolu
          </Text>
        </View>

        {events.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vymazať denník komunikácie"
            onPress={onClearEvents}
            style={({ pressed }) => [
              styles.clearPill,
              {
                backgroundColor:
                  colors.backgroundSecondary,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.clearPillText,
                {
                  color: colors.red,
                  fontFamily: fonts.medium,
                },
              ]}
            >
              Zmazať
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.pillsRow}>
        {FILTERS.map((filter) => {
          const active = eventFilter === filter.id;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
              }}
              onPress={() =>
                onEventFilterChange(filter.id)
              }
              style={({ pressed }) => [
                styles.filterPill,
                {
                  backgroundColor: active
                    ? isDark
                      ? '#FFFFFF'
                      : '#121417'
                    : colors.backgroundSecondary,
                },
                pressed && styles.pressed,
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
                    fontFamily: active
                      ? fonts.semibold
                      : fonts.medium,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.listWrapper,
          {
            backgroundColor:
              colors.backgroundSecondary,
          },
        ]}
      >
        {filteredEvents.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              {
                color: colors.textTertiary,
                fontFamily: fonts.regular,
              },
            ]}
          >
            Žiadne udalosti pre zvolený filter.
          </Text>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
          >
            {filteredEvents.map((event, index) => (
              <View
                key={event.id}
                style={[
                  styles.eventRow,
                  index > 0 && {
                    borderTopWidth:
                      StyleSheet.hairlineWidth,
                    borderTopColor: colors.line,
                  },
                ]}
              >
                <View
                  style={[
                    styles.eventKindBadge,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.eventKindText,
                      {
                        color: getEventColor(event.kind),
                        fontFamily: fonts.medium,
                      },
                    ]}
                  >
                    {EVENT_LABELS[event.kind]}
                  </Text>
                </View>

                <View style={styles.eventTextGroup}>
                  <Text
                    selectable
                    style={[
                      styles.eventMessage,
                      {
                        color: colors.text,
                        fontFamily: fonts.medium,
                      },
                    ]}
                  >
                    {event.message}
                  </Text>

                  <Text
                    style={[
                      styles.eventTime,
                      {
                        color: colors.textSecondary,
                        fontFamily: fonts.regular,
                      },
                    ]}
                  >
                    {formatTime(event.time)}
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  headingGroup: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },

  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },

  clearPill: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  clearPillText: {
    fontSize: 12,
  },

  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    flexShrink: 1,
  },

  scrollContent: {
    paddingHorizontal: 14,
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 10,
  },

  eventKindBadge: {
    width: 76,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventKindText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },

  eventTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  eventMessage: {
    fontSize: 13,
    lineHeight: 18,
  },

  eventTime: {
    fontSize: 11,
    lineHeight: 15,
  },

  pressed: {
    opacity: 0.7,
  },
});