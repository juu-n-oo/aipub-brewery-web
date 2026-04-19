# AIPub Kubernetes 연동 시스템

> 작성일: 2026-04-18
> 프로젝트: aipub-brewery-web
> 목적: 프론트엔드에서 활용하는 K8s API 프록시 및 주요 CR 정리

---

## 1. K8s API 프록시 개요

### 1.1 구조

```
[Browser] → /api/v1alpha1/k8sproxy/... → [Backend Gateway] → [K8s API Server]
```

- 프론트엔드는 `/api/v1alpha1/k8sproxy` 경로로 요청을 보낸다.
- 백엔드 게이트웨이가 요청을 K8s API 서버로 프록싱한다.
- 로그인 시 발급된 OIDC 토큰(쿠키)이 자동으로 포함되며, K8s API 서버의 OIDC 인증 및 RBAC을 거쳐 응답이 반환된다.

### 1.2 인증 흐름

1. 사용자가 `/api/v1alpha1/login`으로 로그인 (x-www-form-urlencoded)
2. 로그인 성공 시 쿠키 설정:
   - `AIPUB_ACCESS_COOKIE` — 접근 토큰 (HttpOnly, Secure, 24시간)
   - `AIPUB_ID_COOKIE` — ID 토큰 (HttpOnly, Secure, 24시간)
   - `AIPUB_REFRESH_COOKIE` — 갱신 토큰 (HttpOnly, Secure, 30일)
3. 이후 모든 API 요청에 쿠키가 자동 포함 (`credentials: 'include'`)
4. K8s API 서버는 OIDC 토큰으로 사용자 식별 및 RBAC 권한 검사 수행

---

## 2. UserAuthorityReview (유저 권한 분석)

### 2.1 개요

- K8s CR로서, 특정 사용자가 K8s 내에서 어떤 오브젝트에 대해 어떤 권한을 가지고 있는지 분석한다.
- `kubectl auth can-i`와 유사한 역할을 수행한다.
- 프론트엔드에서는 로그인 사용자가 접근 가능한 Project 목록을 파악하기 위해 사용한다.

### 2.2 API

**Endpoint:**
```
POST /api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews
```

**Request Body:**
```json
{
  "apiVersion": "aipub.ten1010.io/v1alpha1",
  "kind": "UserAuthorityReview",
  "metadata": {
    "name": "<username>"
  },
  "spec": {
    "resources": [
      "/namespaces"
    ]
  }
}
```

### 2.3 Response 주요 필드

| 필드 | 설명 |
|---|---|
| `status.aipubRole.isAdmin` | 관리자 여부 |
| `status.aipubRole.projects` | 사용자가 속한 프로젝트 목록 (`name`, `role`) |
| `status.authorities` | 리소스별 권한 상세 (create, get, list, delete 등) |
| `status.isClusterAdmin` | 클러스터 관리자 여부 |

**Response 예시 (핵심 부분):**
```json
{
  "status": {
    "aipubRole": {
      "isAdmin": true,
      "projects": [
        { "name": "test-block", "role": "project-developer" },
        { "name": "proj-pdk", "role": "project-developer" },
        { "name": "maumai", "role": "project-developer" },
        { "name": "seungho", "role": "project-developer" }
      ]
    },
    "authorities": {
      "/namespaces": {
        "create": true,
        "delete": ["*"],
        "get": ["*"],
        "list": true,
        "patch": ["*"],
        "update": ["*"],
        "watch": ["*"]
      }
    },
    "isClusterAdmin": true
  }
}
```

### 2.4 프론트엔드 활용

1. 로그인 직후 `UserAuthorityReview`를 호출하여 사용자 프로젝트 목록 확보
2. `status.aipubRole.projects[].name`으로 접근 가능한 Project 식별
3. 이후 해당 Project 범위 내에서 Dockerfile, Build 등의 리소스 요청

---

## 3. Project

### 3.1 개요

- K8s CR로서, K8s의 namespace를 확장한 객체이다.
- 프로젝트에 속하는 멤버, 바인딩된 ImageHub, 사용 가능한 노드 목록, 리소스 쿼터 등을 관리한다.

### 3.2 API

**단건 조회:**
```
GET /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/<project-name>
```

**목록 조회:**
```
GET /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects
```

> **주의**: Project 목록 조회(`list`)는 Admin 권한이 있는 유저만 가능하다. 일반 유저는 `UserAuthorityReview`를 통해 접근 가능한 프로젝트 목록을 먼저 확인한 후, 개별 Project를 `get`으로 조회해야 한다.

