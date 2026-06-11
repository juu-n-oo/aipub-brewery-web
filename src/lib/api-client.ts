import { API_BASE, API_BASE_URL } from '@/lib/env';

/** 백엔드 k8sproxy 베이스 — CR 호출은 이 prefix 로 라우팅된다. */
const K8S_PROXY_BASE = `${API_BASE_URL}/api/v1alpha1/k8sproxy`;

/** Image Catalog 베이스 — 같은 aipub 도메인의 별도 서비스(`/image-catalog/api`). */
const CATALOG_BASE = `${API_BASE_URL}/image-catalog/api`;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  responseType?: 'json' | 'text';
  /** 요청 베이스 URL. 미지정 시 백엔드 API(`/api/v1alpha1`). */
  baseUrl?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, responseType = 'json', baseUrl = API_BASE, ...init } = options;

  let url = `${baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/welcome';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    // 백엔드는 RFC 7807 ProblemDetail(`detail` 필드)을 쓰므로 message → detail 순으로 메시지를 끌어온다.
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.detail || response.statusText || `Request failed: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (responseType === 'text') {
    return (await response.text()) as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * k8sproxy(백엔드 경유 k8s API) 클라이언트. apiClient 와 동일한 fetch/에러/401 처리를 공유하되
 * 베이스 URL 만 k8sproxy 로 바꾼다. (이전엔 k8s.ts 가 별도 fetch 래퍼 k8sRequest 를 중복 구현했다.)
 */
export const k8sClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET', baseUrl: K8S_PROXY_BASE }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      baseUrl: K8S_PROXY_BASE,
    }),
};

/**
 * Image Catalog 클라이언트. apiClient 와 동일한 fetch/에러/401 처리를 공유하되 베이스 URL 만
 * `/image-catalog/api` 로 바꾼다(같은 도메인 쿠키 인증, 전역 읽기 전용 카탈로그).
 */
export const catalogClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET', baseUrl: CATALOG_BASE }),
};
