import { apiClient, k8sClient } from '@/lib/api-client';
import { API_BASE } from '@/lib/env';
import type {
  UserAuthorityReview,
  Project,
  AipubUser,
  ImageReview,
  ImageHubListItem,
  VolumeListResponse,
  BrowseResponse,
} from '@/types/k8s';
import type { ImageBuildCr, ImageBuildCrInput, ImageBuildList } from '@/types/build';

const IMAGEBUILD_API = '/apis/aipub.ten1010.io/v1alpha1';

export const k8sApi = {
  /** 유저 권한 분석 — 접근 가능한 프로젝트 목록 확인 */
  getUserAuthority: (username: string) =>
    k8sClient.post<UserAuthorityReview>('/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews', {
      apiVersion: 'aipub.ten1010.io/v1alpha1',
      kind: 'UserAuthorityReview',
      metadata: { name: username },
      spec: { resources: ['/namespaces'] },
    }),

  /** Project 단건 조회 */
  getProject: (name: string) =>
    k8sClient.get<Project>(`/apis/project.aipub.ten1010.io/v1alpha1/projects/${name}`),

  /**
   * AipubUser CR 단건 조회 (cluster-scoped). 로그인 유저(username)에 바인딩된 ImageHub 목록 확인용.
   * 유저의 AipubUser CR 조회 권한은 k8s RBAC 로 이미 부여되어 있어 프론트가 직접 호출한다.
   */
  getAipubUser: (username: string) =>
    k8sClient.get<AipubUser>(
      `/apis/project.aipub.ten1010.io/v1alpha1/aipubusers/${encodeURIComponent(username)}`,
    ),

  /**
   * ImageHub 목록 조회 (aipub backend REST). 요청 토큰의 role 을 보고 접근 가능한 ImageHub
   * (public + 본인이 속한 private)만 필터링해 응답한다. 관리자는 전체 ImageHub 가 응답된다.
   * 응답은 평탄 배열이며 hub 이름은 각 항목의 {@code name}.
   * <p>
   * 관리자는 ImageHub 가 많을 수 있어 페이지를 끝까지 순회한다. {@code pageOffset} 은 0-based
   * 페이지 인덱스이며(backend: {@code from = pageSize * pageOffset}), 각 응답은 비중첩 단일
   * 페이지이므로 응답 길이가 {@code pageSize} 미만이면 마지막 페이지로 보고 종료한다.
   */
  listImageHubs: async (): Promise<ImageHubListItem[]> => {
    const pageSize = 50;
    const maxPages = 100; // 런어웨이 방지용 안전 상한 (pageSize * maxPages = 5000 hubs)
    const all: ImageHubListItem[] = [];
    for (let pageOffset = 0; pageOffset < maxPages; pageOffset += 1) {
      const page = await apiClient.get<ImageHubListItem[]>('/imagehubs', {
        params: { pageOffset: String(pageOffset), pageSize: String(pageSize) },
      });
      all.push(...page);
      if (page.length < pageSize) break; // 마지막(부분) 페이지 → 종료
    }
    return all;
  },

  /** ImageBuild CR 목록 조회 (namespace 단위) */
  listImageBuilds: (namespace: string) =>
    k8sClient.get<ImageBuildList>(`${IMAGEBUILD_API}/namespaces/${namespace}/imagebuilds`),

  /** ImageBuild CR 생성 — 프론트가 k8sproxy 로 직접 생성한다(백엔드 우회). 사용자 AIPub 신원의 RBAC 필요. */
  createImageBuild: (namespace: string, cr: ImageBuildCrInput) =>
    k8sClient.post<ImageBuildCr>(`${IMAGEBUILD_API}/namespaces/${namespace}/imagebuilds`, cr),

  /** ImageBuild CR 단건 조회 */
  getImageBuild: (namespace: string, name: string) =>
    k8sClient.get<ImageBuildCr>(`${IMAGEBUILD_API}/namespaces/${namespace}/imagebuilds/${name}`),

  /** Volume 목록 조회 (Backend API) */
  getVolumes: (namespace: string) => apiClient.get<VolumeListResponse>(`/volumes/${namespace}`),

  /** Volume 파일 브라우저 (Backend API) */
  getVolumeFiles: (namespace: string, volumeName: string, path: string = '/') =>
    apiClient.get<BrowseResponse>(`/volumes/${namespace}/${volumeName}/browse`, {
      params: { path },
    }),

  /**
   * Volume 파일 업로드 (Backend API).
   * k8sproxy 는 exec(WebSocket) 업그레이드를 지원하지 않으므로 imagekit 백엔드를 경유한다.
   * 진행률 표시를 위해 fetch 대신 XHR(upload.onprogress)을 사용한다.
   * @param onProgress 0~1 사이의 진행률 콜백 (브라우저→백엔드 전송 기준)
   */
  uploadVolumeFile: (
    namespace: string,
    volumeName: string,
    path: string,
    file: File,
    onProgress?: (ratio: number) => void,
  ): Promise<BrowseResponse> =>
    new Promise<BrowseResponse>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      const url = `${API_BASE}/volumes/${namespace}/${volumeName}/upload?path=${encodeURIComponent(path)}`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status === 401) {
          window.location.href = '/welcome';
          reject(new Error('Unauthorized'));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as BrowseResponse);
          } catch {
            resolve({} as BrowseResponse);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed: network error'));
      xhr.send(form);
    }),

  /** ImageReview — 리포지토리 목록 조회 */
  getRepositories: (imgHub: string) =>
    k8sClient.post<ImageReview>('/apis/project.aipub.ten1010.io/v1alpha1/imagereviews', {
      apiVersion: 'project.aipub.ten1010.io/v1alpha1',
      kind: 'ImageReview',
      metadata: { name: imgHub },
      spec: { imgHub },
    }),

  /** ImageReview — 이미지 태그 목록 조회 */
  getImageTags: (imgHub: string, repo: string) =>
    k8sClient.post<ImageReview>('/apis/project.aipub.ten1010.io/v1alpha1/imagereviews', {
      apiVersion: 'project.aipub.ten1010.io/v1alpha1',
      kind: 'ImageReview',
      metadata: { name: imgHub },
      spec: { imgHub, repo },
    }),
};
