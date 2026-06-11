import type { Dockerfile } from '@/types/dockerfile';
import type { ImageBuildCrInput, ImageBuildSpec } from '@/types/build';

/* ── ImageBuild CR 상수 (aipub.ten1010.io group — 외부 연동을 위해 보존되는 식별자) ── */

export const IMAGEBUILD_API_VERSION = 'aipub.ten1010.io/v1alpha1';
export const IMAGEBUILD_KIND = 'ImageBuild';

export const LABEL_DOCKERFILE_ID = 'aipub.ten1010.io/dockerfile-id';
export const LABEL_REVISION_ID = 'aipub.ten1010.io/dockerfile-revision-id';
export const LABEL_USERNAME = 'aipub.ten1010.io/username';
export const LABEL_REBUILD_OF = 'aipub.ten1010.io/rebuild-of';
export const ANNOTATION_BASE_IMAGE = 'aipub.ten1010.io/base-image';

const OCI = 'org.opencontainers.image';
const VENDOR = 'AIPub, TEN Inc';

/**
 * 이미지에 baking 할 자동 라벨 맵을 조립한다. (CR spec.imageLabels → 컨트롤러가 Kaniko --label 로 전개)
 * - provenance: 어떤 Dockerfile/리비전/누가 만든 이미지인지 식별 (aipub.ten1010.io/*)
 * - OCI 표준(org.opencontainers.image.*): 빌드 시점에 결정되는 자동 값(생성시각/제목/리비전 등)
 *
 * 사용자 입력 라벨(version/authors/licenses/url/documentation/커스텀)은 여기서 다루지 않는다.
 * 에디터에서 Dockerfile content 의 LABEL 지시자로 직접 들어가므로(에디터 페이지 buildLabelLines),
 * Kaniko 가 Dockerfile 을 빌드하며 그대로 이미지에 반영한다.
 * 빈 값은 생략한다.
 */
export function buildImageLabels(df: Dockerfile): Record<string, string> {
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

/** imageLabels 의 created(빌드 시점)만 현재 시각으로 갱신한 새 맵을 만든다(재빌드 시). */
export function withRefreshedCreated(labels: Record<string, string>): Record<string, string> {
  return { ...labels, [`${OCI}.created`]: new Date().toISOString() };
}

/**
 * ImageBuild CR(생성 입력) 골격을 조립한다. run/rebuild 가 라벨 셋·spec 출처만 다르므로 공유한다.
 * 서버가 유니크 이름을 부여하도록 generateName 을 사용한다(클라이언트 랜덤 불필요).
 */
export function makeImageBuildCr(params: {
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  spec: ImageBuildSpec;
}): ImageBuildCrInput {
  return {
    apiVersion: IMAGEBUILD_API_VERSION,
    kind: IMAGEBUILD_KIND,
    metadata: {
      generateName: 'imagebuild-',
      namespace: params.namespace,
      ...(params.labels ? { labels: params.labels } : {}),
      ...(params.annotations ? { annotations: params.annotations } : {}),
    },
    spec: params.spec,
  };
}