### 3.3 주요 필드

| 필드 | 설명 |
|---|---|
| `spec.members` | 프로젝트 멤버 목록 (`aipubUser`, `role`) |
| `spec.binding.imageHubs` | 바인딩된 ImageHub 이름 목록 |
| `spec.binding.nodes` | 사용 가능한 노드 목록 |
| `spec.quota.pvcStorage` | PVC 스토리지 쿼터 |
| `status.allBoundAipubUsers` | 실제 바인딩된 전체 사용자 목록 |
| `status.allBoundImageHubs` | 실제 바인딩된 전체 ImageHub 목록 |
| `status.allBoundNodes` | 실제 바인딩된 전체 노드 목록 |

**Response 예시 (핵심 부분):**
```json
{
  "apiVersion": "project.aipub.ten1010.io/v1alpha1",
  "kind": "Project",
  "metadata": { "name": "pjw" },
  "spec": {
    "binding": {
      "imageHubs": ["pjw-image-hub", "common"],
      "nodes": [
        "vnode1.pnode2.idc1.ten1010.io",
        "vnode2.pnode9.idc1.ten1010.io"
      ]
    },
    "members": [
      { "aipubUser": "joonwoo", "role": "project-manager" },
      { "aipubUser": "david-cho", "role": "project-developer" }
    ],
    "quota": {
      "pvcStorage": "500Gi"
    }
  },
  "status": {
    "allBoundImageHubs": ["pjw-image-hub", "common"],
    "quota": {
      "pvcStorage": { "limit": "500Gi", "used": "150Gi" }
    }
  }
}
```

### 3.4 프론트엔드 활용

1. `UserAuthorityReview`에서 얻은 프로젝트 이름으로 Project CR 조회
2. `spec.binding.imageHubs`로 해당 프로젝트에서 사용 가능한 ImageHub 파악
3. Dockerfile 생성/빌드 시 Project 선택 드롭다운의 데이터 소스로 사용

---

## 4. ImageHub

### 4.1 개요

- K8s CR로서, Harbor의 프로젝트에 대응하는 객체이다.
- AIPub에서 ImageHub를 생성하면 백엔드가 Harbor에 프로젝트를 생성하고 K8s ImageHub CR도 생성한다.
- ImageHub CR을 조회하면 해당 이미지 허브를 사용할 수 있는 Project 목록이 표출된다.

### 4.2 API

**단건 조회:**
```
GET /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagehubs/<imagehub-name>
```

**목록 조회:**
```
GET /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagehubs
```

### 4.3 주요 필드

| 필드 | 설명 |
|---|---|
| `spec.id` | Harbor 프로젝트 ID |
| `status.allBoundProjects` | 이 ImageHub를 사용할 수 있는 Project 목록 |
| `status.allBoundAipubUsers` | 이 ImageHub에 접근 가능한 사용자 목록 |

**Response 예시 (핵심 부분):**
```json
{
  "apiVersion": "project.aipub.ten1010.io/v1alpha1",
  "kind": "ImageHub",
  "metadata": { "name": "common" },
  "spec": { "id": "76" },
  "status": {
    "allBoundAipubUsers": ["yejikim12", "aipubadmin"],
    "allBoundProjects": ["test-block", "maumai", "pjw"]
  }
}
```

---

## 5. ImageReview (이미지 조회)

### 5.1 개요

- K8s CR로서, ImageHub(Harbor 프로젝트) 내의 리포지토리 및 이미지 태그를 조회하는 데 사용한다.
- 2단계 조회를 지원한다:
  1. **ImageHub만 지정** → 해당 ImageHub의 리포지토리 목록 반환
  2. **ImageHub + repo 지정** → 해당 리포지토리의 이미지 태그(artifact) 목록 반환

### 5.2 API

**Endpoint:**
```
POST /api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews
```

### 5.3 리포지토리 목록 조회

**Request:**
```json
{
  "apiVersion": "project.aipub.ten1010.io/v1alpha1",
  "kind": "ImageReview",
  "metadata": { "name": "<imagehub-name>" },
  "spec": {
    "imgHub": "<imagehub-name>"
  }
}
```

**Response (핵심):**
```json
{
  "status": {
    "artifacts": null,
    "repositories": [
      { "name": "node" },
      { "name": "ubuntu" }
    ]
  }
}
```

### 5.4 이미지 태그 목록 조회

