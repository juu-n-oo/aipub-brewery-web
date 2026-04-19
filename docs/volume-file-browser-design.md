# Volume 파일 브라우저 설계

> 작성일: 2026-04-18
> 상태: 고도화 백로그 (백엔드 API 선행 필요)

---

## 1. 문제

AIPub Volume(PVC)에서 COPY할 파일 경로를 사용자가 직접 입력해야 한다.
Volume 내부의 파일 구조를 모르는 상태에서 정확한 경로를 입력하기 어렵다.

---

## 2. 목표

Volume 내부 파일/디렉토리를 트리 형태로 탐색하여 파일을 선택할 수 있는 UI를 제공한다.

---

## 3. 왜 K8s API만으로는 불가능한가

```
PVC(PersistentVolumeClaim)
  └── PV(PersistentVolume)
        └── 실제 스토리지 (NFS, iSCSI, Ceph 등)
```

- K8s API는 PVC/PV **메타데이터**만 제공 (이름, 용량, 상태 등)
- PVC 안의 **파일 목록**은 K8s API로 조회할 수 없음
- 파일에 접근하려면 해당 PVC를 **Pod에 마운트**한 후 Pod 내에서 조회해야 함
- 이것은 K8s의 설계 원칙 — PVC는 스토리지 추상화일 뿐, 파일시스템 접근은 Pod의 책임

---

## 4. 백엔드 구현 방안

### 4.1 방안 A: 임시 Pod 방식 (권장)

**흐름:**
```
[프론트엔드]                    [백엔드]                        [K8s]
    │                              │                              │
    │  GET /volumes/{ns}/{name}    │                              │
    │  ?path=/data                 │                              │
    │─────────────────────────────>│                              │
    │                              │  1. Job/Pod 생성              │
    │                              │     - image: busybox         │
    │                              │     - volumeMount: PVC       │
    │                              │     - command: ls -la /mnt   │
    │                              │─────────────────────────────>│
    │                              │                              │
    │                              │  2. Pod 완료 대기             │
    │                              │<─────────────────────────────│
    │                              │                              │
    │                              │  3. Pod 로그에서 결과 파싱    │
    │                              │  4. Pod 삭제                  │
    │                              │─────────────────────────────>│
    │                              │                              │
    │  [파일 목록 응답]             │                              │
    │<─────────────────────────────│                              │
```

**백엔드에서 생성할 Pod 스펙 예시:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-browser-{random}
  namespace: {project-namespace}
spec:
  restartPolicy: Never
  containers:
    - name: browser
      image: busybox:latest
      command: ["sh", "-c"]
      args:
        # JSON 형태로 파일 목록 출력
        - |
          find /mnt/data -maxdepth 1 -printf '{"name":"%f","type":"%y","size":%s}\n' | 
          tail -n +2
      volumeMounts:
        - name: target-volume
          mountPath: /mnt/data
          readOnly: true          # 읽기 전용으로 마운트
  volumes:
    - name: target-volume
      persistentVolumeClaim:
        claimName: {pvc-name}     # AIPub Volume의 status.pvcName
```

**장점**: 깔끔한 분리, 기존 Pod에 영향 없음
**단점**: Pod 생성/삭제 오버헤드 (3~10초), Pod 스케줄링 필요

**최적화 옵션:**
- Pod 대신 Job으로 생성하여 TTL 자동 정리 (`ttlSecondsAfterFinished: 30`)
- 캐시 레이어 추가 (같은 Volume의 반복 조회 시 캐시 반환)

### 4.2 방안 B: 기존 Workspace exec 방식

```
[백엔드]
  1. AIPubVolume CR의 status.mountWorkloads에서 실행 중인 Workspace 확인
  2. 해당 Workspace Pod에 kubectl exec로 ls 실행
  3. 결과 반환
