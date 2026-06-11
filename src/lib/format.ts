/**
 * 날짜/기간/이미지 ref 포맷 헬퍼 단일 진실원본.
 * (이전에는 formatDateTime/formatAge/formatDuration/shortenImage* 가 페이지마다 복붙되어 있었다.)
 */

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * ISO 문자열 → `YYYY-MM-DD HH:mm` (로컬 타임존, 24시간).
 * 목록/상세에서 공통으로 쓰는 "생성 시각" 표기. 초 단위는 표시하지 않는다.
 */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 현재 시각 기준 경과 시간을 `Nd Nh` / `Nh` / `Nm` 으로 축약한다(상대 age).
 */
export function formatRelativeAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${mins}m`;
}

/**
 * 밀리초 소요 시간 → `Nm Ns` / `Ns`.
 */
export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  if (mins > 0) return `${mins}m ${remainSecs}s`;
  return `${remainSecs}s`;
}

/**
 * `registry.host/project/image:tag` → `project/image:tag` 로 축약(레지스트리 호스트 제거).
 * 슬래시 구분 3개 이상(= host 가 있는 full ref)일 때만 마지막 2 세그먼트를 남긴다.
 */
export function shortenImageRef(fullImage: string): string {
  const parts = fullImage.split('/');
  if (parts.length >= 3) {
    return parts.slice(-2).join('/');
  }
  return fullImage;
}