**Request:**
```json
{
  "apiVersion": "project.aipub.ten1010.io/v1alpha1",
  "kind": "ImageReview",
  "metadata": { "name": "<imagehub-name>" },
  "spec": {
    "imgHub": "<imagehub-name>",
    "repo": "<repository-name>"
  }
}
```

**Response (핵심):**
```json
{
  "status": {
    "artifacts": [
      {
        "digest": "sha256:629c4b5c284e...",
        "tags": ["mac1", "mac"]
      },
      {
        "digest": "sha256:fbfe6c154928...",
        "tags": ["test"]
      }
    ],
    "repositories": null
  }
}
```

### 5.5 프론트엔드 활용

Dockerfile 생성 시 Base Image 선택 플로우:

```
1. UserAuthorityReview → 접근 가능한 Project 목록
2. Project 조회 → spec.binding.imageHubs에서 사용 가능한 ImageHub 목록
3. ImageReview (imgHub만) → 리포지토리 목록
4. ImageReview (imgHub + repo) → 태그 목록
5. 최종 이미지 경로 조합: <registry>/<imagehub>/<repo>:<tag>
```

---

## 6. AIPub Volume

### 6.1 개요

- K8s CR로서, PV(PersistentVolume)와 PVC(PersistentVolumeClaim)를 생성/관리하는 역할을 한다.
- Project(namespace) 단위로 관리되며, `UserAuthorityReview`를 통해 파악한 접근 가능한 Project의 AIPub Volume을 조회할 수 있다.
- 각 Volume은 특정 사용자에게 귀속되며, Workspace 등의 워크로드에 마운트하여 사용한다.

### 6.2 API

**namespace별 목록 조회:**
```
GET /api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/namespaces/<namespace>/aipubvolumes
```

### 6.3 주요 필드

| 필드 | 설명 |
|---|---|
| `metadata.name` | Volume 이름 |
| `metadata.namespace` | 소속 Project(namespace) |
| `metadata.labels["aipub.ten1010.io/username"]` | Volume 소유자 |
| `spec.capacity` | 용량 (예: `150Gi`) |
| `spec.storageClassName` | 스토리지 클래스 (예: `ontap-nas`) |
| `status.pvName` | 연결된 PV 이름 |
| `status.pvcName` | 연결된 PVC 이름 |
| `status.used` | 현재 사용량 (예: `0.00Gi`) |
| `status.readyCondition.status` | Ready 여부 (`true`/`false`) |
| `status.mountWorkloads` | 마운트된 워크로드 목록 (`kind`, `name`, `uid`) |

**Response 예시 (핵심 부분):**
```json
{
  "apiVersion": "aipub.ten1010.io/v1alpha1",
  "kind": "AIPubVolumeList",
  "items": [
    {
      "kind": "AIPubVolume",
      "metadata": {
        "name": "data-storage",
        "namespace": "pjw",
        "labels": {
          "aipub.ten1010.io/username": "aipubadmin"
        }
      },
      "spec": {
        "capacity": "150Gi",
        "storageClassName": "ontap-nas"
      },
      "status": {
        "pvName": "pvc-42cf9fc6-1dd1-4eb3-a0f3-2e99344ac69a",
        "pvcName": "data-storage-43d77785",
        "used": "0.00Gi",
        "readyCondition": {
          "status": true,
          "timestamp": "2026-02-26T03:53:15.943748"
        },
        "mountWorkloads": [
          {
            "kind": "Workspace",
            "name": "workspace-pjw",
            "uid": "f9251c0c-5395-48a3-a048-bf315fc1be38"
          }
        ]
      }
    }
  ]
}
```

### 6.4 프론트엔드 활용

1. `UserAuthorityReview`로 접근 가능한 Project 목록 확인
2. 해당 Project의 namespace로 AIPub Volume 목록 조회
3. 향후 빌드 컨텍스트 파일 전달(COPY/ADD 지원) 시, AIPub Volume을 빌드 컨텍스트 소스로 활용 가능

---

## 7. API 엔드포인트 요약

| 용도 | Method | Endpoint |
|---|---|---|
| 로그인 | POST | `/api/v1alpha1/login` |
| 유저 권한 분석 | POST | `/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews` |
| Project 목록 | GET | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects` |
| Project 단건 | GET | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/<name>` |
| ImageHub 단건 | GET | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagehubs/<name>` |
| ImageReview | POST | `/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews` |
| AIPub Volume 목록 | GET | `/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/namespaces/<ns>/aipubvolumes` |

> 모든 k8sproxy 요청은 로그인된 상태(쿠키 포함)에서만 유효하다. 미인증 시 401 응답.
