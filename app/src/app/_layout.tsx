import { Stack } from 'expo-router';

import {
  ActivityIndicator,
  StatusBar,
  Text,
  View,
} from 'react-native';

import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import {
  MonitorThemeProvider,
  useMonitorTheme,
} from '@/theme/monitor-theme';

function AppStack() {
  const { colors, isDark } = useMonitorTheme();

  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!loaded || error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        {error ? (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              Font sa nepodarilo načítať
            </Text>

            <Text
              selectable
              style={{
                color: colors.muted,
                textAlign: 'center',
              }}
            >
              {error.message}
            </Text>
          </>
        ) : (
          <ActivityIndicator
            size="large"
            color={colors.olive}
            accessibilityLabel="Načítavanie aplikácie"
          />
        )}
      </View>
    );
  }

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