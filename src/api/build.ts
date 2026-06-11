import { apiClient } from '@/lib/api-client';
import { k8sApi } from '@/api/k8s';
import {
  makeImageBuildCr,
  buildImageLabels,
  withRefreshedCreated,
  LABEL_DOCKERFILE_ID,
  LABEL_REVISION_ID,
  LABEL_USERNAME,
  LABEL_REBUILD_OF,
  ANNOTATION_BASE_IMAGE,
} from '@/lib/image-build-cr';
import type { ImageBuild, ImageBuildCr, RunBuildInput } from '@/types/build';

const BASE = '/builds';

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
    const cr = makeImageBuildCr({
      namespace: df.project,
      labels: {
        [LABEL_DOCKERFILE_ID]: String(df.id),
        [LABEL_REVISION_ID]: String(df.latestRevisionId ?? 0),
        [LABEL_USERNAME]: df.username,
      },
      annotations: {
        [ANNOTATION_BASE_IMAGE]: df.baseImage,
      },
      spec: {
        dockerfileContent: df.content,
        targetImage: `${input.targetImage}:${input.tag}`,
        imageLabels: buildImageLabels(df),
        ...(input.pushSecretRef ? { pushSecretRef: input.pushSecretRef } : {}),
        ...(input.buildContextPvc ? { buildContextPvc: input.buildContextPvc } : {}),
        ...(input.buildContextSubPath ? { buildContextSubPath: input.buildContextSubPath } : {}),
        ...(input.buildTimeoutSeconds ? { buildTimeoutSeconds: input.buildTimeoutSeconds } : {}),
      },
    });
    const created = await k8sApi.createImageBuild(df.project, cr);
    return mapCrToImageBuild(created);
  },

  /**
   * 재빌드: 기존 ImageBuild CR 의 spec/labels/annotations 를 그대로 복제해 새 CR 을 생성한다(백엔드 우회).
   * 실패한 빌드의 정확한 재시도이므로 spec(dockerfileContent/targetImage/buildTimeoutSeconds 등)은
   * CR 에 freeze 된 값을 재사용한다. 새 CR 이름은 generateName 으로 부여되며, 원본 추적을 위해
   * rebuild-of 라벨을 단다. imageLabels 의 created(빌드 시점)만 현재 시각으로 갱신한다.
   * (status 는 복제하지 않으므로 새 CR 은 Pending 부터 자연 진행 → 컨트롤러 변경 불필요)
   */
  rebuild: async (namespace: string, name: string): Promise<ImageBuild> => {
    const src = await k8sApi.getImageBuild(namespace, name);
    const srcImageLabels = src.spec.imageLabels;
    const cr = makeImageBuildCr({
      namespace,
      labels: {
        ...(src.metadata.labels ?? {}),
        [LABEL_REBUILD_OF]: name,
      },
      annotations: { ...(src.metadata.annotations ?? {}) },
      spec: {
        ...src.spec,
        ...(srcImageLabels ? { imageLabels: withRefreshedCreated(srcImageLabels) } : {}),
      },
    });
    const created = await k8sApi.createImageBuild(namespace, cr);
    return mapCrToImageBuild(created);
  },

  // 로그는 백엔드를 경유한다 (Pod 로그 + OpenSearch fallback)
  getLogs: (namespace: string, name: string) =>
    apiClient.get<string>(`${BASE}/${namespace}/${name}/logs`, { responseType: 'text' }),
};
