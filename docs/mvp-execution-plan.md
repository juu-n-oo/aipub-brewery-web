# AIPub Brewery Web — MVP 프론트엔드 실행계획

> 작성일: 2026-04-17
> 프로젝트: aipub-brewery-web
> 목표: 웹 기반 Dockerfile 편집 → 저장 → 이미지 빌드 → 결과 확인 E2E 플로우 구현

---

## 1. 기술 스택

| 분류 | 기술 | 버전 |
|---|---|---|
| Framework | React + TypeScript | 19 / TS 6 |
| Build | Vite | 8 |
| Styling | TailwindCSS | 4 |
| 상태 관리 (서버) | TanStack Query | 5 |
| 폼 관리 | React Hook Form + Zod | 7 / Zod 4 |
| UI 컴포넌트 | Radix UI + Lucide Icons | - |
| 코드 에디터 | Monaco Editor (@monaco-editor/react) | 4 |
| 라우팅 | React Router | 7 |
| 국제화 | i18next + react-i18next | 26 / 17 |
| 코드 품질 | ESLint 9 + Prettier 3 | - |

---

## 2. 프로젝트 구조

```
src/
├── api/                    # API 클라이언트 (백엔드 통신)
│   ├── build.ts
│   └── dockerfile.ts
├── components/
│   └── ui/                 # 공통 UI 컴포넌트 (Radix 기반)
├── hooks/                  # 커스텀 훅 (useDockerfiles, useBuilds 등)
├── i18n/
│   ├── index.ts
│   └── locales/            # ko.json, en.json
├── layouts/
│   └── RootLayout.tsx      # 사이드바 + Outlet
├── lib/
│   ├── api-client.ts       # fetch 래퍼
│   └── utils.ts            # cn() 등 유틸
├── pages/
│   ├── dockerfile/         # Dockerfile 목록, 에디터 페이지
│   └── build/              # 빌드 목록, 상세 페이지
├── types/                  # TypeScript 타입 정의
│   ├── build.ts
│   └── dockerfile.ts
├── router.tsx              # React Router 설정
├── App.tsx                 # 앱 진입점 (QueryClient, Router)
├── main.tsx                # DOM 렌더링
└── index.css               # TailwindCSS 임포트
```

---

## 3. 라우팅 구조

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/` | → `/dockerfiles` | 리다이렉트 |
| `/dockerfiles` | DockerfileListPage | Dockerfile 목록 조회 |
| `/dockerfiles/new` | DockerfileEditorPage | 새 Dockerfile 작성 |
| `/dockerfiles/:id/edit` | DockerfileEditorPage | Dockerfile 수정 |
| `/builds` | BuildListPage | 빌드 히스토리 목록 |
| `/builds/:id` | BuildDetailPage | 빌드 상세 (로그, 상태) |

---

## 4. API 연동 (aipub-web-server)

프록시: `vite.config.ts`에서 `/api` → `http://localhost:8080` 프록시 설정 완료.

### 4.1 Dockerfile API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/dockerfiles?projectId=` | Dockerfile 목록 조회 |
| GET | `/api/v1/dockerfiles/:id` | Dockerfile 상세 조회 |
| POST | `/api/v1/dockerfiles` | Dockerfile 생성 |
| PUT | `/api/v1/dockerfiles/:id` | Dockerfile 수정 |
| DELETE | `/api/v1/dockerfiles/:id` | Dockerfile 삭제 |

### 4.2 Build API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/builds?projectId=` | 빌드 목록 조회 |
| GET | `/api/v1/builds/:id` | 빌드 상세 조회 |
| POST | `/api/v1/builds` | 빌드 실행 요청 |
| GET | `/api/v1/builds/:id/logs` | 빌드 로그 조회 |

> **Note**: API 스펙은 백엔드 개발과 병행하여 확정 예정. 위 구조는 초안이며, 실제 백엔드 API에 맞춰 조정한다.

---

## 5. 단계별 구현 계획

