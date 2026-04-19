# 백엔드 API Gap 분석

> 최종 업데이트: 2026-04-18
> 상태: **백엔드 API 확정 — 프론트엔드 연동 작업 진행**

---

## 1. 백엔드 API 반영 완료 (모든 요청 사항 해결)

| # | 항목 | 상태 |
|---|---|---|
| 1 | Dockerfile `description` 필드 | ✅ Create, Update, Response에 추가 |
| 2 | DockerfileUpdateRequest 확장 | ✅ name, description 수정 가능 |
| 3 | 빌드 목록 조회 API | ✅ `GET /api/v1/builds?project=` |
| 4 | 빌드 응답 필드 | ✅ dockerfileId, username, createdAt 추가 |
| 5 | COPY 지시자 허용 | ✅ COPY 허용, ADD만 reject |
| 6 | 파일 업로드 API | ✅ POST/GET/DELETE 엔드포인트 |
| 7 | 외부 레지스트리 프록시 | ✅ NGC, HuggingFace 검색/태그 API |
| 8 | SSE 로그 스트리밍 | ✅ `GET /builds/{ns}/{name}/logs/stream` (text/event-stream) |

---

## 2. 프론트엔드 연동 수정 작업 목록

### 2.1 타입 및 필드명 변경

| 파일 | 변경 내용 |
|---|---|
| `src/types/dockerfile.ts` | `id: string` → `number`, `projectId` → `project`, `createdBy` → `username`, `description` 추가, `contextFiles` 추가 |
| `src/types/build.ts` | `id` 제거 → `name`+`namespace` 식별, `projectId` → `namespace`, `createdBy` → `username`, `Running` 제거 |
| `src/types/k8s.ts` | Volume 타입은 백엔드 `VolumeInfo` 스키마에 맞춤 (`ready: boolean` 등) |

### 2.2 API 클라이언트 변경

| 파일 | 변경 내용 |
|---|---|
| `src/api/dockerfile.ts` | 쿼리 `projectId` → `project`, Create에 `username` 포함 |
| `src/api/build.ts` | 목록: `?project=`, 상세: `/{ns}/{name}`, 로그: `/{ns}/{name}/logs`, SSE: `/{ns}/{name}/logs/stream` |
| `src/api/k8s.ts` | Volume: `/api/v1/volumes/{ns}` (K8s proxy 대신), browse: `/browse?path=` |

### 2.3 외부 레지스트리 API 분리

| 현재 (mock) | 백엔드 스펙 |
|---|---|
| `GET /registries/{registry}/search?q=` (통합) | 검색: `GET /registries/ngc/images?query=` |
| tags 포함 반환 | 태그: `GET /registries/ngc/images/{org}/{repo}/tags` |
| | HF: `GET /registries/huggingface/images?query=` + `/{repo}/tags` |

### 2.4 파일 업로드 서버 연동

| 현재 | 백엔드 스펙 |
|---|---|
| 로컬 state (Map<string, File>) | `POST /dockerfiles/{id}/files` (multipart, targetPath query) |
| | `GET /dockerfiles/{id}/files` (목록 조회) |
| | `DELETE /dockerfiles/{id}/files/{fileId}` |
| | 응답: `BuildContextFileResponse { id, fileName, targetPath, fileSize, uploadedAt }` |

### 2.5 SSE 로그 스트리밍 경로 변경

| 현재 (mock) | 백엔드 스펙 |
|---|---|
| `GET /builds/{id}/logs/stream` | `GET /builds/{namespace}/{name}/logs/stream` |
| `[DONE]` message event | `done` named event + `data: [DONE]` |

### 2.6 라우팅 변경

| 현재 | 변경 |
|---|---|
| `/builds/:id` | `/builds/:namespace/:name` |

### 2.7 VolumeBrowser 타입 맞춤

| 현재 | 백엔드 스펙 |
|---|---|
| `type: "file" / "directory"` | `type: "FILE" / "DIRECTORY"` |
| `modTime` | `modifiedAt` |

---

## 3. 백엔드 API 엔드포인트 최종 정리

### Dockerfile

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/dockerfiles?project=&username=` | 목록 조회 |
| POST | `/api/v1/dockerfiles` | 생성 |
| GET | `/api/v1/dockerfiles/{id}` | 단건 조회 |
| PUT | `/api/v1/dockerfiles/{id}` | 수정 |
| DELETE | `/api/v1/dockerfiles/{id}` | 삭제 |

### BuildContextFile

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/dockerfiles/{id}/files` | 파일 목록 |
| POST | `/api/v1/dockerfiles/{id}/files?targetPath=` | 파일 업로드 (multipart) |
| DELETE | `/api/v1/dockerfiles/{id}/files/{fileId}` | 파일 삭제 |

### ImageBuild

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/builds?project=` | 빌드 목록 |
| POST | `/api/v1/builds` | 빌드 트리거 |
| GET | `/api/v1/builds/{ns}/{name}` | 빌드 상태 조회 |
| GET | `/api/v1/builds/{ns}/{name}/logs` | 빌드 로그 (일회성, text/plain) |
| GET | `/api/v1/builds/{ns}/{name}/logs/stream` | 빌드 로그 (SSE 스트리밍) |

### Volume

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/volumes/{ns}` | Volume 목록 |
| GET | `/api/v1/volumes/{ns}/{name}/browse?path=/` | 파일 브라우저 |

### Registry

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/registries/ngc/images?query=&page=&pageSize=` | NGC 검색 |
| GET | `/api/v1/registries/ngc/images/{org}/{repo}/tags` | NGC 태그 |
| GET | `/api/v1/registries/huggingface/images?query=&page=&pageSize=` | HF 검색 |
| GET | `/api/v1/registries/huggingface/images/{repo}/tags` | HF 태그 |

### Auth

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/v1alpha1/login` | 로그인 (x-www-form-urlencoded) |
| POST | `/api/v1alpha1/logout` | 로그아웃 |

### K8s Proxy (프론트에서 직접 호출)

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews` | 유저 권한 분석 |
| GET | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/{name}` | Project 조회 |
| POST | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews` | ImageReview |
