# AIPub Brewery Web — MVP 실행계획 & 개발 현황

> 최종 업데이트: 2026-04-20
> 프로젝트: aipub-brewery-web
> 목표: 웹 기반 Dockerfile 편집 → 저장 → 이미지 빌드 → 결과 확인 E2E 플로우 구현

---

## 1. 기술 스택

| 분류 | 기술 | 버전 |
|---|---|---|
| Framework | React + TypeScript | 19 / TS 6 |
| Build | Vite | 8 |
| Styling | TailwindCSS | 4 |
| 서버 상태 | TanStack Query | 5 |
| 폼 관리 | React Hook Form + Zod | 7 / Zod 4 |
| UI 컴포넌트 | Radix UI + Lucide Icons | - |
| 코드 에디터 | Monaco Editor (@monaco-editor/react) | 4 |
| 라우팅 | React Router | 7 |
| 국제화 | i18next + react-i18next | 26 / 17 |
| Mock API | MSW (Mock Service Worker) | - |
| 코드 품질 | ESLint 9 + Prettier 3 | - |

---

## 2. 프로젝트 구조

```
src/
├── api/                          # 백엔드 통신 레이어
│   ├── auth.ts                   # 로그인/로그아웃
│   ├── build.ts                  # 빌드 CRUD + SSE
│   ├── dockerfile.ts             # Dockerfile CRUD
│   └── k8s.ts                    # K8s proxy (UserAuthority, Project, ImageReview, Volume)
├── components/
│   ├── ImageSelector.tsx         # Base Image 선택 (AIPub/NGC/HuggingFace)
│   ├── VolumeBrowser.tsx         # Volume 파일 브라우저
│   └── ui/                       # 공통 UI 컴포넌트 (Radix 기반)
├── hooks/
│   ├── useAuthContext.tsx        # 인증 Context + Provider
│   ├── useBuilds.ts              # 빌드 조회/실행 + SSE 스트리밍
│   ├── useDockerfiles.ts         # Dockerfile CRUD
│   ├── useK8s.ts                 # K8s 데이터 조회
│   └── useToast.ts
├── i18n/
│   └── locales/                  # ko.json, en.json
├── layouts/
│   └── RootLayout.tsx            # 헤더 GNB + 사이드바 + 인증 가드
├── lib/
│   ├── api-client.ts             # fetch 래퍼 (401 핸들링, text/json 분기)
│   ├── dockerfile-validator.ts   # ADD 지시자 검증
│   └── utils.ts                  # cn() 유틸
├── mocks/
│   └── handlers.ts               # MSW 핸들러 (백엔드 미구동 시 사용)
├── pages/
│   ├── LoginPage.tsx
│   ├── HomePage.tsx
│   ├── dockerfile/
│   │   ├── DockerfileListPage.tsx
│   │   └── DockerfileEditorPage.tsx
│   └── build/
│       ├── BuildListPage.tsx
│       └── BuildDetailPage.tsx
├── types/                        # TypeScript 타입
├── router.tsx
├── App.tsx
├── main.tsx
└── index.css
```

---

## 3. 라우팅 구조

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/login` | LoginPage | 로그인 |
| `/` | HomePage | 홈 대시보드 (프로젝트 목록, Quick Actions) |
| `/dockerfiles` | DockerfileListPage | Dockerfile 목록 (프로젝트 필터링) |
| `/dockerfiles/new` | DockerfileEditorPage | 새 Dockerfile 생성 |
| `/dockerfiles/:id/edit` | DockerfileEditorPage | Dockerfile 편집 |
| `/builds` | BuildListPage | 빌드 히스토리 (프로젝트 필터링) |
| `/builds/:namespace/:name` | BuildDetailPage | 빌드 상세 (SSE 실시간 로그) |

---

## 4. 백엔드 API 스펙

백엔드(`aipub-web-server`) API는 확정 완료. MVP Gap 분석에서 제기된 모든 항목(`description` 필드, 빌드 목록 API, COPY 허용, 파일 업로드, 외부 레지스트리 프록시, SSE 로그 스트리밍)이 백엔드에 반영됨.

### 4.1 Dockerfile

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/dockerfiles?project=&username=` | 목록 조회 |
| POST | `/api/v1/dockerfiles` | 생성 (name, description, content, project, username) |
| GET | `/api/v1/dockerfiles/{id}` | 단건 조회 |
| PUT | `/api/v1/dockerfiles/{id}` | 수정 (name, description, content) |
| DELETE | `/api/v1/dockerfiles/{id}` | 삭제 |

