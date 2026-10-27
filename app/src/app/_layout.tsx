import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

import {
  MonitorThemeProvider,
  useMonitorTheme,
} from '@/theme/monitor-theme';

function AppStack() {
  const { colors, isDark } = useMonitorTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <MonitorThemeProvider>
      <AppStack />
    </MonitorThemeProvider>
  );
}