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
  background: string;
  backgroundSecondary: string;
  surface: string;           // Čistá biela karta
  surfaceElevated: string;   // Jemná svetlosivá pre neaktívne pilulky a polia
  surfaceHighlight: string;
  
  // Texty a štítky
  text: string;              // Dominantná čierna / biela
  textSecondary: string;     // Elegantná tlmená sivá
  textTertiary: string;
  line: string;              // Jemná deliaca čiara kariet
  lineStrong: string;

  // Akcenty z predlohy
  primaryDark: string;       // Čierne tlačidlá a aktívne pilulky (#121417)
  primaryDarkHover: string;
  tint: string;              // Modrý / čierny akcent
  green: string;             // Stav online / úspech (#10B981)
  orange: string;            // Oranžový indikátor (#F59E0B)
  red: string;               // Chyba (#EF4444)
  yellow: string;

  // Kompatibilita
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
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
  }),
  semibold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  }),
  extraBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  }),
  mono: Platform.select({
    ios: 'SF Mono, Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  }),
};

// Štýl podľa predlohy TripGlide: Čistý svetlý dizajn s prémiovým kontrastom
const lightColors: MonitorColors = {
  background: '#F5F6F9',
  backgroundSecondary: '#ECEEF2',
  surface: '#FFFFFF',
  surfaceElevated: '#ECEEF2',
  surfaceHighlight: '#E0E3E8',

  text: '#121417',
  textSecondary: '#636A79',
  textTertiary: '#9BA3B2',
  line: '#E8EAEE',
  lineStrong: '#D5D9E0',

  primaryDark: '#121417',
  primaryDarkHover: '#26292E',
  tint: '#121417',
  green: '#10B981',
  orange: '#F59E0B',
  yellow: '#FBBF24',
  red: '#EF4444',

  muted: '#636A79',
  olive: '#10B981',
  oliveSoft: 'rgba(16, 185, 129, 0.12)',
  orangeSoft: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.12)',
  onAccent: '#FFFFFF',
  notice: '#FFFFFF',
  http: '#121417',
  httpSoft: 'rgba(18, 20, 23, 0.08)',
  httpBorder: 'rgba(18, 20, 23, 0.15)',
  ws: '#10B981',
  wsSoft: 'rgba(16, 185, 129, 0.1)',
  wsBorder: 'rgba(16, 185, 129, 0.25)',
  mqtt: '#8B5CF6',
  mqttSoft: 'rgba(139, 92, 246, 0.1)',
  mqttBorder: 'rgba(139, 92, 246, 0.25)',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
};

// Tmavý variant zachovávajúci rovnakú geometriu a čistotu
const darkColors: MonitorColors = {
  background: '#0D0F12',
  backgroundSecondary: '#14181D',
  surface: '#1A1E24',
  surfaceElevated: '#252B33',
  surfaceHighlight: '#323944',

  text: '#FFFFFF',
  textSecondary: '#9AA3B2',
  textTertiary: '#5C6473',
  line: '#282F3A',
  lineStrong: '#3A4452',

  primaryDark: '#FFFFFF',
  primaryDarkHover: '#E5E7EB',
  tint: '#FFFFFF',
  green: '#10B981',
  orange: '#F59E0B',
  yellow: '#FBBF24',
  red: '#EF4444',

  muted: '#9AA3B2',
  olive: '#10B981',
  oliveSoft: 'rgba(16, 185, 129, 0.2)',
  orangeSoft: 'rgba(245, 158, 11, 0.2)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.2)',
  onAccent: '#121417',
  notice: '#1A1E24',
  http: '#FFFFFF',
  httpSoft: 'rgba(255, 255, 255, 0.1)',
  httpBorder: 'rgba(255, 255, 255, 0.2)',
  ws: '#10B981',
  wsSoft: 'rgba(16, 185, 129, 0.15)',
  wsBorder: 'rgba(16, 185, 129, 0.3)',
  mqtt: '#A78BFA',
  mqttSoft: 'rgba(167, 139, 250, 0.15)',
  mqttBorder: 'rgba(167, 139, 250, 0.3)',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.2)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.2)',
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

  // Predvolený svetlý motív podľa predlohy TripGlide
  const [preference, setPreference] = useState<ThemePreference>('light');

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