### Phase 1: Dockerfile 관리 (CRUD) — ✅ 완료 (2026-04-17)

**목표**: Dockerfile을 웹에서 작성/저장/수정/삭제할 수 있다.

- [x] **1-1. Dockerfile 목록 페이지**
  - TanStack Query로 목록 조회
  - AIPub 스타일 데이터 테이블 (체크박스, No, Name, Project, Owner, Status, Age)
  - "+ Create" / "Delete" 버튼, 검색 입력, 페이지네이션
  - 편집/삭제 액션

- [x] **1-2. Dockerfile 에디터 페이지**
  - Monaco Editor 연동 (Dockerfile 언어 하이라이팅)
  - Dockerfile 이름 입력 폼 (React Hook Form + Zod 검증)
  - `COPY`/`ADD` 지시자 포함 시 경고 표시 (에디터 마커 + 배너)
  - 저장 API 연동 (생성/수정 분기)
  - 저장 성공 시 목록으로 이동

- [x] **1-3. 커스텀 훅 작성**
  - `useDockerfiles(projectId)` — 목록 조회
  - `useDockerfile(id)` — 단건 조회
  - `useCreateDockerfile()` — 생성 mutation
  - `useUpdateDockerfile()` — 수정 mutation
  - `useDeleteDockerfile()` — 삭제 mutation

### Phase 2: 이미지 빌드 — ✅ 완료 (2026-04-17)

**목표**: Dockerfile로부터 이미지 빌드를 트리거하고 결과를 확인할 수 있다.

- [x] **2-1. 빌드 실행 기능**
  - Dockerfile 에디터에서 "빌드 실행" 버튼
  - 대상 이미지/태그 입력 다이얼로그 (Radix Dialog)
  - 빌드 요청 API 연동

- [x] **2-2. 빌드 목록 페이지**
  - AIPub 스타일 빌드 히스토리 테이블 (체크박스, No, Target Image, Project, Owner, Status, Age)
  - 상태별 컬러 도트 + 라벨 (Pending/Running/Succeeded/Failed)
  - 검색, 페이지네이션
  - 행 클릭 → 상세 페이지 이동

- [x] **2-3. 빌드 상세 페이지**
  - 빌드 메타 정보 카드 (2열 그리드: Target Image, Status, Project, Owner, 생성 시간, 소요 시간, Image Digest)
  - 빌드 로그 실시간 표시 (폴링 기반, Running 상태일 때 3초 간격 자동 갱신)
  - 성공 시: 푸시된 이미지 정보 (digest) 표시
  - 실패 시: 에러 메시지 표시
  - 다크 테마 터미널 스타일 로그 뷰어

- [x] **2-4. 커스텀 훅 작성**
  - `useBuilds(projectId)` — 빌드 목록 조회
  - `useBuild(id)` — 빌드 상세 조회 (Running 시 3초 폴링)
  - `useBuildLogs(id)` — 빌드 로그 조회 (5초 폴링)
  - `useRunBuild()` — 빌드 실행 mutation

### Phase 3: UI 공통 컴포넌트 및 마무리 — ✅ 완료 (2026-04-17)

- [x] **3-1. 공통 UI 컴포넌트**
  - Button, Input, Label, Checkbox (Radix 기반)
  - Dialog, Toast
  - Table (체크박스, 페이지네이션 포함 AIPub 스타일)
  - Badge (빌드 상태 표시, count 변형)
  - EmptyState (빈 상태 컴포넌트)

- [x] **3-2. AIPub 디자인 시스템 적용** (2026-04-17)
  - AIPub /workspaces, /workspaces/create 페이지 디자인 참조
  - 사이드바 토글 (PanelLeftClose/PanelLeft 아이콘)
  - 브레드크럼 네비게이션
  - 헤더 GNB (로고, 글로벌/알림/통계/사용자 아이콘)
  - Pretendard 폰트, AIPub 컬러 팔레트 적용

