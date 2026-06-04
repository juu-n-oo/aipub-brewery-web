export type BuildPhase = 'Pending' | 'Preparing' | 'Building' | 'Succeeded' | 'Failed';

export interface ImageBuild {
  name: string;
  namespace: string;
  phase: BuildPhase;
  targetImage: string;
  message?: string;
  imageDigest?: string;
  dockerfileId: number;
  username: string;
  createdAt: string;
  startTime?: string;
  completionTime?: string;
}

export interface ImageBuildRequest {
  dockerfileId: number;
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
