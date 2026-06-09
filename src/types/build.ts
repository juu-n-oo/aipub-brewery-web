import type { Dockerfile } from '@/types/dockerfile';

export type BuildPhase = 'Pending' | 'Preparing' | 'Building' | 'Succeeded' | 'Failed';

export interface ImageBuild {
  name: string;
  namespace: string;
  phase: BuildPhase;
  targetImage: string;
  baseImage?: string;
  message?: string;
  imageDigest?: string;
  dockerfileId: number;
  dockerfileRevisionId?: number;
  username: string;
  createdAt: string;
  startTime?: string;
  completionTime?: string;
}

/**
 * 사용자가 빌드 다이얼로그에서 입력하는 이미지 메타데이터(전부 선택).
 * 빈 값은 build.ts 가 Dockerfile/태그 기반 기본값으로 채우거나 생략한다.
 * 최종적으로 OCI 표준 키(org.opencontainers.image.*)로 매핑되어 CR spec.imageLabels 에 실린다.
 */
export interface ImageMetadata {
  /** org.opencontainers.image.version (미입력 시 빌드 태그 사용) */
  version?: string;
  /** org.opencontainers.image.authors (미입력 시 Dockerfile 소유자) */
  authors?: string;
  /** org.opencontainers.image.licenses (SPDX expression) */
  licenses?: string;
  /** org.opencontainers.image.url */
  url?: string;
  /** org.opencontainers.image.documentation */
  documentation?: string;
  /** 임의 커스텀 라벨 (key=value). 빈 key 는 무시된다. */
  customLabels?: { key: string; value: string }[];
}

/**
 * 빌드 실행 입력. 프론트가 ImageBuild CR 을 직접 조립하므로 저장된 Dockerfile 전체와 빌드 옵션을 받는다.
 * (CR spec 에 dockerfileContent 를 inline 하고, 라벨/어노테이션에 dockerfile 메타를 싣는다.)
 */
export interface RunBuildInput {
  /** 저장된 Dockerfile (EDIT 모드=조회분, CREATE-후-빌드=생성 응답). 에디터 버퍼가 아닌 저장본을 쓴다. */
  dockerfile: Dockerfile;
  /** ImageHub/ImageName 까지의 이미지 ref (태그 제외) */
  targetImage: string;
  tag: string;
  pushSecretRef?: string;
  buildContextPvc?: string;
  buildContextSubPath?: string;
  /** 이미지에 baking 할 OCI/커스텀 라벨 입력 (선택) */
  metadata?: ImageMetadata;
}

/* ── k8s ImageBuild CR (k8sproxy 직접 조회용 raw 타입) ── */

export interface ImageBuildCrStatus {
  phase?: BuildPhase;
  message?: string;
  imageDigest?: string;
  startTime?: string;
  completionTime?: string;
}

export interface ImageBuildCr {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    targetImage: string;
    [key: string]: unknown;
  };
  status?: ImageBuildCrStatus;
}

export interface ImageBuildList {
  items: ImageBuildCr[];
}