### 4.2 Build Context File (파일 업로드)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/dockerfiles/{id}/files` | 파일 목록 |
| POST | `/api/v1/dockerfiles/{id}/files?targetPath=` | 업로드 (multipart) |
| DELETE | `/api/v1/dockerfiles/{id}/files/{fileId}` | 삭제 |

### 4.3 ImageBuild

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/builds?project=` | 빌드 목록 |
| POST | `/api/v1/builds` | 빌드 트리거 |
| GET | `/api/v1/builds/{ns}/{name}` | 빌드 상태 조회 |
| GET | `/api/v1/builds/{ns}/{name}/logs` | 빌드 로그 (일회성, `text/plain`) |
| GET | `/api/v1/builds/{ns}/{name}/logs/stream` | 빌드 로그 SSE 스트리밍 |

SSE 포맷: `data: <line>\n\n`, 종료 이벤트는 `event: done\ndata: [DONE]\n\n`.

### 4.4 Volume

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/volumes/{ns}` | Volume 목록 |
| GET | `/api/v1/volumes/{ns}/{name}/browse?path=/` | Volume 파일 브라우저 |

### 4.5 External Registry

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/registries/ngc/images?query=&page=&pageSize=` | NGC 검색 |
| GET | `/api/v1/registries/ngc/images/{org}/{repo}/tags` | NGC 태그 |
| GET | `/api/v1/registries/huggingface/images?query=&page=&pageSize=` | HF 검색 |
| GET | `/api/v1/registries/huggingface/images/{repo}/tags` | HF 태그 |

### 4.6 Auth / K8s Proxy

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/v1alpha1/login` | 로그인 (x-www-form-urlencoded) |
| POST | `/api/v1alpha1/logout` | 로그아웃 |
| POST | `/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews` | 유저 권한 분석 |
| GET | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/{name}` | Project 조회 |
| POST | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews` | ImageReview |

> K8s API 상세는 `docs/k8s-backend-integration.md` 참조.

---

## 5. 단계별 구현 이력

### Phase 1: Dockerfile 관리 (CRUD) — ✅ 완료 (2026-04-17)

- Dockerfile 목록 페이지 (`/dockerfiles`)
- Monaco Editor 기반 Dockerfile 편집 (구문 하이라이팅)
- COPY/ADD 지시자 실시간 검증 (에디터 마커 + 경고 배너) — 이후 백엔드 스펙 확정에 따라 `ADD`만 reject, `COPY`는 허용
- Dockerfile CRUD API 연동 (TanStack Query)
- MSW 기반 Mock API (백엔드 미구동 시 독립 개발 지원)

### Phase 2: 이미지 빌드 — ✅ 완료 (2026-04-17)

- 빌드 실행 다이얼로그 (이미지명 + 태그 + ImageHub 선택 + 빌드 컨텍스트 Volume 지정)
- 빌드 목록 페이지 (`/builds`)
- 빌드 상세 페이지 (`/builds/:namespace/:name`)
- 빌드 상태 폴링 (Pending/Preparing/Building 시 3초)
- 빌드 로그 폴링 (5초) — Phase 7에서 SSE로 고도화

### Phase 3: AIPub 디자인 시스템 — ✅ 완료 (2026-04-17)

