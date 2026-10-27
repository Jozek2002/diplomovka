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

const lightColors: MonitorColors = {
  background: '#F2EFE7',
  surface: '#FCFAF5',
  text: '#252923',
  muted: '#666B60',
  line: '#D8D5CA',
  olive: '#46543A',
  oliveSoft: '#E8EBE0',
  orange: '#B94F2D',
  orangeSoft: '#F5E8DD',
  error: '#993D32',
  errorSoft: '#F7E8E3',
  onAccent: '#FCFAF5',
  notice: '#EBE6D9',
};

const darkColors: MonitorColors = {
  background: '#191D19',
  surface: '#232923',
  text: '#EEEADF',
  muted: '#ADB4A5',
  line: '#414B3D',
  olive: '#B0C394',
  oliveSoft: '#2C392A',
  orange: '#ED9B73',
  orangeSoft: '#3B2D25',
  error: '#F0A89B',
  errorSoft: '#402925',
  onAccent: '#191D19',
  notice: '#302F25',
};

type ThemeContextValue = {
  colors: MonitorColors;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

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