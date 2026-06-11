/**
 * Image Catalog — AIPub 제공 읽기 전용 큐레이션 base 이미지(Harbor 전용 `base-catalog` 프로젝트).
 * `GET /image-catalog/api/images`(목록) · `GET /image-catalog/api/images/{name}`(상세) 응답 스키마.
 * 목록 응답에서는 `versions=[]`·`latestPullReference=null`·`latestTag='-'` 로 비어 있고,
 * 상세 응답에서 `versions` 와 latest* 가 채워진다.
 */
export interface CatalogImageVersion {
  tag: string;
  digest: string;
  shortDigest: string;
  /** 곧바로 base 이미지로 사용할 수 있는 full reference (host/project/name:tag). */
  pullReference: string;
  os: string;
  arch: string;
  sizeHuman: string;
  pushedDate: string;
}

export interface CatalogImage {
  name: string;
  displayName: string;
  /** 카탈로그 프로젝트 경로 포함 이름 (예: `base-catalog/nginx`). */
  fullName: string;
  category: string;
  /** 서버가 큐레이션한 신뢰된 설명 HTML. */
  descriptionHtml: string;
  logoText: string;
  registryHost: string;
  /** host + 카탈로그 프로젝트 경로 (예: `aipub-harbor.../base-catalog`). */
  pullPrefix: string;
  latestTag: string;
  latestPullReference: string | null;
  tagCount: number;
  pullCount: number;
  updatedDate: string;
  versions: CatalogImageVersion[];
}