- 레이아웃: 헤더 GNB + 사이드바 + 브레드크럼 + 메인 콘텐츠
- AIPub 스타일 데이터 테이블 (체크박스, 페이지네이션, 검색)
- Create 폼 패턴, Pretendard 폰트, AIPub Blue 팔레트
- 사이드바 토글
- 공통 UI: Button, Input, Label, Checkbox, Dialog, EmptyState, Badge, Toast, Table

### Phase 4: Dockerfile 생성 폼 UI — ✅ 완료 (2026-04-18)

- **입력 폼 / 에디터 모드 토글**: 폼으로 입력하면 Dockerfile 자동 생성
- Base Image 입력 + "가져오기" 버튼 (ImageSelector 연동) — 필수 필드로 지정
- 고정 섹션이 아닌 **순서 변경 가능한 Instruction Block 리스트** 도입
  - 블록 타입: RUN / COPY (파일 업로드) / COPY (Volume) / ENV
  - 위/아래 화살표 순서 변경, 추가/삭제
  - 컬러 코딩 (RUN: 파랑, COPY Upload: 주황, COPY Volume: 초록, ENV: 보라)
  - ENV 블록 내에서 key-value 페어 다수 추가 가능 (Phase 8 개선)
- FROM 최상단 고정, WORKDIR/CMD/EXPOSE 하단 고정
- 우측 Monaco Editor 미리보기 (실시간 동기화)
- Dockerfile description 필드 지원 (3000자, 선택)

### Phase 5: 로그인 및 인증 — ✅ 완료 (2026-04-18)

- 로그인 페이지 (`/login`) — 좌 브랜딩 + 우 로그인 폼
- `POST /api/v1alpha1/login` (x-www-form-urlencoded)
- 쿠키 기반 세션 관리 (AIPUB_ACCESS_COOKIE / ID / REFRESH, HttpOnly)
- API 클라이언트 401 → `/login` 리다이렉트
- 프로필 드롭다운 + Sign out (`POST /api/v1alpha1/logout`)

### Phase 6: K8s 연동 및 프로젝트 기반 관리 — ✅ 완료 (2026-04-18)

- **인증 컨텍스트 / 프로젝트 관리**
  - `AuthProvider` + `useAuth()`로 로그인 사용자 정보 및 프로젝트 목록 중앙 관리
  - `UserAuthorityReview`로 접근 가능한 Project 파악
  - 프로젝트 없는 사용자 차단 (`NoProjectGuard`)
  - 홈 대시보드 (환영 메시지, Quick Actions, 프로젝트 목록)

- **프로젝트 기반 필터링**
  - Dockerfiles / Builds 리스트에 프로젝트 드롭다운 (기본: 모든 프로젝트 통합)
  - `useDockerfilesMulti`, `useBuildsMulti` — `useQueries` 기반 멀티 프로젝트 병렬 조회

- **Base Image 선택 (ImageSelector)**
  - 3컬럼 레이아웃: ImageHub → Repository → Tag
  - Project CR → `spec.binding.imageHubs`로 사용 가능한 ImageHub 확인
  - ImageReview API로 리포지토리/태그 조회
  - 최종 경로 조합: `${HARBOR_URL}/${imageHub}/${repo}:${tag}`

- **외부 레지스트리 연동**
  - ImageSelector 탭: AIPub ImageHub / NGC Catalog / Hugging Face
  - NGC: `nvcr.io/nvidia/...`, HF: `ghcr.io/huggingface/...`
  - 검색 → 태그 선택 2단계 UI, 백엔드 프록시 API 사용

- **AIPub Volume 연동 (Volume 파일 브라우저 포함)**
  - 2컬럼 다이얼로그: 좌 Volume 목록(이름, 용량, 사용량), 우 파일/디렉토리 테이블(이름, 크기, 수정일, 브레드크럼 네비게이션)
  - COPY (Volume) 블록 "찾아보기" 버튼에서 호출
  - 백엔드는 임시 Pod 방식으로 PVC 마운트 → 파일 목록 반환

