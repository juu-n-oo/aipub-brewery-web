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

/* ── AipubUser (k8s CR, cluster-scoped) ── */

export interface AipubUser {
  metadata: { name: string };
  spec: { id: string };
  status: {
    allBoundImageHubs: string[];
    allBoundProjects: string[];
  };
}

/* ── ImageHub (aipub backend REST: GET /api/v1alpha1/imagehubs) ── */

/** aipub backend 가 반환하는 ImageHub 목록 항목(평탄 배열). 토큰 role 로 접근 가능 항목만 응답된다. */
export interface ImageHubListItem {
  id: string;
  name: string;
  public: boolean;
  repoCount: number;
  createdTimestamp: number;
  updatedTimestamp: number;
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