```

**장점**: 추가 Pod 불필요, 빠름
**단점**: 마운트된 워크로드가 없으면 사용 불가, 실행 중인 Pod에 exec하는 것의 보안 우려

### 4.3 방안 C: 전용 File Browser Pod (상시 운영)

```
[백엔드]
  1. Project별 File Browser Pod을 하나 상시 운영
  2. 모든 Volume을 마운트하고 HTTP API로 파일 목록 제공
  3. filebrowser/filebrowser 같은 오픈소스 활용 가능
```

**장점**: 즉시 응답, 실시간 탐색 가능
**단점**: 상시 리소스 소모, Volume 추가/삭제 시 Pod 재시작 필요

---

## 5. 제안 API 스펙

### 5.1 파일 목록 조회

**Request:**
```
GET /api/v1/volumes/{namespace}/{volumeName}/files?path=/
```

**Response:**
```json
{
  "path": "/",
  "entries": [
    {
      "name": "requirements.txt",
      "type": "file",
      "size": 245,
      "modTime": "2026-04-10T08:30:00Z"
    },
    {
      "name": "data",
      "type": "directory",
      "size": 0,
      "modTime": "2026-04-15T12:00:00Z"
    },
    {
      "name": "models",
      "type": "directory",
      "size": 0,
      "modTime": "2026-04-17T09:00:00Z"
    },
    {
      "name": "train.py",
      "type": "file",
      "size": 8192,
      "modTime": "2026-04-16T14:30:00Z"
    }
  ]
}
```

### 5.2 디렉토리 탐색 (하위)

```
GET /api/v1/volumes/{namespace}/{volumeName}/files?path=/data/preprocessed
```

동일한 응답 형식으로, 해당 하위 디렉토리의 내용만 반환.

---

## 6. 프론트엔드 파일 브라우저 라이브러리

### 6.1 추천 라이브러리

| 라이브러리 | GitHub Stars | 특징 | 적합도 |
|---|---|---|---|
| **react-complex-tree** | 1k+ | 트리 뷰 특화, 키보드 내비게이션, drag-and-drop, 비동기 로딩 지원 | ★★★★★ |
| **react-arborist** | 3k+ | 트리 뷰, 가상화(대용량), 편집/드래그 지원 | ★★★★ |
| **chonky** | 1.5k+ | 파일 브라우저 UI 전체 제공 (아이콘, 브레드크럼, 그리드/리스트), "파일 매니저" 스타일 | ★★★★★ |

### 6.2 Chonky (가장 추천)

```
npm install chonky chonky-icon-fontawesome
```

파일 매니저 스타일의 완성된 UI를 제공:
- 파일/폴더 아이콘 자동 매핑
- 브레드크럼 네비게이션
- 리스트/그리드 뷰 토글
- 파일 선택 (단일/다중)
- 정렬, 검색

Brewery에서는 "파일 선택"이 목적이므로 Chonky의 read-only 모드로 사용하면 적합.

### 6.3 직접 구현 (경량)

라이브러리 없이 간단한 트리 컴포넌트를 직접 구현할 수도 있음:

```
📁 /
├── 📁 data/
│   ├── 📁 preprocessed/
│   ├── 📄 train.csv (12.5 MB)
│   └── 📄 test.csv (3.2 MB)
├── 📄 requirements.txt (245 B)
├── 📄 train.py (8 KB)
└── 📁 models/
    └── 📄 checkpoint.pt (1.2 GB)
```

ImageSelector의 3컬럼 레이아웃을 재활용하여:
- 왼쪽: Volume 선택
- 오른쪽: 파일 트리 (클릭으로 디렉토리 탐색, 파일 선택)

---

## 7. 구현 우선순위

1. **백엔드**: Volume File Listing API 구현 (방안 A 권장)
2. **프론트엔드**: 파일 브라우저 UI 구현 (Chonky 또는 직접 구현)
3. **통합**: COPY (Volume) 블록에서 파일 브라우저 연동
