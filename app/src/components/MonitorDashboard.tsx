import {
  useState,
} from 'react';

import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {
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

  const desktop = width >= 960;
  const connected = status === 'connected';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.appShell}>
        {/* Header with Top Pill Navigation Tabs */}
        <HeaderBar
          tab={activeTab}
          onTabChange={setActiveTab}
          status={status}
          protocol={protocol}
          deviceId={telemetry?.deviceId}
          desktop={desktop}
        />

        {/* Content Body (No bottom bar for now as requested) */}
        {desktop ? (
          /* ================= DESKTOP 2-COLUMN LAYOUT ================= */
          <View style={styles.desktopLayout}>
            {/* Left Column (Hero Card + Connection) */}
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

            {/* Right Column (Dynamic content based on top pills) */}
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
          /* ================= SINGLE COLUMN RESPONSIVE VIEW ================= */
          <ScrollView
            style={styles.singleColumnScroll}
            contentContainerStyle={styles.singleColumnInner}
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  appShell: {
    flex: 1,
    maxWidth: 1060,
    width: '100%',
    alignSelf: 'center',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 18,
  },
  leftColumn: {
    width: 380,
    flexGrow: 0,
    flexShrink: 0,
  },
  rightColumn: {
    flex: 1,
  },
  columnInner: {
    gap: 16,
    paddingBottom: 40,
  },
  singleColumnScroll: {
    flex: 1,
  },
  singleColumnInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 40,
  },
});
