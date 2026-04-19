import { apiClient } from '@/lib/api-client';
import type { ImageBuild, ImageBuildRequest } from '@/types/build';

const BASE = '/builds';

export const buildApi = {
  list: (project: string) =>
    apiClient.get<ImageBuild[]>(BASE, { params: { project } }),

  get: (namespace: string, name: string) =>
    apiClient.get<ImageBuild>(`${BASE}/${namespace}/${name}`),

  run: (data: ImageBuildRequest) => apiClient.post<ImageBuild>(BASE, data),

  getLogs: (namespace: string, name: string) =>
    apiClient.get<string>(`${BASE}/${namespace}/${name}/logs`),
};
