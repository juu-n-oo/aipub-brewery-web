# AIPub Brewery Web — 개발 작업 로그

> 프로젝트: aipub-brewery-web
> 기간: 2026-04-17 ~ 2026-04-18
> 기술 스택: React 19 + TypeScript + Vite 8 + TailwindCSS 4 + TanStack Query + Monaco Editor

---

## 작업 요약

AIPub 플랫폼 내 웹 기반 Dockerfile 편집 및 이미지 빌드/관리 서비스(AIPub Brewery)의 프론트엔드를 개발했다.

---

## Phase 1: Dockerfile 관리 (CRUD) — 2026-04-17

### 작업 내용
- Dockerfile 목록 페이지 (`/dockerfiles`)
- Dockerfile 생성/편집 페이지 (`/dockerfiles/new`, `/dockerfiles/:id/edit`)
- Monaco Editor 기반 Dockerfile 편집기 (구문 하이라이팅)
- COPY/ADD 지시자 실시간 검증 (에디터 마커 + 경고 배너)
- Dockerfile CRUD API 연동 (TanStack Query)
- MSW 기반 Mock API

### 파일
- `src/pages/dockerfile/DockerfileListPage.tsx`
- `src/pages/dockerfile/DockerfileEditorPage.tsx`
- `src/hooks/useDockerfiles.ts`
- `src/api/dockerfile.ts`
- `src/types/dockerfile.ts`
- `src/lib/dockerfile-validator.ts`

---

## Phase 2: 이미지 빌드 — 2026-04-17

### 작업 내용
- 빌드 실행 다이얼로그 (이미지명 + 태그 입력)
- 빌드 목록 페이지 (`/builds`)
- 빌드 상세 페이지 (`/builds/:id`) — 메타 정보 + 로그 뷰어
- 빌드 상태 폴링 (Running 시 3초 간격)
- 빌드 로그 폴링 (5초 간격)

### 파일
- `src/pages/build/BuildListPage.tsx`
- `src/pages/build/BuildDetailPage.tsx`
- `src/hooks/useBuilds.ts`
- `src/api/build.ts`
- `src/types/build.ts`

---

## Phase 3: AIPub 디자인 시스템 적용 — 2026-04-17

### 작업 내용
- AIPub 실제 웹서비스(`/workspaces`, `/workspaces/create`)의 디자인 참조
- 레이아웃: 헤더 GNB + 사이드바 + 브레드크럼 + 메인 콘텐츠
- AIPub 스타일 데이터 테이블 (체크박스, 페이지네이션, 검색, 정렬 컬럼)
- Create 폼 패턴 (섹션별 구분, "가져오기" 버튼, Cancel/Create 액션바)
- Pretendard 폰트, AIPub Blue 컬러 팔레트
- 사이드바 토글 기능

### 파일
- `src/layouts/RootLayout.tsx`
- `src/index.css` (테마 변수)
- `src/components/ui/` (Button, Input, Table, Badge, Checkbox, Dialog, EmptyState, Label)

---

## Phase 4: Dockerfile 생성 폼 UI 개선 — 2026-04-18

### 작업 내용
- **입력 폼 / 에디터 모드 토글**: 폼으로 입력하면 Dockerfile 자동 생성
- Base Image 입력 + "가져오기" 버튼 (ImageSelector 연동)
- 시스템 패키지 입력 (공백/쉼표 구분)
- Python 패키지: 패키지 이름 + 버전(optional) key-value 입력
- ENV 환경 변수 key-value 입력
- WORKDIR, EXPOSE, CMD 입력
- 우측 Monaco Editor 미리보기 (실시간 동기화)

### 이후 Instruction Block 방식으로 리팩토링
- 고정 섹션 → **순서 변경 가능한 명령어 블록 리스트**
- 블록 타입: RUN, COPY (파일 업로드), COPY (Volume), ENV
- 위/아래 화살표로 순서 변경, 추가/삭제
- 컬러 코딩 (RUN: 파란색, COPY Upload: 주황색, COPY Volume: 초록색, ENV: 보라색)
- FROM은 최상단 고정, WORKDIR/CMD/EXPOSE는 하단 고정

---

## Phase 5: 로그인 — 2026-04-18

### 작업 내용
- 로그인 페이지 (`/login`) — AIPub 로그인 디자인 재현
- `POST /api/v1alpha1/login` (x-www-form-urlencoded)
- 쿠키 기반 세션 관리 (AIPUB_ACCESS_COOKIE, AIPUB_ID_COOKIE, AIPUB_REFRESH_COOKIE)
- API 클라이언트에 401 → `/login` 리다이렉트 추가
- 프로필 드롭다운 + Sign out 기능 (`POST /api/v1alpha1/logout`)