- **파일 업로드**
  - 로컬 파일 업로드 UI (파일 추가 버튼, 업로드 파일 태그 목록)
  - COPY (파일 업로드) 블록에서 드롭다운 선택

### Phase 7: SSE 실시간 빌드 로그 — ✅ 완료 (2026-04-18)

- **SSE (Server-Sent Events) 기반 실시간 빌드 로그 스트리밍**
  - `GET /api/v1/builds/{ns}/{name}/logs/stream`
  - `useBuildLogStream` hook — EventSource 기반, `data` 메시지 + `done` 이벤트 처리

- **GitHub Actions 스타일 빌드 상세 페이지**
  - 좌: 빌드 단계 타임라인 (빌드 대기 → 빌드 준비 → 이미지 빌드 → 이미지 Push) + 빌드 정보 카드
  - 우: 실시간 로그 뷰어 (구문 하이라이팅, 라인 번호, Live 인디케이터)

- **로그 표시 로직**
  - `logText = streamText || staticLogs || ''` — SSE로 수집한 로그를 완료 후에도 유지
  - `/logs`(text/plain) 응답 파싱을 위해 `api-client`에 `responseType: 'text'` 옵션 추가

- **Build phase 확장**: `Preparing`, `Building` 추가

### Phase 8: UX 개선 및 시각 사이즈 정비 — ✅ 완료 (2026-04-20)

- **로그인 페이지**: 좌 브랜딩 + 우 로그인 카드를 `max-w-6xl`로 감싸 중앙 정렬. 로고/텍스트/입력 사이즈 1.5배 확대 (`AIPub` → `AIPub Brewery`)

- **페이지 중앙 정렬**: HomePage / DockerfileListPage / BuildListPage / BuildDetailPage에 `mx-auto w-[60%]` 적용. DockerfileEditorPage는 2컬럼 레이아웃 특성상 `mx-auto w-full max-w-[1400px]`

- **UI 컴포넌트 디폴트 크기 상향** (Login은 className override로 기존 크기 유지)
  - Button: `h-10 text-base` (기본), icon: `h-9 w-9`
  - Input: `h-11 text-base`
  - Label: `text-base`
  - Table: header `h-12 text-sm`, cell `py-3.5 text-base`
  - Badge: `text-sm`

- **리스트 컬럼 정비**
  - Dockerfiles: `No` 제거, `Status` 최우측, `Age`(상대 시간) → `Creation Time`(`YYYY-MM-DD HH:mm`)

- **ENV Instruction Block 개선**: 블록 1개 안에 key-value 페어 여러 개 추가/삭제 (`ENV k1=v1 k2=v2 ...` 한 줄 문법)

- **Dockerfile 에디터 개선**
  - "이미지 (FROM)" → "베이스 이미지"
  - 베이스 이미지 필수 필드 지정 (`*` 표시 + 제출 시 검증)

- **빌드 상세 단계 설명 수정**
  - 빌드 대기: `빌드 컨텍스트 구성 중`
  - 이미지 빌드: `이미지 빌드 실행`
  - 이미지 Push: `ImageHub 이미지 push`

---

## 6. 주요 기술 결정 사항

- **서버 상태 관리 — TanStack Query**: 캐싱/자동 갱신/폴링(`refetchInterval`) 활용. 별도 전역 상태 라이브러리는 미도입.
- **`useQueries` 기반 멀티 프로젝트 조회**: React hooks 규칙을 지키면서 여러 프로젝트 API를 병렬 호출.
- **SSE over WebSocket**: 빌드 로그 실시간 스트리밍은 단방향이라 SSE로 충분. WebSocket 복잡도 회피.
- **Instruction Block 패턴**: 사용자가 Dockerfile 지시자 순서를 직접 제어. 향후 Dockerfile 파싱 → 블록 복원도 가능한 구조.
- **3컬럼 ImageSelector**: ImageHub → Repo → Tag를 한눈에 탐색.
- **AuthProvider Context**: UserAuthorityReview 기반 프로젝트 접근 권한을 중앙 관리.
- **MSW Mock**: 백엔드 미구동 상태에서도 독립 개발 가능. 실제 백엔드 연동 시에도 MSW는 유지.
- **Tailwind `twMerge` 기반 className override**: UI 컴포넌트 디폴트 크기를 변경해도 페이지별 override(className)는 계속 우선 적용.

