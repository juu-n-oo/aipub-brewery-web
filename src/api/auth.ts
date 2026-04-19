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

export async function checkAuth(): Promise<boolean> {
  try {
    // 인증 상태 확인을 위해 간단한 API 호출
    const response = await fetch('/api/v1/dockerfiles?projectId=default', {
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}
