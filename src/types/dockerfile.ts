import type { BuildContextFileResponse } from './build-context-file';

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
  contextFiles: BuildContextFileResponse[];
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
}