- [x] **3-3. COPY/ADD 검증 로직**
  - `dockerfile-validator.ts` 유틸 함수로 `COPY`/`ADD` 지시자 감지
  - Monaco Editor에서 실시간 경고 마커 표시
  - 저장/빌드 시 클라이언트 사전 검증 (서버에서도 reject하지만 UX를 위해 이중 검증)

- [ ] **3-4. UX 보완** (미착수)
  - 로딩 스켈레톤
  - 에러 바운더리
  - 다크 모드 지원

### Phase 4: Dockerfile 생성 폼 UI 개선 — ✅ 완료 (2026-04-18)

**목표**: Input field 기반으로 Dockerfile을 쉽게 구성할 수 있는 폼 UI 제공.

- [x] **4-1. Dockerfile 생성 폼 필드 UI**
  - "입력 폼" / "에디터" 모드 토글 지원
  - Base Image 입력 필드 (+ 가져오기 버튼)
  - 시스템 패키지 입력 (공백/쉼표 구분)
  - Python 패키지: 패키지 이름 + 버전 (optional) key-value 입력, 동적 추가/삭제
  - ENV 환경 변수 key-value 입력, 동적 추가/삭제
  - WORKDIR 경로 입력
  - CMD 실행 명령 입력
  - EXPOSE 포트 입력
  - 입력 필드 기반으로 Dockerfile 내용 자동 생성
  - Monaco Editor 미리보기 (우측 패널) 실시간 동기화
  - 에디터 → 폼 전환 시 파싱을 통한 양방향 동기화

### Phase 5: 로그인 화면 — 🔄 진행 중

**목표**: AIPub 인증 시스템과 연동된 로그인 화면 구현.

- [ ] **5-1. 로그인 페이지 UI**
  - AIPub 로그인 화면 디자인 참조 (좌측 브랜딩 + 우측 로그인 폼)
  - ID / Password 입력 폼
  - Sign in 버튼, 에러 메시지 표시

- [ ] **5-2. 인증 API 연동**
  - POST `/api/v1alpha1/login` (x-www-form-urlencoded, username/password)
  - 로그인 성공 시 쿠키 기반 세션 관리 (AIPUB_ACCESS_COOKIE, AIPUB_ID_COOKIE, AIPUB_REFRESH_COOKIE)
  - 인증 상태에 따른 라우팅 가드 (미인증 시 로그인 페이지로 리다이렉트)

- [ ] **5-3. 인증 상태 관리**
  - 로그인/로그아웃 처리
  - 쿠키 기반 세션 유지 (HttpOnly 쿠키이므로 브라우저 자동 관리)
  - API 요청 시 401 응답 핸들링 → 로그인 페이지로 리다이렉트

---

## 6. 주요 기술 결정 사항

### 6.1 서버 상태 관리 — TanStack Query

- 모든 API 데이터는 TanStack Query로 관리 (캐싱, 자동 갱신, 낙관적 업데이트)
- 빌드 상태 폴링: `refetchInterval`을 활용하여 Running 상태일 때 주기적 갱신 (3~5초)
- 별도 전역 상태 관리 라이브러리(Zustand 등)는 MVP에서는 불필요할 것으로 판단, 필요 시 추가

### 6.2 폼 검증 — React Hook Form + Zod

- Dockerfile 이름, 빌드 태그 등의 입력 검증에 사용
- Zod 스키마로 타입 안전한 검증 + TypeScript 타입 추론

### 6.3 코드 에디터 — Monaco Editor

- `@monaco-editor/react`를 통한 Monaco Editor 통합
- Dockerfile 구문 하이라이팅 (Monaco 기본 제공 `dockerfile` 언어)
- COPY/ADD 사용 시 경고 마커를 에디터에 표시

### 6.4 빌드 로그 — 폴링 기반

- MVP에서는 WebSocket 대신 HTTP 폴링으로 빌드 로그 갱신
- 빌드 완료(Succeeded/Failed) 시 폴링 중단
- 향후 WebSocket/SSE로 고도화 가능

