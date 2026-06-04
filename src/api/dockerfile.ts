import { apiClient } from '@/lib/api-client';
import type {
  Dockerfile,
  DockerfileCreateRequest,
  DockerfileUpdateRequest,
  DockerfileRevision,
} from '@/types/dockerfile';

const BASE = '/dockerfiles';

export const dockerfileApi = {
  list: (project: string) =>
    apiClient.get<Dockerfile[]>(BASE, { params: { project } }),

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
