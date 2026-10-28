import {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { PropsWithChildren } from 'react';

import { useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

export type MonitorColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  olive: string;
  oliveSoft: string;
  orange: string;
  orangeSoft: string;
  error: string;
  errorSoft: string;
  onAccent: string;
  notice: string;
};

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};

const lightColors: MonitorColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#14213A',
  muted: '#687487',
  line: '#E8EBF0',
  olive: '#172B4D',
  oliveSoft: '#EDF1F7',
  orange: '#FF6B35',
  orangeSoft: '#FFF0E8',
  error: '#B83A4B',
  errorSoft: '#FFF0F2',
  onAccent: '#FFFFFF',
  notice: '#FFF5EE',
};

const darkColors: MonitorColors = {
  background: '#0F1623',
  surface: '#182234',
  text: '#F3F5FA',
  muted: '#A8B4C7',
  line: '#2C3950',
  olive: '#C2D3F0',
  oliveSoft: '#25354D',
  orange: '#FF9A70',
  orangeSoft: '#392B29',
  error: '#FFA6B3',
  errorSoft: '#3B2530',
  onAccent: '#14213A',
  notice: '#302826',
};

type ThemeContextValue = {
  colors: MonitorColors;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  isDark: boolean;
};

const ThemeContext =
  createContext<ThemeContextValue | null>(null);

export function MonitorThemeProvider({
  children,
}: PropsWithChildren) {
  const systemScheme = useColorScheme();

  const [preference, setPreference] =
    useState<ThemePreference>('system');

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

  if (context === null) {
    throw new Error(
      'Chýba MonitorThemeProvider. Skontroluj _layout.tsx.'
    );
  }

  return context;
}