import { apiClient } from '@/lib/api-client';
import { k8sApi } from '@/api/k8s';
import type { Dockerfile } from '@/types/dockerfile';
import type { ImageBuild, ImageBuildCr, RunBuildInput } from '@/types/build';

const BASE = '/builds';

const IMAGEBUILD_API_VERSION = 'dockerizer.aipub.ten1010.io/v1alpha1';
const IMAGEBUILD_KIND = 'ImageBuild';

const LABEL_DOCKERFILE_ID = 'dockerizer.aipub.ten1010.io/dockerfile-id';
const LABEL_REVISION_ID = 'dockerizer.aipub.ten1010.io/dockerfile-revision-id';
const LABEL_USERNAME = 'dockerizer.aipub.ten1010.io/username';
const ANNOTATION_BASE_IMAGE = 'dockerizer.aipub.ten1010.io/base-image';

const OCI = 'org.opencontainers.image';
const VENDOR = 'AIPub, TEN Inc';

/**
 * 이미지에 baking 할 자동 라벨 맵을 조립한다. (CR spec.imageLabels → 컨트롤러가 Kaniko --label 로 전개)
 * - provenance: 어떤 Dockerfile/리비전/누가 만든 이미지인지 식별 (dockerizer.aipub.ten1010.io/*)
 * - OCI 표준(org.opencontainers.image.*): 빌드 시점에 결정되는 자동 값(생성시각/제목/리비전 등)
 *
 * 사용자 입력 라벨(version/authors/licenses/url/documentation/커스텀)은 여기서 다루지 않는다.
 * 에디터에서 Dockerfile content 의 LABEL 지시자로 직접 들어가므로(에디터 페이지 buildLabelLines),
 * Kaniko 가 Dockerfile 을 빌드하며 그대로 이미지에 반영한다.
 * 빈 값은 생략한다.
 */
function buildImageLabels(df: Dockerfile): Record<string, string> {
  const revision = String(df.latestRevisionId ?? 0);
  const labels: Record<string, string> = {
    // provenance (이미지 자체에 baking — CR 이 GC 돼도 이미지로 추적 가능)
    [LABEL_DOCKERFILE_ID]: String(df.id),
    [LABEL_REVISION_ID]: revision,
    [LABEL_USERNAME]: df.username,
    // OCI 표준 — 빌드 시점 자동 값
    // (title=org.opencontainers.image.title 은 Dockerfile content 의 LABEL 로 들어가므로 여기서 제외)
    [`${OCI}.created`]: new Date().toISOString(),
    [`${OCI}.revision`]: revision,
    [`${OCI}.vendor`]: VENDOR,
  };
  if (df.baseImage) labels[`${OCI}.base.name`] = df.baseImage;
  if (df.description?.trim()) labels[`${OCI}.description`] = df.description.trim();
  return labels;
}

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
        imageLabels: buildImageLabels(df),
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