---

## 7. 비기능 요구사항

- **국제화**: 한국어(기본) / 영어 지원. i18next 기반.
- **접근성**: Radix UI 기반으로 WAI-ARIA 준수.
- **코드 품질**: ESLint + Prettier 자동 포맷. `npm run lint` / `npm run format` 스크립트 제공.
- **빌드 최적화**: Vite 기반 코드 스플리팅, 트리쉐이킹.

---

## 8. 고도화 백로그

### 8.1 Volume 파일 브라우저 (백엔드 연동 필요)

**현재 상태**: AIPub Volume에서 COPY할 경로를 사용자가 직접 입력하는 방식.

**목표**: Volume 내부 파일/디렉토리 구조를 트리 형태로 브라우징하여 경로를 선택할 수 있는 UI.

**기술적 배경**:
- K8s PVC는 Pod에 마운트되어야만 파일시스템 접근이 가능하며, PVC 내부 파일을 직접 조회하는 K8s API는 존재하지 않음.
- 따라서 백엔드에서 별도의 Volume File Listing API를 제공해야 함.

**백엔드 구현 방안**:
1. **임시 Pod 방식 (권장)**: 해당 PVC를 마운트하는 경량 Pod(busybox)을 일시적으로 생성하여 `ls` / `find` 결과를 반환 후 Pod 삭제
2. **기존 Workspace exec 방식**: Volume이 이미 마운트된 Workspace가 있으면 해당 Pod에 exec하여 파일 목록 조회
3. **SFTPServer 연동 방식**: AIPub SFTPServer를 통해 Volume에 SFTP 접근

**프론트엔드 구현 방안**:
- 파일 브라우저 라이브러리 도입 (react-complex-tree, react-arborist 등)
- Volume 선택 → 파일 트리 조회 → 경로 선택 플로우
- 상세 설계: `docs/volume-file-browser-design.md` 참조

**선행 조건**: 백엔드 Volume File Listing API 구현

### 8.2 기타 고도화 항목

- Dockerfile 버전 관리, diff, 롤백
- 템플릿 라이브러리, Quick Build Wizard
- 외부 레지스트리(NGC) 이미지 브라우징
- 빌드 캐시/큐 관련 UI
- 테스트 코드 (Jest, Playwright) — MVP 이후 추가

---

## 9. 의존성 및 선행 조건

| 항목 | 상태 | 설명 |
|---|---|---|
| aipub-web-server API | 미착수 | Dockerfile CRUD + Build API 구현 필요 |
| ImageBuild CR + Controller | 미착수 | Kaniko 기반 빌드 파이프라인 |
| Harbor 연동 | 기존 | 기존 ImageHub 인프라 활용 |
| 인증 연동 | 기존 | 기존 AIPub OIDC 재사용 |

> 프론트엔드는 API 스펙 확정 전까지 Mock 데이터 기반으로 개발 가능. MSW(Mock Service Worker) 또는 TanStack Query의 `placeholderData` 활용 검토.

---

## 10. 마일스톤

| 단계 | 범위 | 산출물 | 상태 |
|---|---|---|---|
| **M1** | Phase 1 (Dockerfile CRUD) | Dockerfile 목록/에디터 페이지, COPY/ADD 경고 | ✅ 완료 (2026-04-17) |
| **M2** | Phase 2 (빌드 실행/조회) | 빌드 트리거, 상태/로그 조회 페이지 | ✅ 완료 (2026-04-17) |
| **M3** | Phase 3 (UI/UX 마무리) | AIPub 디자인 적용, 공통 컴포넌트, COPY/ADD 검증 | ✅ 완료 (2026-04-17) |
| **M4** | Phase 4 (Dockerfile 폼 UI) | Input field 기반 Dockerfile 생성 폼 | ✅ 완료 (2026-04-18) |
| **M5** | Phase 5 (로그인) | 로그인 페이지, 인증 API 연동, 라우팅 가드 | 🔄 진행 중 |
