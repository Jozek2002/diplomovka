import {
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  fonts,
  useMonitorTheme,
} from '@/theme/monitor-theme';
import type { Protocol, Status, Telemetry } from '@/types/iot';
import type { EventFilter, MonitorEvent, Sample } from '@/components/MonitorInsights';

import { HeaderBar, DashboardTab } from '@/components/dashboard/HeaderBar';
import { ConnectionCard } from '@/components/dashboard/ConnectionCard';
import { OutputControlCard } from '@/components/dashboard/OutputControlCard';
import { TelemetryCard } from '@/components/dashboard/TelemetryCard';
import { MeasurementsCard } from '@/components/dashboard/MeasurementsCard';
import { EventsLogCard } from '@/components/dashboard/EventsLogCard';
import { SettingsCard } from '@/components/dashboard/SettingsCard';

type Props = {
  protocol: Protocol;
  status: Status;
  telemetry: Telemetry | null;
  outputEnabled: boolean;
  outputBusy: boolean;
  error: string | null;
  samples: Sample[];
  events: MonitorEvent[];
  onProtocolChange: (value: Protocol) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOutputChange: (value: boolean) => void;
  onClearHistory: () => void;
  onClearEvents: () => void;
};

const MOBILE_TABS: { id: DashboardTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Prehľad', icon: '🏠' },
  { id: 'measurements', label: 'Merania', icon: '📊' },
  { id: 'events', label: 'Denník', icon: '📋' },
  { id: 'settings', label: 'Nastavenia', icon: '⚙️' },
];

export function MonitorDashboard({
  protocol,
  status,
  telemetry,
  outputEnabled,
  outputBusy,
  error,
  samples,
  events,
  onProtocolChange,
  onConnect,
  onDisconnect,
  onOutputChange,
  onClearHistory,
  onClearEvents,
}: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useMonitorTheme();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');

  const desktop = width >= 920;
  const connected = status === 'connected';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.appleCenteredShell}>
        {/* Apple iOS Style Header */}
        <HeaderBar
          tab={activeTab}
          onTabChange={setActiveTab}
          status={status}
          protocol={protocol}
          deviceId={telemetry?.deviceId}
          desktop={desktop}
        />

        {/* Content Body */}
        {desktop ? (
          /* ================= DESKTOP / IPAD 2-COLUMN VIEW ================= */
          <View style={styles.desktopLayout}>
            {/* Left Column (360px): Access Control & Connection */}
            <ScrollView
              style={styles.leftColumn}
              contentContainerStyle={styles.columnInner}
              showsVerticalScrollIndicator={false}
            >
              <OutputControlCard
                connected={connected}
                outputEnabled={outputEnabled}
                outputBusy={outputBusy}
                onOutputChange={onOutputChange}
              />

              <ConnectionCard
                protocol={protocol}
                status={status}
                error={error}
                outputBusy={outputBusy}
                onProtocolChange={onProtocolChange}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
              />
            </ScrollView>

            {/* Right Column: Dynamic Inspector */}
            <ScrollView
              style={styles.rightColumn}
              contentContainerStyle={styles.columnInner}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'overview' && (
                <>
                  <TelemetryCard
                    telemetry={telemetry}
                    samples={samples}
                    connected={connected}
                  />
                  <MeasurementsCard />
                  <EventsLogCard
                    events={events}
                    eventFilter={eventFilter}
                    onEventFilterChange={setEventFilter}
                    onClearEvents={onClearEvents}
                  />
                </>
              )}

              {activeTab === 'measurements' && (
                <>
                  <MeasurementsCard />
                  <TelemetryCard
                    telemetry={telemetry}
                    samples={samples}
                    connected={connected}
                  />
                </>
              )}

              {activeTab === 'events' && (
                <EventsLogCard
                  events={events}
                  eventFilter={eventFilter}
                  onEventFilterChange={setEventFilter}
                  onClearEvents={onClearEvents}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsCard
                  sampleCount={samples.length}
                  eventCount={events.length}
                  onClearHistory={onClearHistory}
                  onClearEvents={onClearEvents}
                />
              )}
            </ScrollView>
          </View>
        ) : (
          /* ================= IPHONE / MOBILE STACK ================= */
          <View style={styles.mobileLayout}>
            <ScrollView
              style={styles.mobileScroll}
              contentContainerStyle={styles.mobileInner}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'overview' && (
                <>
                  <OutputControlCard
                    connected={connected}
                    outputEnabled={outputEnabled}
                    outputBusy={outputBusy}
                    onOutputChange={onOutputChange}
                  />

                  <TelemetryCard
                    telemetry={telemetry}
                    samples={samples}
                    connected={connected}
                  />

                  <ConnectionCard
                    protocol={protocol}
                    status={status}
                    error={error}
                    outputBusy={outputBusy}
                    onProtocolChange={onProtocolChange}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                  />
                </>
              )}

              {activeTab === 'measurements' && <MeasurementsCard />}

              {activeTab === 'events' && (
                <EventsLogCard
                  events={events}
                  eventFilter={eventFilter}
                  onEventFilterChange={setEventFilter}
                  onClearEvents={onClearEvents}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsCard
                  sampleCount={samples.length}
                  eventCount={events.length}
                  onClearHistory={onClearHistory}
                  onClearEvents={onClearEvents}
                />
              )}
            </ScrollView>

            {/* Native Apple iOS Bottom Tab Bar */}
            <View
              style={[
                styles.bottomTabBar,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.line,
                },
              ]}
            >
              {MOBILE_TABS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setActiveTab(t.id)}
                    style={({ pressed }) => [
                      styles.tabItem,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                    <Text
                      style={[
                        styles.tabItemLabel,
                        {
                          color: active ? colors.tint : colors.textSecondary,
                          fontFamily: active ? fonts.semibold : fonts.medium,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  appleCenteredShell: {
    flex: 1,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 18,
    gap: 18,
  },
  leftColumn: {
    width: 360,
    flexGrow: 0,
    flexShrink: 0,
  },
  rightColumn: {
    flex: 1,
  },
  columnInner: {
    gap: 16,
    paddingBottom: 30,
  },
  mobileLayout: {
    flex: 1,
  },
  mobileScroll: {
    flex: 1,
  },
  mobileInner: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabItemLabel: {
    fontSize: 10,
  },
});
