import { createContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ColorTheme = 'default' | 'blue' | 'green' | 'orange' | 'yellow' | 'violet';

export type ThemeProviderState = {
  /** 적용된 실제 테마 (system 은 resolve 됨) */
  theme: 'light' | 'dark';
  /** 사용자가 선택한 모드 (system 포함) */
  themePreference: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
};

export const initialThemeState: ThemeProviderState = {
  theme: 'light',
  themePreference: 'system',
  setTheme: () => null,
  colorTheme: 'default',
  setColorTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialThemeState);
