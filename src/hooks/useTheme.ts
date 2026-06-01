import { useContext } from 'react';
import { ThemeProviderContext } from '@/providers/theme-context';

/** 테마 상태를 조회하는 훅 */
export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
