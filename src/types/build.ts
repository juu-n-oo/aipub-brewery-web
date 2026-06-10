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
 * 빌드 실행 입력. 프론트가 ImageBuild CR 을 직접 조립하므로 저장된 Dockerfile 전체와 빌드 옵션을 받는다.
 * (CR spec 에 dockerfileContent 를 inline 하고, 라벨/어노테이션에 dockerfile 메타를 싣는다.)
 *
 * 사용자 입력 이미지 라벨(version/authors/licenses/... )은 Dockerfile content 의 LABEL 로 들어가므로
 * 여기서 별도로 받지 않는다. spec.imageLabels 에는 빌드 시점 자동 라벨만 실린다(build.ts buildImageLabels).
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
