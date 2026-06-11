/**
 * unknown 에러에서 사람이 읽을 메시지를 안전하게 끌어낸다.
 * (이전에는 `(e as Error).message` 캐스트가 여러 곳에 반복됐다.)
 *
 * 백엔드는 RFC 7807 ProblemDetail(`detail` 필드)을 쓰므로, api-client 가 이미
 * message → detail 순으로 Error.message 에 정리한다. 여기서는 Error / 문자열 /
 * ProblemDetail 유사 객체를 모두 방어적으로 처리한다.
 */

/** RFC 7807 ProblemDetail 의 부분 형태. */
export interface ProblemDetail {
  title?: string;
  detail?: string;
  message?: string;
  status?: number;
}

export function getErrorMessage(e: unknown, fallback = 'An unexpected error occurred'): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string') return e || fallback;
  if (e && typeof e === 'object') {
    const p = e as ProblemDetail;
    return p.message || p.detail || p.title || fallback;
  }
  return fallback;
}
