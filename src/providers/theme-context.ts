import { createContext } from 'react';

// 다크모드는 제거됨 — 앱은 항상 라이트 테마로 동작한다.
// Sonner 토스트 / Monaco 에디터가 theme 값을 참조하므로 컨텍스트 자체는 유지한다.
export type ThemeProviderState = {
  /** 적용된 테마 (항상 'light') */
  theme: 'light';
};

export const initialThemeState: ThemeProviderState = {
  theme: 'light',
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialThemeState);
