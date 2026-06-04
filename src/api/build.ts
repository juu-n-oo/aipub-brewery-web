import { apiClient } from '@/lib/api-client';
import { k8sApi } from '@/api/k8s';
import type { ImageBuild, ImageBuildCr, ImageBuildRequest } from '@/types/build';

const BASE = '/builds';

const LABEL_DOCKERFILE_ID = 'dockerizer.aipub.ten1010.io/dockerfile-id';
const LABEL_USERNAME = 'dockerizer.aipub.ten1010.io/username';

/** k8s ImageBuild CR → UI용 ImageBuild DTO 매핑 (백엔드 crMapToResponse 와 동일 로직) */
function mapCrToImageBuild(cr: ImageBuildCr): ImageBuild {
  const labels = cr.metadata.labels ?? {};
  const status = cr.status ?? {};
  const dockerfileIdRaw = labels[LABEL_DOCKERFILE_ID];
  return {
    name: cr.metadata.name,
    namespace: cr.metadata.namespace,
    phase: status.phase ?? 'Pending',
    targetImage: cr.spec.targetImage,
    message: status.message,
    imageDigest: status.imageDigest,
    dockerfileId: dockerfileIdRaw != null ? Number(dockerfileIdRaw) : 0,
    username: labels[LABEL_USERNAME] ?? '',
    createdAt: cr.metadata.creationTimestamp,
    startTime: status.startTime,
    completionTime: status.completionTime,
  };
}

export const buildApi = {
  // 조회는 k8sproxy 를 통해 ImageBuild CR 을 직접 읽는다 (백엔드 우회)
  list: async (project: string) => {
    const result = await k8sApi.listImageBuilds(project);
    return result.items.map(mapCrToImageBuild);
  },

  get: async (namespace: string, name: string) => {
    const cr = await k8sApi.getImageBuild(namespace, name);
    return mapCrToImageBuild(cr);
  },

  // 빌드 실행/로그는 백엔드를 경유한다 (CR 생성 권한·검증, 로그 SSE 래핑)
  run: (data: ImageBuildRequest) => apiClient.post<ImageBuild>(BASE, data),

  getLogs: (namespace: string, name: string) =>
    apiClient.get<string>(`${BASE}/${namespace}/${name}/logs`, { responseType: 'text' }),
};
