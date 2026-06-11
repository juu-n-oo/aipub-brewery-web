import { useEffect, type ReactNode } from 'react';
import { ThemeProviderContext, initialThemeState } from '@/providers/theme-context';

// 다크모드 제거: 테마 선택/시스템 감지 없이 항상 라이트로 고정한다.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;
    // 과거에 저장돼 있을 수 있는 dark 클래스를 제거해 라이트 테마를 보장한다.
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  return (
    <ThemeProviderContext.Provider value={initialThemeState}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
