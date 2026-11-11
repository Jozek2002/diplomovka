import {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

export type MonitorColors = {
  // Apple HIG backgrounds
  background: string;
  backgroundSecondary: string;
  surface: string;          // secondarySystemGroupedBackground (Cards)
  surfaceElevated: string;  // tertiarySystemGroupedBackground (Tiles, Input fields)
  surfaceHighlight: string; // Pressed / segmented slider
  
  // Apple labels & lines
  text: string;             // label
  textSecondary: string;    // secondaryLabel
  textTertiary: string;     // tertiaryLabel
  line: string;             // separator
  lineStrong: string;

  // Apple System Tint Colors
  tint: string;             // systemBlue
  green: string;            // systemGreen (Active status, confirmed)
  orange: string;           // systemOrange (Telemetry humidity)
  yellow: string;           // systemYellow (HomeKit accessory light/switch)
  red: string;              // systemRed (Errors)
  purple: string;           // systemPurple (MQTT)

  // Spätná kompatibilita pre staršie moduly
  muted: string;
  olive: string;
  oliveSoft: string;
  orangeSoft: string;
  error: string;
  errorSoft: string;
  onAccent: string;
  notice: string;
  http: string;
  httpSoft: string;
  httpBorder: string;
  ws: string;
  wsSoft: string;
  wsBorder: string;
  mqtt: string;
  mqttSoft: string;
  mqttBorder: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
};

export const fonts = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  }),
  semibold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
  }),
  extraBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
  }),
  mono: Platform.select({
    ios: 'SF Mono, Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  }),
};

// Apple iOS / macOS Dark Mode (True Black & Grouped Grays)
const darkColors: MonitorColors = {
  background: '#000000',
  backgroundSecondary: '#121214',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceHighlight: '#3A3A3C',
  
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  line: 'rgba(255, 255, 255, 0.1)',
  lineStrong: 'rgba(255, 255, 255, 0.18)',

  tint: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  red: '#FF453A',
  purple: '#BF5AF2',

  // Kompatibilita
  muted: 'rgba(235, 235, 245, 0.6)',
  olive: '#30D158',
  oliveSoft: 'rgba(48, 209, 88, 0.15)',
  orangeSoft: 'rgba(255, 159, 10, 0.15)',
  error: '#FF453A',
  errorSoft: 'rgba(255, 69, 58, 0.15)',
  onAccent: '#FFFFFF',
  notice: '#1C1C1E',
  http: '#0A84FF',
  httpSoft: 'rgba(10, 132, 255, 0.15)',
  httpBorder: 'rgba(10, 132, 255, 0.3)',
  ws: '#30D158',
  wsSoft: 'rgba(48, 209, 88, 0.15)',
  wsBorder: 'rgba(48, 209, 88, 0.3)',
  mqtt: '#BF5AF2',
  mqttSoft: 'rgba(191, 90, 242, 0.15)',
  mqttBorder: 'rgba(191, 90, 242, 0.3)',
  success: '#30D158',
  successSoft: 'rgba(48, 209, 88, 0.15)',
  warning: '#FF9F0A',
  warningSoft: 'rgba(255, 159, 10, 0.15)',
};

// Apple iOS / macOS Light Mode
const lightColors: MonitorColors = {
  background: '#F2F2F7',
  backgroundSecondary: '#E5E5EA',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  surfaceHighlight: '#E5E5EA',

  text: '#000000',
  textSecondary: 'rgba(60, 60, 67, 0.6)',
  textTertiary: 'rgba(60, 60, 67, 0.3)',
  line: 'rgba(60, 60, 67, 0.12)',
  lineStrong: 'rgba(60, 60, 67, 0.22)',

  tint: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  yellow: '#FFCC00',
  red: '#FF3B30',
  purple: '#AF52DE',

  // Kompatibilita
  muted: 'rgba(60, 60, 67, 0.6)',
  olive: '#34C759',
  oliveSoft: 'rgba(52, 199, 89, 0.15)',
  orangeSoft: 'rgba(255, 149, 0, 0.15)',
  error: '#FF3B30',
  errorSoft: 'rgba(255, 59, 48, 0.15)',
  onAccent: '#FFFFFF',
  notice: '#FFFFFF',
  http: '#007AFF',
  httpSoft: 'rgba(0, 122, 255, 0.12)',
  httpBorder: 'rgba(0, 122, 255, 0.25)',
  ws: '#34C759',
  wsSoft: 'rgba(52, 199, 89, 0.12)',
  wsBorder: 'rgba(52, 199, 89, 0.25)',
  mqtt: '#AF52DE',
  mqttSoft: 'rgba(175, 82, 222, 0.12)',
  mqttBorder: 'rgba(175, 82, 222, 0.25)',
  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9500',
  warningSoft: 'rgba(255, 149, 0, 0.12)',
};

type ThemeContextValue = {
  colors: MonitorColors;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function MonitorThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();

  const [preference, setPreference] = useState<ThemePreference>('dark');

  const isDark =
    preference === 'dark' ||
    (preference === 'system' && systemScheme === 'dark');

  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      preference,
      setPreference,
      isDark,
    }),
    [preference, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useMonitorTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'Chýba MonitorThemeProvider. Skontroluj _layout.tsx.'
    );
  }

  return context;
}
