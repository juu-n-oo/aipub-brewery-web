# imagekit-web API 아키텍처

> 작성일: 2026-06-01  
> 최종 수정: 2026-06-02  
> 범위: 프론트엔드 API 클라이언트 구조 및 호출 패턴

---

## 1. 단일 도메인 · Sub Path 배포

프론트엔드는 **AIPub과 동일한 도메인**(`aipub.cluster10.idc1.ten1010.io`)의 sub path `/imagekit`에서 서빙된다.
API 요청은 같은 도메인의 `/api/v1alpha1`로 보내며, AIPub Ingress가 리소스 경로에 따라 imagekit backend 또는 AIPub backend로 라우팅한다.

```typescript
// src/lib/api-client.ts — imagekit backend 엔드포인트
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1alpha1`;

// src/api/k8s.ts — AIPub k8sproxy 엔드포인트 (Ingress가 AIPub으로 라우팅)
const K8S_PROXY = `${API_BASE_URL}/api/v1alpha1/k8sproxy`;

// src/api/auth.ts — AIPub 인증 엔드포인트 (Ingress가 AIPub으로 라우팅)
const LOGIN_URL = '/api/v1alpha1/login';
```

- Vite `base: '/imagekit/'` — 정적 자산 경로가 `/imagekit/assets/...`
- React Router `basename: '/imagekit'` — 페이지 라우팅이 `/imagekit/dockerfiles`, `/imagekit/builds` 등
- 모든 요청에 `credentials: 'include'` — AIPub 쿠키 자동 포함
- 401 응답 시 `/welcome`으로 리다이렉트 (AIPub 로그인 페이지)
- API 경로는 변경 없음 — 프론트엔드는 요청이 어떤 백엔드로 가는지 알 필요 없음 (Ingress가 처리)

## 2. API 클라이언트 구조

### 2.1 apiClient (`src/lib/api-client.ts`)

ImageKit 자체 엔드포인트 호출용. Ingress → imagekit backend로 라우팅됨.

```
→ /api/v1alpha1/dockerfiles
→ /api/v1alpha1/builds
→ /api/v1alpha1/volumes/{namespace}
→ /api/v1alpha1/registries/ngc/images
→ /api/v1alpha1/registries/huggingface/images
```

### 2.2 k8sRequest (`src/api/k8s.ts`)

K8s 리소스 조회용. Ingress → AIPub backend로 라우팅됨.

```
→ /api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews
→ /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/{name}
→ /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews
```

### 2.3 인증 호출 (`src/api/auth.ts`)

직접 `fetch()` 사용. Ingress → AIPub backend로 라우팅됨.

```
POST /api/v1alpha1/login              (application/x-www-form-urlencoded)
POST /api/v1alpha1/selfsubjectreviews (application/json)
POST /api/v1alpha1/logout             (RootLayout에서 호출)
```

## 3. 도메인별 API 정리

### Dockerfile (`src/api/dockerfile.ts`) → imagekit backend

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/dockerfiles?project={project}` | 목록 조회 |
| GET | `/dockerfiles/{id}` | 단건 조회 |
| POST | `/dockerfiles` | 생성 (리비전 v1 생성) |
| PUT | `/dockerfiles/{id}` | 수정 (저장 시 새 리비전 생성) |
| DELETE | `/dockerfiles/{id}` | 삭제 |
| GET | `/dockerfiles/{id}/revisions` | 리비전(버전) 목록 — `DockerfileRevisionListPage` |
| GET | `/dockerfiles/{id}/revisions/{version}` | 특정 리비전 단건 — Diff 뷰 |
| POST | `/dockerfiles/{id}/revisions/{version}/rollback` | 해당 리비전으로 롤백 |

### Build (`src/api/build.ts`) → imagekit backend

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/builds?project={project}` | 빌드 목록 |
| GET | `/builds/{namespace}/{name}` | 빌드 상태 |
| POST | `/builds` | 빌드 트리거 |
| GET | `/builds/{namespace}/{name}/logs` | 빌드 로그 (text) |
| GET | `/builds/{namespace}/{name}/logs/stream` | 빌드 로그 SSE 스트림 |

### K8s 리소스 (`src/api/k8s.ts`) → AIPub backend (via k8sproxy)

| 메서드 | k8sproxy 경로 | 리소스 | 설명 |
|--------|--------------|--------|------|
| POST | `/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews` | UserAuthorityReview | 사용자 권한 + 프로젝트 목록 |
| GET | `/apis/project.aipub.ten1010.io/v1alpha1/projects/{name}` | Project | 프로젝트 스펙 |
| POST | `/apis/project.aipub.ten1010.io/v1alpha1/imagereviews` | ImageReview | Harbor 이미지/태그 목록 |

### 볼륨 / 레지스트리 (`src/api/k8s.ts` — apiClient 사용) → imagekit backend

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/volumes/{namespace}` | AIPubVolume 목록 |
| GET | `/volumes/{namespace}/{name}/browse?path=` | 볼륨 파일 탐색 |
| POST | `/volumes/{namespace}/{name}/upload?path=` | 볼륨 지정 경로에 파일 업로드 (multipart). k8sproxy 가 exec(WebSocket) 를 지원하지 않아 백엔드 경유. 진행률 표시를 위해 fetch 대신 **XHR**(`upload.onprogress`) 사용 |
| GET | `/registries/ngc/images?query=&page=&pageSize=` | NGC 이미지 검색 |
| GET | `/registries/ngc/images/{org}/{repo}/tags` | NGC 태그 |
| GET | `/registries/huggingface/images?query=` | HuggingFace 검색 |
| GET | `/registries/huggingface/images/{repo}/tags` | HuggingFace 태그 |

## 4. 인증 상태 관리 (`src/hooks/useAuthContext.tsx`)

```
앱 초기화 시:
  1. getSelfSubjectReview() → 인증 여부 확인 (Ingress → AIPub)
  2. 미인증 → /login 리다이렉트
  3. 인증됨 → k8sApi.getUserAuthority(username) → 프로젝트 목록 (Ingress → AIPub)
  4. AuthState { username, isAdmin, projects } 설정
```

## 5. 개발 환경 프록시 (`vite.config.ts`)

```typescript
{
  base: '/imagekit/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}
```

- `base: '/imagekit/'` — 프로덕션과 동일한 sub path 환경 재현
- 개발 환경에서는 vite 프록시가 모든 `/api` 요청을 `localhost:8080`으로 보낸다.
- Ingress 라우팅이 없으므로, 개발 시에는 AIPub backend도 같은 포트에서 실행하거나 별도 프록시 설정이 필요하다.
