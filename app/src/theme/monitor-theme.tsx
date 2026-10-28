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
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extraBold: 'DMSans_700Bold',
};

const darkColors: MonitorColors = {
  background: '#101214',
  surface: '#1B2024',
  text: '#F2F5F4',
  muted: '#A1AAAE',
  line: '#30383C',
  olive: '#00C4A7',
  oliveSoft: '#143B35',
  orange: '#43B9DB',
  orangeSoft: '#173441',
  error: '#FF9DA5',
  errorSoft: '#40272D',
  onAccent: '#071C18',
  notice: '#151A1D',
};

const lightColors: MonitorColors = {
  background: '#EDF1F0',
  surface: '#FFFFFF',
  text: '#182723',
  muted: '#5F706A',
  line: '#DCE5E1',
  olive: '#007C69',
  oliveSoft: '#DDF3EB',
  orange: '#087C9E',
  orangeSoft: '#E1F1F7',
  error: '#B52D42',
  errorSoft: '#FDEBF0',
  onAccent: '#FFFFFF',
  notice: '#E6EEEA',
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
    useState<ThemePreference>('dark');

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