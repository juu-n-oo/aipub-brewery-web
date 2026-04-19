/* ── UserAuthorityReview ── */

export interface UserAuthorityReviewProject {
  name: string;
  role: string;
}

export interface UserAuthorityReview {
  status: {
    aipubRole: {
      isAdmin: boolean;
      projects: UserAuthorityReviewProject[];
    };
    authorities: Record<string, Record<string, boolean | string[]>>;
    isClusterAdmin: boolean;
  };
}

/* ── Project ── */

export interface ProjectMember {
  aipubUser: string;
  role: string;
}

export interface Project {
  metadata: { name: string };
  spec: {
    binding: {
      imageHubs: string[];
      nodeGroups: string[];
      nodes: string[];
    };
    members: ProjectMember[];
    quota: {
      extendedResources: Record<string, unknown>;
      pvcStorage: string;
    };
  };
  status: {
    allBoundAipubUsers: string[];
    allBoundImageHubs: string[];
    allBoundNodeGroups: string[];
    allBoundNodes: string[];
  };
}

/* ── ImageHub ── */

export interface ImageHub {
  metadata: { name: string };
  spec: { id: string };
  status: {
    allBoundProjects: string[];
    allBoundAipubUsers: string[];
  };
}

/* ── Volume (Backend API) ── */

export interface VolumeInfo {
  name: string;
  pvcName: string;
  capacity: string;
  used: string;
  ready: boolean;
}

export interface VolumeListResponse {
  items: VolumeInfo[];
}

export interface FileEntry {
  name: string;
  type: 'FILE' | 'DIRECTORY';
  size: number;
  modifiedAt: string;
}

export interface BrowseResponse {
  volumeName: string;
  namespace: string;
  path: string;
  entries: FileEntry[];
}

/* ── External Registry ── */

export interface RegistryImage {
  name: string;
  fullPath: string;
  description: string;
  source: 'NGC' | 'HUGGINGFACE';
}

export interface ImageSearchResponse {
  images: RegistryImage[];
  totalCount: number;
}

export interface ImageTagsResponse {
  image: string;
  tags: string[];
}

/* ── ImageReview ── */

export interface ImageReviewRepository {
  name: string;
}

export interface ImageReviewArtifact {
  digest: string;
  tags: string[];
}

export interface ImageReview {
  status: {
    repositories: ImageReviewRepository[] | null;
    artifacts: ImageReviewArtifact[] | null;
  };
}
