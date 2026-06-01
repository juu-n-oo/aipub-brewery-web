import { useEffect, useState, type ReactNode } from 'react';
import {
  ThemeProviderContext,
  type ColorTheme,
  type Theme,
  type ThemeProviderState,
} from '@/providers/theme-context';

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
  colorStorageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorTheme = 'default',
  storageKey = 'ui-theme',
  colorStorageKey = 'ui-color-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    () => (localStorage.getItem(colorStorageKey) as ColorTheme) || defaultColorTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    root.classList.remove(
      'theme-default',
      'theme-blue',
      'theme-green',
      'theme-orange',
      'theme-yellow',
      'theme-violet',
    );
    root.classList.add(`theme-${colorTheme}`);
  }, [theme, colorTheme]);

  const getResolvedTheme = (t: Theme): 'light' | 'dark' => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  };

  const value: ThemeProviderState = {
    theme: getResolvedTheme(theme),
    themePreference: theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next);
      setThemeState(next);
    },
    colorTheme,
    setColorTheme: (next: ColorTheme) => {
      localStorage.setItem(colorStorageKey, next);
      setColorThemeState(next);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
