import { apiClient } from '@/lib/api-client';
import { k8sApi } from '@/api/k8s';
import type { ImageBuild, ImageBuildCr, RunBuildInput } from '@/types/build';

const BASE = '/builds';

const IMAGEBUILD_API_VERSION = 'dockerizer.aipub.ten1010.io/v1alpha1';
const IMAGEBUILD_KIND = 'ImageBuild';

const LABEL_DOCKERFILE_ID = 'dockerizer.aipub.ten1010.io/dockerfile-id';
const LABEL_REVISION_ID = 'dockerizer.aipub.ten1010.io/dockerfile-revision-id';
const LABEL_USERNAME = 'dockerizer.aipub.ten1010.io/username';
const ANNOTATION_BASE_IMAGE = 'dockerizer.aipub.ten1010.io/base-image';

/** k8s ImageBuild CR → UI용 ImageBuild DTO 매핑 (백엔드 crMapToResponse 와 동일 로직) */
function mapCrToImageBuild(cr: ImageBuildCr): ImageBuild {
  const labels = cr.metadata.labels ?? {};
  const annotations = cr.metadata.annotations ?? {};
  const status = cr.status ?? {};
  const dockerfileIdRaw = labels[LABEL_DOCKERFILE_ID];
  return {
    name: cr.metadata.name,
    namespace: cr.metadata.namespace,
    phase: status.phase ?? 'Pending',
    targetImage: cr.spec.targetImage,
    baseImage: annotations[ANNOTATION_BASE_IMAGE],
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

  // 빌드 실행은 k8sproxy 로 ImageBuild CR 을 직접 생성한다 (백엔드 우회).
  // dockerfileContent 를 spec 에 inline 하므로 컨트롤러는 spec 만으로 self-contained.
  run: async (input: RunBuildInput): Promise<ImageBuild> => {
    const { dockerfile: df } = input;
    const cr = {
      apiVersion: IMAGEBUILD_API_VERSION,
      kind: IMAGEBUILD_KIND,
      metadata: {
        // 서버가 유니크 이름을 부여하도록 generateName 사용 (클라이언트 랜덤 불필요)
        generateName: 'imagebuild-',
        namespace: df.project,
        labels: {
          [LABEL_DOCKERFILE_ID]: String(df.id),
          [LABEL_REVISION_ID]: String(df.latestRevisionId ?? 0),
          [LABEL_USERNAME]: df.username,
        },
        annotations: {
          [ANNOTATION_BASE_IMAGE]: df.baseImage,
        },
      },
      spec: {
        dockerfileContent: df.content,
        targetImage: `${input.targetImage}:${input.tag}`,
        ...(input.pushSecretRef ? { pushSecretRef: input.pushSecretRef } : {}),
        ...(input.buildContextPvc ? { buildContextPvc: input.buildContextPvc } : {}),
        ...(input.buildContextSubPath ? { buildContextSubPath: input.buildContextSubPath } : {}),
      },
    };
    const created = await k8sApi.createImageBuild(df.project, cr);
    return mapCrToImageBuild(created);
  },

  // 로그는 백엔드를 경유한다 (Pod 로그 + OpenSearch fallback)
  getLogs: (namespace: string, name: string) =>
    apiClient.get<string>(`${BASE}/${namespace}/${name}/logs`, { responseType: 'text' }),
};
