import { Stack } from 'expo-router';

import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import {
  MonitorThemeProvider,
  useMonitorTheme,
} from '@/theme/monitor-theme';

function AppStack() {
  const { colors, isDark } = useMonitorTheme();

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (fontError) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[
            styles.errorTitle,
            { color: colors.text },
          ]}
        >
          Font sa nepodarilo načítať
        </Text>

        <Text
          selectable
          style={[
            styles.errorMessage,
            { color: colors.muted },
          ]}
        >
          {fontError.message}
        </Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.orange}
          accessibilityLabel="Načítavanie aplikácie"
        />
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});