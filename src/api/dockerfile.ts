import { apiClient } from '@/lib/api-client';
import type {
  Dockerfile,
  DockerfileCreateRequest,
  DockerfileUpdateRequest,
  DockerfileRevision,
} from '@/types/dockerfile';

const BASE = '/dockerfiles';

export const dockerfileApi = {
  /** 멤버 조회: 바인딩된 프로젝트 목록을 전달한다. 백엔드가 토큰의 본인 username 으로 추가 제한한다. */
  list: (projects: string[]) =>
    apiClient.get<Dockerfile[]>(BASE, { params: { projects: projects.join(',') } }),

  /** 관리자 전체 조회: all=true. username 으로 추가 필터링 가능. 비관리자가 호출하면 백엔드가 403 을 반환한다. */
  listAll: (username?: string) =>
    apiClient.get<Dockerfile[]>(BASE, {
      params: username ? { all: 'true', username } : { all: 'true' },
    }),

  get: (id: number) => apiClient.get<Dockerfile>(`${BASE}/${id}`),

  create: (data: DockerfileCreateRequest) => apiClient.post<Dockerfile>(BASE, data),

  update: (id: number, data: DockerfileUpdateRequest) =>
    apiClient.put<Dockerfile>(`${BASE}/${id}`, data),

  delete: (id: number) => apiClient.delete<void>(`${BASE}/${id}`),

  /* ── Revision endpoints ── */

  listRevisions: (id: number) =>
    apiClient.get<DockerfileRevision[]>(`${BASE}/${id}/revisions`),

  getRevision: (id: number, version: number) =>
    apiClient.get<DockerfileRevision>(`${BASE}/${id}/revisions/${version}`),

  rollback: (id: number, version: number) =>
    apiClient.post<Dockerfile>(`${BASE}/${id}/revisions/${version}/rollback`),
};
