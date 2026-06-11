/**
 * 환경변수(import.meta.env) 단일 접근 지점.
 * Vite 빌드 시 주입되는 값을 타입화해 한곳에서 export 한다.
 * (이전에는 VITE_HARBOR_URL / VITE_API_BASE_URL 가 여러 모듈에 흩어져 있었다.)
 */

/** 백엔드 API 베이스 URL (빈 문자열이면 same-origin). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** 백엔드 API prefix 가 붙은 베이스 URL (`/api/v1alpha1`). */
export const API_BASE = `${API_BASE_URL}/api/v1alpha1`;

/** Harbor(ImageHub) 레지스트리 호스트. 빌드 대상/베이스 이미지 ref 조립에 사용. */
export const HARBOR_URL = import.meta.env.VITE_HARBOR_URL;