### 파일
- `src/pages/LoginPage.tsx`
- `src/api/auth.ts`
- `src/lib/api-client.ts` (401 핸들링)

---

## Phase 6: K8s 연동 및 프로젝트 기반 관리 — 2026-04-18

### 작업 내용

#### 6.1 인증 컨텍스트 및 프로젝트 관리
- `AuthProvider` + `useAuth()` — 로그인 사용자 정보 및 프로젝트 목록 관리
- `UserAuthorityReview` API 호출로 접근 가능한 프로젝트 파악
- 프로젝트 없는 사용자 차단 (`NoProjectGuard`)
- 홈 페이지 (`/`) — 환영 메시지, Quick Actions, 프로젝트 목록

#### 6.2 프로젝트 기반 필터링
- Dockerfiles, Builds 리스트에 프로젝트 드롭다운 필터 추가
- 기본값: 모든 프로젝트 통합 표시
- `useDockerfilesMulti`, `useBuildsMulti` — `useQueries` 기반 멀티 프로젝트 조회

#### 6.3 Base Image 선택 (ImageSelector)
- 3컬럼 레이아웃: ImageHub → Repository → Tag
- Project CR 조회 → `spec.binding.imageHubs`에서 사용 가능한 ImageHub 확인
- ImageReview API로 리포지토리/태그 목록 조회
- 최종 경로: `${HARBOR_URL}/${imageHub}/${repo}:${tag}`

#### 6.4 외부 레지스트리 연동
- ImageSelector에 탭 추가: AIPub ImageHub / NGC Catalog / Hugging Face
- 검색 → 이미지 선택 → 태그 선택 2단계 UI
- NGC: `nvcr.io/nvidia/pytorch:24.04-py3` 형태
- HF: `ghcr.io/huggingface/text-generation-inference:2.0` 형태
- Mock API로 동작, 백엔드 프록시 API 구현 완료 대기

#### 6.5 AIPub Volume 연동
- Volume 목록 조회 API 연동
- Volume 파일 브라우저 (`VolumeBrowser`) — 2컬럼 다이얼로그
  - 좌: Volume 목록 (이름, 용량, 사용량)
  - 우: 파일/디렉토리 테이블 (이름, 크기, 수정일, 브레드크럼 네비게이션)
- COPY (Volume) 블록에서 "찾아보기" 버튼으로 파일 선택
- Mock API로 파일 시스템 시뮬레이션

#### 6.6 파일 업로드
- 로컬 파일 업로드 UI (파일 추가 버튼, 업로드된 파일 태그 목록)
- COPY (파일 업로드) 블록에서 업로드된 파일 드롭다운 선택

### 파일
- `src/hooks/useAuthContext.tsx`
- `src/hooks/useK8s.ts`
- `src/api/k8s.ts`
- `src/types/k8s.ts`
- `src/components/ImageSelector.tsx`
- `src/components/VolumeBrowser.tsx`
- `src/pages/HomePage.tsx`
- `.env` (VITE_HARBOR_URL)

---

## Phase 7: 빌드 실시간 로그 스트리밍 — 2026-04-18

### 작업 내용
- **SSE (Server-Sent Events)** 기반 실시간 빌드 로그 스트리밍
- GitHub Actions 스타일 빌드 상세 페이지 레이아웃:
  - 좌측: 빌드 단계 타임라인 (대기 → 준비 → 빌드 → Push) + 빌드 정보
  - 우측: 실시간 로그 뷰어
- 로그 구문 하이라이팅 (Kaniko 명령: 파란색, 에러: 빨간색, 성공: 초록색)
- 라인 번호 표시 + hover 하이라이트
- "Live" 인디케이터 + 자동 하단 스크롤 + 커서 깜박임
- Build phase 확장: `Preparing`, `Building` 추가
- MSW SSE mock 핸들러 (150ms 간격 로그 라인 전송)

### 파일
- `src/pages/build/BuildDetailPage.tsx` (전면 재작성)
- `src/hooks/useBuilds.ts` (`useBuildLogStream` SSE hook 추가)
- `src/mocks/handlers.ts` (SSE mock)

---

## Dockerfile description 필드 — 2026-04-18

### 작업 내용
- Dockerfile 타입에 `description` 필드 추가
- 생성/편집 폼에 설명 textarea 추가 (3000자 제한, 선택 사항)
- 생성/수정 API에 description 포함

---

## 프로젝트 구조

