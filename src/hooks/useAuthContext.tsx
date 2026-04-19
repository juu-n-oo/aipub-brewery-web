import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { k8sApi } from '@/api/k8s';
import type { UserAuthorityReviewProject } from '@/types/k8s';

interface AuthState {
  username: string;
  isAdmin: boolean;
  isClusterAdmin: boolean;
  projects: UserAuthorityReviewProject[];
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  username: '',
  isAdmin: false,
  isClusterAdmin: false,
  projects: [],
  isLoading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    username: '',
    isAdmin: false,
    isClusterAdmin: false,
    projects: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadUserAuthority();
  }, []);

  async function loadUserAuthority() {
    try {
      // 쿠키에서 username 추출 (AIPUB_ID_COOKIE의 JWT payload)
      const username = getUsernameFromCookie();
      if (!username) {
        window.location.href = '/login';
        return;
      }

      const review = await k8sApi.getUserAuthority(username);
      setState({
        username,
        isAdmin: review.status.aipubRole.isAdmin,
        isClusterAdmin: review.status.isClusterAdmin,
        projects: review.status.aipubRole.projects,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '권한 조회에 실패했습니다.',
      }));
    }
  }

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function getUsernameFromCookie(): string | null {
  // dev 모드에서는 MSW mock 사용 — 쿠키 대신 고정 유저
  if (import.meta.env.DEV) {
    return 'joonwoo';
  }

  try {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const idCookie = cookies.find((c) => c.startsWith('AIPUB_ID_COOKIE='));
    if (!idCookie) return null;

    const token = idCookie.split('=')[1];
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.preferred_username || payload.sub || null;
  } catch {
    return null;
  }
}
