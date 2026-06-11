/**
 * 폴링/캐시/타임아웃 등 매직 넘버의 단일 진실원본.
 * (이전에는 useBuilds/useK8s/에디터에 리터럴로 흩어져 있었다.)
 */

/** 활성 빌드 상태 폴링 주기(ms) — useBuild refetchInterval. */
export const BUILD_POLL_MS = 3000;

/** 정적 로그 폴링 주기(ms) — useBuildLogs refetchInterval. */
export const LOG_POLL_MS = 5000;

/** k8s 조회 기본 staleTime(ms) — useProject/useVolumes. */
export const DEFAULT_STALE_MS = 5 * 60 * 1000;

/** 빌드 제한 시간(분) 입력 경계 + 기본값. UI input min/max 와 전송 시 clamp 가 공유한다. */
export const BUILD_TIMEOUT_MIN_MINUTES = 1;
export const BUILD_TIMEOUT_MAX_MINUTES = 360;
export const BUILD_TIMEOUT_DEFAULT_MINUTES = 60;

/** 분 입력값을 허용 범위로 clamp 한 뒤 초로 변환한다. 빈/비정상 입력은 기본값으로 처리. */
export function clampTimeoutMinutesToSeconds(minutes: number): number {
  const clamped = Math.min(
    BUILD_TIMEOUT_MAX_MINUTES,
    Math.max(BUILD_TIMEOUT_MIN_MINUTES, minutes || BUILD_TIMEOUT_DEFAULT_MINUTES),
  );
  return clamped * 60;
}
