const LOGIN_URL = '/api/v1alpha1/login';

export interface LoginRequest {
  username: string;
  password: string;
}

export async function login(data: LoginRequest): Promise<void> {
  const body = new URLSearchParams();
  body.set('username', data.username);
  body.set('password', data.password);

  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || '로그인에 실패했습니다.');
  }
}

export interface SelfSubjectReview {
  isAuthenticated: boolean;
  username: string;
  userId: string;
  roles: string[];
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export async function getSelfSubjectReview(): Promise<SelfSubjectReview> {
  const response = await fetch('/api/v1alpha1/selfsubjectreviews', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('인증 정보를 확인할 수 없습니다.');
  }

  return response.json();
}
