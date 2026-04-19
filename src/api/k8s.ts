import { apiClient } from '@/lib/api-client';
import type {
  UserAuthorityReview,
  Project,
  ImageReview,
  VolumeListResponse,
  BrowseResponse,
  ImageSearchResponse,
  ImageTagsResponse,
} from '@/types/k8s';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const K8S_PROXY = `${API_BASE_URL}/api/v1alpha1/k8sproxy`;

async function k8sRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${K8S_PROXY}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`K8s API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const k8sApi = {
  /** 유저 권한 분석 — 접근 가능한 프로젝트 목록 확인 */
  getUserAuthority: (username: string) =>
    k8sRequest<UserAuthorityReview>(
      '/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews',
      {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'aipub.ten1010.io/v1alpha1',
          kind: 'UserAuthorityReview',
          metadata: { name: username },
          spec: { resources: ['/namespaces'] },
        }),
      },
    ),

  /** Project 단건 조회 */
  getProject: (name: string) =>
    k8sRequest<Project>(
      `/apis/project.aipub.ten1010.io/v1alpha1/projects/${name}`,
    ),

  /** Volume 목록 조회 (Backend API) */
  getVolumes: (namespace: string) =>
    apiClient.get<VolumeListResponse>(`/volumes/${namespace}`),

  /** Volume 파일 브라우저 (Backend API) */
  getVolumeFiles: (namespace: string, volumeName: string, path: string = '/') =>
    apiClient.get<BrowseResponse>(`/volumes/${namespace}/${volumeName}/browse`, {
      params: { path },
    }),

  /** ImageReview — 리포지토리 목록 조회 */
  getRepositories: (imgHub: string) =>
    k8sRequest<ImageReview>(
      '/apis/project.aipub.ten1010.io/v1alpha1/imagereviews',
      {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'project.aipub.ten1010.io/v1alpha1',
          kind: 'ImageReview',
          metadata: { name: imgHub },
          spec: { imgHub },
        }),
      },
    ),

  /** ImageReview — 이미지 태그 목록 조회 */
  getImageTags: (imgHub: string, repo: string) =>
    k8sRequest<ImageReview>(
      '/apis/project.aipub.ten1010.io/v1alpha1/imagereviews',
      {
        method: 'POST',
        body: JSON.stringify({
          apiVersion: 'project.aipub.ten1010.io/v1alpha1',
          kind: 'ImageReview',
          metadata: { name: imgHub },
          spec: { imgHub, repo },
        }),
      },
    ),

  /** NGC 이미지 검색 */
  searchNgcImages: (query: string, page = 0, pageSize = 25) =>
    apiClient.get<ImageSearchResponse>('/registries/ngc/images', {
      params: { query, page: String(page), pageSize: String(pageSize) },
    }),

  /** NGC 이미지 태그 조회 */
  getNgcTags: (org: string, repository: string) =>
    apiClient.get<ImageTagsResponse>(`/registries/ngc/images/${org}/${repository}/tags`),

  /** HuggingFace 이미지 검색 */
  searchHuggingfaceImages: (query: string, page = 0, pageSize = 25) =>
    apiClient.get<ImageSearchResponse>('/registries/huggingface/images', {
      params: { query, page: String(page), pageSize: String(pageSize) },
    }),

  /** HuggingFace 이미지 태그 조회 */
  getHuggingfaceTags: (repository: string) =>
    apiClient.get<ImageTagsResponse>(`/registries/huggingface/images/${repository}/tags`),
};
