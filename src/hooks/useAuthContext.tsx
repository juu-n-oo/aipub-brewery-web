import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { k8sApi } from '@/api/k8s';
import { getSelfSubjectReview } from '@/api/auth';
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
      // selfsubjectreviews API로 인증 상태 및 username 조회
      const self = await getSelfSubjectReview();
      if (!self.isAuthenticated) {
        window.location.href = '/login';
        return;
      }
      const username = self.username;

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
