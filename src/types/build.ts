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
}
