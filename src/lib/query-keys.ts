/**
 * TanStack Query 키 팩토리.
 * (이전에는 [KEY,{project}] / [KEY,ns,name] / [...,'logs'] 형태가 혼재해
 *  invalidateQueries 의 prefix 매칭이 암묵적 규약에 의존했다.)
 *
 * 모든 키는 `['builds', ...]` prefix 로 시작하므로 `buildKeys.all` 무효화가 전체를 커버한다.
 */
export const buildKeys = {
  all: ['builds'] as const,
  list: (project: string) => [...buildKeys.all, 'list', { project }] as const,
  detail: (namespace: string, name: string) =>
    [...buildKeys.all, 'detail', namespace, name] as const,
  logs: (namespace: string, name: string) =>
    [...buildKeys.all, 'detail', namespace, name, 'logs'] as const,
};