```
src/
├── api/
│   ├── auth.ts              # 로그인/로그아웃 API
│   ├── build.ts             # 빌드 API
│   ├── dockerfile.ts        # Dockerfile CRUD API
│   └── k8s.ts               # K8s 프록시 API (UserAuthority, Project, ImageReview, Volume)
├── components/
│   ├── ImageSelector.tsx     # Base Image 선택 (AIPub/NGC/HuggingFace)
│   ├── VolumeBrowser.tsx     # Volume 파일 브라우저
│   └── ui/                   # 공통 UI 컴포넌트
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Checkbox.tsx
│       ├── Dialog.tsx
│       ├── EmptyState.tsx
│       ├── Input.tsx
│       ├── Label.tsx
│       ├── Table.tsx
│       ├── Toast.tsx
│       └── Toaster.tsx
├── hooks/
│   ├── useAuthContext.tsx     # 인증 Context + Provider
│   ├── useBuilds.ts          # 빌드 조회/실행 hooks + SSE 스트리밍
│   ├── useDockerfiles.ts     # Dockerfile CRUD hooks
│   ├── useK8s.ts             # K8s 데이터 조회 hooks
│   └── useToast.ts
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── ko.json
│       └── en.json
├── layouts/
│   └── RootLayout.tsx        # 메인 레이아웃 (헤더, 사이드바, 인증 가드)
├── lib/
│   ├── api-client.ts         # fetch 래퍼 (401 핸들링)
│   ├── dockerfile-validator.ts  # ADD 지시자 검증
│   └── utils.ts              # cn() 유틸
├── mocks/
│   ├── browser.ts
│   ├── data.ts               # Mock 데이터
│   └── handlers.ts           # MSW 핸들러 (Auth, K8s, Dockerfile, Build, Volume, Registry, SSE)
├── pages/
│   ├── LoginPage.tsx          # 로그인
│   ├── HomePage.tsx           # 홈 대시보드
│   ├── dockerfile/
│   │   ├── DockerfileListPage.tsx    # Dockerfile 목록
│   │   └── DockerfileEditorPage.tsx  # Dockerfile 생성/편집 (Instruction Block)
│   └── build/
│       ├── BuildListPage.tsx         # 빌드 목록
│       └── BuildDetailPage.tsx       # 빌드 상세 (SSE 실시간 로그)
├── types/
│   ├── build.ts
│   ├── dockerfile.ts
│   └── k8s.ts
├── router.tsx
├── App.tsx
├── main.tsx
└── index.css

docs/
├── mvp-execution-plan.md           # MVP 실행 계획 (Phase 1-5)
├── k8s-backend-integration.md      # K8s 연동 시스템 문서
├── backend-api-gap-analysis.md     # 백엔드 API Gap 분석
├── volume-file-browser-design.md   # Volume 파일 브라우저 설계
└── development-log.md              # 개발 작업 로그 (본 문서)
```

---

## 라우팅 구조

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/login` | LoginPage | 로그인 |
| `/` | HomePage | 홈 대시보드 |
| `/dockerfiles` | DockerfileListPage | Dockerfile 목록 (프로젝트 필터링) |
| `/dockerfiles/new` | DockerfileEditorPage | 새 Dockerfile 생성 |
| `/dockerfiles/:id/edit` | DockerfileEditorPage | Dockerfile 편집 |
| `/builds` | BuildListPage | 빌드 히스토리 (프로젝트 필터링) |
| `/builds/:id` | BuildDetailPage | 빌드 상세 + 실시간 로그 |

---

## 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_HARBOR_URL` | `aipub-harbor.cluster7.idc1.ten1010.io` | Harbor ImageHub 주소 |

---

## 주요 기술 결정

1. **MSW (Mock Service Worker)** — 백엔드 미완성 상태에서 독립적 프론트엔드 개발
2. **TanStack Query `useQueries`** — 멀티 프로젝트 병렬 조회 (React hooks 규칙 준수)
3. **SSE (Server-Sent Events)** — 빌드 로그 실시간 스트리밍 (WebSocket보다 단순)
4. **Instruction Block 패턴** — Dockerfile 지시자 순서를 사용자가 직접 제어
5. **3컬럼 레이아웃** — ImageSelector에서 ImageHub → Repo → Tag 한눈에 탐색
6. **AuthProvider Context** — UserAuthorityReview 기반 프로젝트 접근 권한 중앙 관리

---

## 백엔드 협의 필요 사항

`docs/backend-api-gap-analysis.md` 참조. 주요 항목:
1. Dockerfile `description` 필드 추가
2. DockerfileUpdateRequest 확장 (name, description)
3. 빌드 목록 조회 API (`GET /api/v1/builds?project=`)
4. 빌드 응답에 dockerfileId, username, createdAt 추가
5. COPY 지시자 허용 (ADD만 reject)
6. 파일 업로드 API