---

## 7. 비기능 요구사항

- **국제화**: 한국어(기본) / 영어. i18next 기반.
- **접근성**: Radix UI 기반 WAI-ARIA 준수.
- **코드 품질**: ESLint + Prettier 자동 포맷.
- **빌드 최적화**: Vite 코드 스플리팅, 트리쉐이킹.

---

## 8. 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_HARBOR_URL` | `aipub-harbor.cluster7.idc1.ten1010.io` | Harbor ImageHub 주소 |
| `VITE_API_BASE_URL` | (빈 값) | API 베이스 URL (상대 경로 사용 시 빈 값) |

---

## 9. 고도화 백로그 (Post-MVP)

MVP Definition of Done 이후 검토할 항목들. CLAUDE.md의 "향후 고도화 작업 리스트"와 연동.

### 9.1 Dockerfile 관리 고도화
- 버전 관리(Git-like: commit/diff/rollback)
- 템플릿 라이브러리 (PyTorch+CUDA, TensorFlow, JupyterLab, HuggingFace 등)
- Fork/Clone
- Lint & Best Practice 검증 (Hadolint, ML 특화 룰)
- LLM 기반 Dockerfile Assistant

### 9.2 이미지 메타 / 계보 관리
- 이미지 ↔ Dockerfile ↔ 빌드 로그 연결 (재현성)
- 이미지 사용처 표시 (어떤 Workspace/Job이 쓰는지)
- 이미지 레이어/패키지 diff
- Harbor Trivy 취약점 스캔 결과 노출
- 태깅 정책 / Retention

### 9.3 빌드 파이프라인 고도화
- Kaniko 원격 캐시 활용
- 빌드 큐 및 Project 단위 동시 빌드 쿼터
- 빌드 로그 영구 보관 및 검색
- 베이스 이미지 업데이트 감지 → 자동 재빌드
- AIPub ChainJob 연계 (빌드 → 학습 → 평가)
- Multi-stage 빌드 시각화
- 멀티 아키텍처 빌드

### 9.4 운영 / 거버넌스
- Project 단위 빌드 정책 (화이트리스트, root 금지, 이미지 크기 제한)
- 빌드 사용량 대시보드
- 감사 로그

### 9.5 UX 보완
- 로딩 스켈레톤
- 에러 바운더리
- 다크 모드
- 테스트 코드 (Jest, Playwright)

---

## 10. 마일스톤

| 단계 | 범위 | 상태 |
|---|---|---|
| M1 | Phase 1 (Dockerfile CRUD) | ✅ 완료 (2026-04-17) |
| M2 | Phase 2 (빌드 실행/조회) | ✅ 완료 (2026-04-17) |
| M3 | Phase 3 (UI 공통 / AIPub 디자인) | ✅ 완료 (2026-04-17) |
| M4 | Phase 4 (Dockerfile 폼 UI) | ✅ 완료 (2026-04-18) |
| M5 | Phase 5 (로그인 / 인증) | ✅ 완료 (2026-04-18) |
| M6 | Phase 6 (K8s 연동, 프로젝트 / ImageSelector / Volume) | ✅ 완료 (2026-04-18) |
| M7 | Phase 7 (SSE 실시간 로그) | ✅ 완료 (2026-04-18) |
| M8 | Phase 8 (UX 개선, 사이즈 정비, ENV 다중 페어) | ✅ 완료 (2026-04-20) |
| M9 | Post-MVP 백로그 | 예정 |

---

## 11. 관련 문서

- `../CLAUDE.md` — 서비스 기획서
- `./k8s-backend-integration.md` — K8s API 프록시 및 CR 레퍼런스
