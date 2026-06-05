export interface Dockerfile {
  id: number;
  name: string;
  description: string;
  content: string;
  baseImage: string;
  project: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  latestVersion?: number;
  latestRevisionId?: number;
}

export interface DockerfileCreateRequest {
  project: string;
  name: string;
  description?: string;
  content: string;
  baseImage: string;
}

export interface DockerfileUpdateRequest {
  name?: string;
  description?: string;
  content: string;
  baseImage: string;
  message?: string;
}

export interface DockerfileRevision {
  id: number;
  dockerfileId: number;
  version: number;
  content: string;
  baseImage: string;
  message?: string;
  createdBy: string;
  createdAt: string;
}
