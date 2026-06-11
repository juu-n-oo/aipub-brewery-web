import { http, HttpResponse, delay } from 'msw';
import { mockDockerfiles, mockBuilds, mockRevisions } from './data';
import type { Dockerfile } from '@/types/dockerfile';
import type { ImageBuild } from '@/types/build';

const dockerfiles = [...mockDockerfiles];
const builds = [...mockBuilds];
const revisions = [...mockRevisions];
let nextDfId = 100;
let nextRevId = 100;

export const handlers = [
  // ── Auth ──

  http.post('/api/v1alpha1/login', async ({ request }) => {
    await delay(500);
    const body = await request.text();
    const params = new URLSearchParams(body);
    const username = params.get('username');
    const password = params.get('password');

    if (username === 'joonwoo' && password === 'Ten1010!!') {
      return new HttpResponse(JSON.stringify({ message: 'Login successful' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(
      { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }),

  http.post('/api/v1alpha1/selfsubjectreviews', async () => {
    await delay(200);
    return HttpResponse.json({
      isAuthenticated: true,
      userType: 'OAUTH2',
      userId: '10',
      username: 'joonwoo',
      roles: ['aipub-member'],
      user: {
        id: 'joonwoo',
        username: 'joonwoo',
        originUsername: 'joonwoo',
        email: 'joonwoo@dummy.com',
        firstName: 'Joonwoo',
        lastName: 'Park',
        enabled: true,
      },
    });
  }),

  http.post('/api/v1alpha1/logout', async () => {
    await delay(200);
    return HttpResponse.json({ message: 'Logged out' });
  }),

  // ── K8s Proxy: UserAuthorityReview ──

  http.post('/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/userauthorityreviews', async () => {
    await delay(300);
    return HttpResponse.json({
      apiVersion: 'aipub.ten1010.io/v1alpha1',
      kind: 'UserAuthorityReview',
      metadata: { name: 'joonwoo' },
      status: {
        aipubRole: {
          isAdmin: false,
          projects: [
            { name: 'pjw', role: 'project-manager' },
            { name: 'ml-team', role: 'project-developer' },
          ],
        },
        authorities: {
          '/namespaces': { list: true, get: ['*'] },
        },
        isClusterAdmin: false,
      },
    });
  }),

  // ── K8s Proxy: Project ──

  http.get('/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/pjw', async () => {
    await delay(200);
    return HttpResponse.json({
      apiVersion: 'project.aipub.ten1010.io/v1alpha1',
      kind: 'Project',
      metadata: { name: 'pjw' },
      spec: {
        binding: {
          imageHubs: ['pjw-image-hub', 'common'],
          nodeGroups: [],
          nodes: ['vnode1.pnode2.idc1.ten1010.io', 'vnode2.pnode9.idc1.ten1010.io'],
        },
        members: [
          { aipubUser: 'joonwoo', role: 'project-manager' },
          { aipubUser: 'david-cho', role: 'project-developer' },
        ],
        quota: { extendedResources: {}, pvcStorage: '500Gi' },
      },
      status: {
        allBoundAipubUsers: ['joonwoo', 'david-cho'],
        allBoundImageHubs: ['pjw-image-hub', 'common'],
        allBoundNodeGroups: [],
        allBoundNodes: ['vnode1.pnode2.idc1.ten1010.io'],
      },
    });
  }),

  http.get('/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/projects/ml-team', async () => {
    await delay(200);
    return HttpResponse.json({
      apiVersion: 'project.aipub.ten1010.io/v1alpha1',
      kind: 'Project',
      metadata: { name: 'ml-team' },
      spec: {
        binding: {
          imageHubs: ['ml-images', 'common'],
          nodeGroups: [],
          nodes: ['vnode3.pnode15.idc1.ten1010.io'],
        },
        members: [
          { aipubUser: 'joonwoo', role: 'project-developer' },
          { aipubUser: 'alice', role: 'project-manager' },
        ],
        quota: { extendedResources: {}, pvcStorage: '1Ti' },
      },
      status: {
        allBoundAipubUsers: ['joonwoo', 'alice'],
        allBoundImageHubs: ['ml-images', 'common'],
        allBoundNodeGroups: [],
        allBoundNodes: ['vnode3.pnode15.idc1.ten1010.io'],
      },
    });
  }),

  // ── K8s Proxy: ImageReview ──

  http.post('/api/v1alpha1/k8sproxy/apis/project.aipub.ten1010.io/v1alpha1/imagereviews', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { spec: { imgHub: string; repo?: string } };
    const { imgHub, repo } = body.spec;

    if (repo) {
      const tagMap: Record<string, Record<string, { digest: string; tags: string[] }[]>> = {
        common: {
          ubuntu: [
            { digest: 'sha256:629c4b5c...', tags: ['22.04', 'latest'] },
            { digest: 'sha256:fbfe6c15...', tags: ['20.04'] },
          ],
          'python': [
            { digest: 'sha256:a1b2c3d4...', tags: ['3.11', '3.11-slim'] },
            { digest: 'sha256:e5f6a7b8...', tags: ['3.10', '3.10-cuda12.1'] },
          ],
        },
        'pjw-image-hub': {
          'pytorch-base': [{ digest: 'sha256:1234abcd...', tags: ['v1.0.0', 'latest'] }],
          'tf-jupyter': [{ digest: 'sha256:5678efgh...', tags: ['v2.0', 'dev'] }],
        },
        'ml-images': {
          'cuda-base': [{ digest: 'sha256:9abc1234...', tags: ['12.1', '11.8'] }],
          vllm: [{ digest: 'sha256:def56789...', tags: ['v0.4.0', 'latest'] }],
        },
      };
      const artifacts = tagMap[imgHub]?.[repo] ?? [];
      return HttpResponse.json({
        apiVersion: 'project.aipub.ten1010.io/v1alpha1',
        kind: 'ImageReview',
        metadata: { name: imgHub },
        spec: { imgHub, repo },
        status: { repositories: null, artifacts },
      });
    }

    const repoMap: Record<string, { name: string }[]> = {
      common: [{ name: 'ubuntu' }, { name: 'python' }],
      'pjw-image-hub': [{ name: 'pytorch-base' }, { name: 'tf-jupyter' }],
      'ml-images': [{ name: 'cuda-base' }, { name: 'vllm' }],
    };
    return HttpResponse.json({
      apiVersion: 'project.aipub.ten1010.io/v1alpha1',
      kind: 'ImageReview',
      metadata: { name: imgHub },
      spec: { imgHub },
      status: { repositories: repoMap[imgHub] ?? [], artifacts: null },
    });
  }),

  // ── Volume 목록 (Backend API) ──

  http.get('/api/v1alpha1/volumes/:ns', async ({ params }) => {
    await delay(200);
    const ns = params.ns as string;
    const volumeMap: Record<string, object[]> = {
      pjw: [
        { name: 'data-storage', pvcName: 'data-storage-43d77785', capacity: '150Gi', used: '32.5Gi', ready: true },
        { name: 'model-weights', pvcName: 'model-weights-98765', capacity: '500Gi', used: '120.0Gi', ready: true },
      ],
      'ml-team': [
        { name: 'shared-datasets', pvcName: 'shared-datasets-abcdef', capacity: '1Ti', used: '450.0Gi', ready: true },
      ],
    };
    return HttpResponse.json({ items: volumeMap[ns] ?? [] });
  }),

  // ── Volume 파일 업로드 (Backend API) ──

  http.post('/api/v1alpha1/volumes/:ns/:name/upload', async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/';
    // mock 에서는 실제 PVC 쓰기를 흉내내지 않고, 갱신된 목록 형태만 반환한다.
    return HttpResponse.json({ path, entries: [] });
  }),

  // ── Volume 파일 브라우저 (Backend API) ──

  http.get('/api/v1alpha1/volumes/:ns/:name/browse', async ({ params, request }) => {
    await delay(300);
    const ns = params.ns as string;
    const name = params.name as string;
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/';

    type MockFS = Record<string, { name: string; type: 'FILE' | 'DIRECTORY'; size: number; modifiedAt: string }[]>;
    const mockFileSystems: Record<string, MockFS> = {
      'pjw/data-storage': {
        '/': [
          { name: 'requirements.txt', type: 'FILE', size: 245, modifiedAt: '2026-04-10T08:30:00Z' },
          { name: 'train.py', type: 'FILE', size: 8192, modifiedAt: '2026-04-16T14:30:00Z' },
          { name: 'config.yaml', type: 'FILE', size: 512, modifiedAt: '2026-04-15T10:00:00Z' },
          { name: 'data', type: 'DIRECTORY', size: 0, modifiedAt: '2026-04-15T12:00:00Z' },
          { name: 'models', type: 'DIRECTORY', size: 0, modifiedAt: '2026-04-17T09:00:00Z' },
          { name: 'scripts', type: 'DIRECTORY', size: 0, modifiedAt: '2026-04-14T16:00:00Z' },
        ],
        '/data': [
          { name: 'train.csv', type: 'FILE', size: 13107200, modifiedAt: '2026-04-12T09:00:00Z' },
          { name: 'test.csv', type: 'FILE', size: 3355443, modifiedAt: '2026-04-12T09:00:00Z' },
          { name: 'preprocessed', type: 'DIRECTORY', size: 0, modifiedAt: '2026-04-13T11:00:00Z' },
        ],
        '/data/preprocessed': [
          { name: 'features.npy', type: 'FILE', size: 52428800, modifiedAt: '2026-04-13T11:30:00Z' },
          { name: 'labels.npy', type: 'FILE', size: 1048576, modifiedAt: '2026-04-13T11:30:00Z' },
        ],
        '/models': [
          { name: 'checkpoint.pt', type: 'FILE', size: 1288490188, modifiedAt: '2026-04-17T09:30:00Z' },
          { name: 'config.json', type: 'FILE', size: 1024, modifiedAt: '2026-04-17T09:30:00Z' },
        ],
        '/scripts': [
          { name: 'preprocess.sh', type: 'FILE', size: 2048, modifiedAt: '2026-04-14T16:30:00Z' },
          { name: 'run_training.sh', type: 'FILE', size: 1536, modifiedAt: '2026-04-14T16:30:00Z' },
        ],
      },
      'pjw/model-weights': {
        '/': [
          { name: 'llama-7b', type: 'DIRECTORY', size: 0, modifiedAt: '2026-03-20T10:00:00Z' },
          { name: 'bert-base', type: 'DIRECTORY', size: 0, modifiedAt: '2026-03-15T08:00:00Z' },
          { name: 'README.md', type: 'FILE', size: 512, modifiedAt: '2026-03-10T08:00:00Z' },
        ],
        '/llama-7b': [
          { name: 'model.safetensors', type: 'FILE', size: 13421772800, modifiedAt: '2026-03-20T12:00:00Z' },
          { name: 'tokenizer.json', type: 'FILE', size: 2097152, modifiedAt: '2026-03-20T12:00:00Z' },
          { name: 'config.json', type: 'FILE', size: 768, modifiedAt: '2026-03-20T12:00:00Z' },
        ],
        '/bert-base': [
          { name: 'pytorch_model.bin', type: 'FILE', size: 440401920, modifiedAt: '2026-03-15T10:00:00Z' },
          { name: 'vocab.txt', type: 'FILE', size: 231508, modifiedAt: '2026-03-15T10:00:00Z' },
        ],
      },
      'ml-team/shared-datasets': {
        '/': [
          { name: 'imagenet', type: 'DIRECTORY', size: 0, modifiedAt: '2026-02-01T10:00:00Z' },
          { name: 'coco', type: 'DIRECTORY', size: 0, modifiedAt: '2026-02-15T10:00:00Z' },
          { name: 'README.md', type: 'FILE', size: 1024, modifiedAt: '2026-01-20T10:00:00Z' },
        ],
        '/imagenet': [
          { name: 'train', type: 'DIRECTORY', size: 0, modifiedAt: '2026-02-01T12:00:00Z' },
          { name: 'val', type: 'DIRECTORY', size: 0, modifiedAt: '2026-02-01T12:00:00Z' },
          { name: 'labels.txt', type: 'FILE', size: 65536, modifiedAt: '2026-02-01T10:30:00Z' },
        ],
      },
    };

    const key = `${ns}/${name}`;
    const fs = mockFileSystems[key];
    const entries = fs?.[path] ?? [];

    return HttpResponse.json({ volumeName: name, namespace: ns, path, entries });
  }),

  // ── Dockerfile CRUD ──

  http.get('/api/v1alpha1/dockerfiles', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';
    const username = url.searchParams.get('username');
    const projectsParam = url.searchParams.get('projects');
    // 토큰 기반 호출자 — 목에서는 selfsubjectreview 와 동일한 사용자로 가정
    const caller = 'joonwoo';

    let filtered;
    if (all) {
      // 관리자 전체 조회 (+ username 필터), 생성 일시 최신순
      filtered = username ? dockerfiles.filter((df) => df.username === username) : [...dockerfiles];
    } else {
      // 멤버 조회: projects IN + 호출자 본인 username
      const projects = projectsParam ? projectsParam.split(',').filter(Boolean) : [];
      filtered = dockerfiles.filter(
        (df) => projects.includes(df.project) && df.username === caller,
      );
    }
    filtered = filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return HttpResponse.json(filtered);
  }),

  http.get('/api/v1alpha1/dockerfiles/:id', async ({ params }) => {
    await delay(200);
    const id = Number(params.id);
    const df = dockerfiles.find((d) => d.id === id);
    if (!df) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(df);
  }),

  http.post('/api/v1alpha1/dockerfiles', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as {
      project: string;
      username: string;
      name: string;
      description?: string;
      content: string;
      baseImage: string;
    };

    const newDf: Dockerfile = {
      id: ++nextDfId,
      name: body.name,
      description: body.description || '',
      content: body.content,
      baseImage: body.baseImage,
      project: body.project,
      username: body.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dockerfiles.push(newDf);
    return HttpResponse.json(newDf, { status: 201 });
  }),

  http.put('/api/v1alpha1/dockerfiles/:id', async ({ params, request }) => {
    await delay(400);
    const id = Number(params.id);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      content: string;
      baseImage: string;
    };
    const idx = dockerfiles.findIndex((d) => d.id === id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });

    dockerfiles[idx] = {
      ...dockerfiles[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(dockerfiles[idx]);
  }),

  http.delete('/api/v1alpha1/dockerfiles/:id', async ({ params }) => {
    await delay(300);
    const id = Number(params.id);
    const idx = dockerfiles.findIndex((d) => d.id === id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    dockerfiles.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Dockerfile Revisions ──

  http.get('/api/v1alpha1/dockerfiles/:id/revisions', async ({ params }) => {
    await delay(200);
    const id = Number(params.id);
    const df = dockerfiles.find((d) => d.id === id);
    if (!df) return new HttpResponse(null, { status: 404 });
    const dfRevisions = revisions
      .filter((r) => r.dockerfileId === id)
      .sort((a, b) => b.version - a.version);
    return HttpResponse.json(dfRevisions);
  }),

  http.get('/api/v1alpha1/dockerfiles/:id/revisions/:version', async ({ params }) => {
    await delay(200);
    const id = Number(params.id);
    const version = Number(params.version);
    const rev = revisions.find((r) => r.dockerfileId === id && r.version === version);
    if (!rev) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(rev);
  }),

  http.post('/api/v1alpha1/dockerfiles/:id/revisions/:version/rollback', async ({ params }) => {
    await delay(400);
    const id = Number(params.id);
    const version = Number(params.version);
    const targetRev = revisions.find((r) => r.dockerfileId === id && r.version === version);
    if (!targetRev) return new HttpResponse(null, { status: 404 });

    const dfRevisions = revisions.filter((r) => r.dockerfileId === id);
    const maxVersion = Math.max(...dfRevisions.map((r) => r.version));
    const newVersion = maxVersion + 1;
    const newRev = {
      id: ++nextRevId,
      dockerfileId: id,
      version: newVersion,
      content: targetRev.content,
      baseImage: targetRev.baseImage,
      message: `Rollback to v${version}`,
      createdBy: 'joonwoo',
      createdAt: new Date().toISOString(),
    };
    revisions.push(newRev);

    const df = dockerfiles.find((d) => d.id === id);
    if (df) {
      df.content = targetRev.content;
      df.baseImage = targetRev.baseImage;
      df.latestVersion = newVersion;
      df.latestRevisionId = newRev.id;
      df.updatedAt = new Date().toISOString();
      return HttpResponse.json(df);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ── Build API ──

  // 빌드 목록/단건 조회는 k8sproxy 를 통해 ImageBuild CR 을 직접 읽는다 (buildApi.list / get).
  http.get(
    '/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/namespaces/:ns/imagebuilds',
    async ({ params }) => {
      await delay(300);
      const ns = params.ns as string;
      const items = builds.filter((b) => b.namespace === ns).map(toImageBuildCr);
      return HttpResponse.json({
        apiVersion: 'aipub.ten1010.io/v1alpha1',
        kind: 'ImageBuildList',
        items,
      });
    },
  ),

  http.get(
    '/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/namespaces/:ns/imagebuilds/:name',
    async ({ params }) => {
      await delay(200);
      const ns = params.ns as string;
      const name = params.name as string;
      const build = builds.find((b) => b.namespace === ns && b.name === name);
      if (!build) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json(toImageBuildCr(build));
    },
  ),

  http.get('/api/v1alpha1/builds', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const project = url.searchParams.get('project');
    const filtered = project ? builds.filter((b) => b.namespace === project) : builds;
    return HttpResponse.json(filtered);
  }),

  http.get('/api/v1alpha1/builds/:ns/:name', async ({ params }) => {
    await delay(200);
    const ns = params.ns as string;
    const name = params.name as string;
    // "logs" 경로와 충돌 방지
    if (name === 'logs') return new HttpResponse(null, { status: 404 });
    const build = builds.find((b) => b.namespace === ns && b.name === name);
    if (!build) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(build);
  }),

  // 빌드 실행: 프론트가 k8sproxy 로 ImageBuild CR 을 직접 생성한다 (buildApi.run).
  http.post(
    '/api/v1alpha1/k8sproxy/apis/aipub.ten1010.io/v1alpha1/namespaces/:ns/imagebuilds',
    async ({ params, request }) => {
    await delay(500);
    const ns = params.ns as string;
    const cr = (await request.json()) as {
      metadata?: {
        generateName?: string;
        name?: string;
        labels?: Record<string, string>;
        annotations?: Record<string, string>;
      };
      spec?: { targetImage?: string; dockerfileContent?: string };
    };
    const labels = cr.metadata?.labels ?? {};
    const annotations = cr.metadata?.annotations ?? {};
    const prefix = cr.metadata?.generateName ?? 'imagebuild-';
    const buildName = cr.metadata?.name ?? `${prefix}${Math.random().toString(36).substring(2, 10)}`;
    const newBuild: ImageBuild = {
      name: buildName,
      namespace: ns,
      dockerfileId: Number(labels['aipub.ten1010.io/dockerfile-id'] ?? 0),
      targetImage: cr.spec?.targetImage ?? '',
      baseImage: annotations['aipub.ten1010.io/base-image'],
      phase: 'Pending',
      username: labels['aipub.ten1010.io/username'] ?? 'joonwoo',
      createdAt: new Date().toISOString(),
    };
    builds.unshift(newBuild);

    // 빌드 상태 시뮬레이션: Pending → Preparing → Building → Succeeded
    setTimeout(() => {
      const b = builds.find((x) => x.name === newBuild.name);
      if (b) { b.phase = 'Preparing'; }
    }, 1500);

    setTimeout(() => {
      const b = builds.find((x) => x.name === newBuild.name);
      if (b) { b.phase = 'Building'; b.startTime = new Date().toISOString(); }
    }, 3000);

    setTimeout(() => {
      const b = builds.find((x) => x.name === newBuild.name);
      if (b) {
        b.phase = 'Succeeded';
        b.completionTime = new Date().toISOString();
        b.imageDigest = `sha256:${Math.random().toString(36).substring(2, 15)}`;
      }
    }, 10000);

    return HttpResponse.json(toImageBuildCr(newBuild), { status: 201 });
    },
  ),

  http.get('/api/v1alpha1/builds/:ns/:name/logs', async ({ params }) => {
    await delay(200);
    const ns = params.ns as string;
    const name = params.name as string;
    const build = builds.find((b) => b.namespace === ns && b.name === name);
    if (!build) return new HttpResponse(null, { status: 404 });

    // 완료된 빌드인데 Pod GC + OpenSearch 미보관으로 로그 소스가 전부 없는 경우.
    // 백엔드는 Spring ProblemDetail(JSON) 본문과 함께 404 를 반환한다.
    if (name === 'imagebuild-e5f6a7b8') {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          detail: 'Build logs are not available',
        },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
      );
    }

    const logs = generateMockLogs(build);
    return new HttpResponse(logs, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }),

  // SSE 빌드 로그 스트리밍
  http.get('/api/v1alpha1/builds/:ns/:name/logs/stream', ({ params }) => {
    const ns = params.ns as string;
    const name = params.name as string;
    const build = builds.find((b) => b.namespace === ns && b.name === name);
    if (!build) return new HttpResponse(null, { status: 404 });

    const logLines = [
      `[Kaniko] Building image: ${build.targetImage}`,
      '[Kaniko] Using Dockerfile from ConfigMap',
      '',
      `Step 1/6 : FROM base-image`,
      ' ---> Pulling from registry...',
      ' ---> Downloading layer 1/4...',
      ' ---> Downloading layer 2/4...',
      ' ---> Downloading layer 3/4...',
      ' ---> Downloading layer 4/4...',
      ' ---> abc123def456',
      '',
      'Step 2/6 : RUN apt-get update && apt-get install -y ...',
      ' ---> Running in container_78901...',
      '   Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease',
      '   Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]',
      '   Get:3 http://archive.ubuntu.com/ubuntu jammy-security InRelease [110 kB]',
      '   Fetched 238 kB in 1s (238 kB/s)',
      '   Reading package lists...',
      '   Building dependency tree...',
      '   The following NEW packages will be installed:',
      '     git wget curl',
      '   0 upgraded, 3 newly installed, 0 to remove and 12 not upgraded.',
      '   Need to get 8,456 kB of archives.',
      '   Unpacking git (1:2.34.1-1ubuntu1) ...',
      '   Setting up git (1:2.34.1-1ubuntu1) ...',
      ' ---> 789012abcdef',
      '',
      'Step 3/6 : RUN pip install --no-cache-dir ...',
      ' ---> Running in container_34567...',
      '   Collecting torch==2.3.0',
      '     Downloading torch-2.3.0-cp311-cp311-linux_x86_64.whl (779.1 MB)',
      '     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 779.1/779.1 MB 45.2 MB/s eta 0:00:00',
      '   Collecting numpy',
      '     Downloading numpy-1.26.4-cp311-cp311-linux_x86_64.whl (18.3 MB)',
      '     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 18.3/18.3 MB 52.1 MB/s eta 0:00:00',
      '   Installing collected packages: numpy, torch',
      '   Successfully installed numpy-1.26.4 torch-2.3.0',
      ' ---> fedcba654321',
      '',
      'Step 4/6 : ENV HF_HOME=/workspace/.cache/huggingface',
      ' ---> Setting environment variable',
      ' ---> aaa111bbb222',
      '',
      'Step 5/6 : WORKDIR /workspace',
      ' ---> 111222333444',
      '',
      'Step 6/6 : CMD ["bash"]',
      ' ---> 555666777888',
      '',
      '[Kaniko] Image built successfully',
      `[Kaniko] Pushing to ${build.targetImage}...`,
      '[Kaniko] Pushing layer 1/5...',
      '[Kaniko] Pushing layer 2/5...',
      '[Kaniko] Pushing layer 3/5...',
      '[Kaniko] Pushing layer 4/5...',
      '[Kaniko] Pushing layer 5/5...',
      `[Kaniko] Pushed. Digest: sha256:${Math.random().toString(36).substring(2, 15)}`,
      '',
      '✓ Build completed successfully',
    ];

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let idx = 0;
        const interval = setInterval(() => {
          if (idx < logLines.length) {
            controller.enqueue(encoder.encode(`data: ${logLines[idx]}\n\n`));
            idx++;
          } else {
            // done event
            controller.enqueue(encoder.encode('event: done\ndata: [DONE]\n\n'));
            clearInterval(interval);
            controller.close();
          }
        }, 150);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // ── Image Catalog (전역 읽기 전용 큐레이션 base 이미지) ──

  http.get('/image-catalog/api/images', async () => {
    await delay(200);
    // 목록 응답: versions 비움, latest* 비움.
    return HttpResponse.json(
      mockCatalog.map((c) => ({
        ...c,
        versions: [],
        latestPullReference: null,
        latestTag: '-',
      })),
    );
  }),

  http.get('/image-catalog/api/images/:name', async ({ params }) => {
    await delay(200);
    const img = mockCatalog.find((c) => c.name === params.name);
    if (!img) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(img);
  }),
];

const CATALOG_PREFIX = 'aipub-harbor.cluster10.idc1.ten1010.io/base-catalog';

const mockCatalog = [
  {
    name: 'nginx',
    displayName: 'NGINX',
    fullName: 'base-catalog/nginx',
    category: 'Application',
    descriptionHtml:
      '<p>고성능 HTTP 서버이자 리버스 프록시, 로드 밸런서입니다.</p>\n<h4>주요 특징</h4>\n<ul>\n  <li>이벤트 기반 비동기 아키텍처로 높은 동시성 처리</li>\n  <li>리버스 프록시 · 로드 밸런싱 · 캐싱</li>\n  <li>HTTP/2, gRPC, WebSocket 프록시 지원</li>\n</ul>\n',
    logoText: 'NG',
    registryHost: 'aipub-harbor.cluster10.idc1.ten1010.io',
    pullPrefix: CATALOG_PREFIX,
    latestTag: 'latest',
    latestPullReference: `${CATALOG_PREFIX}/nginx:latest`,
    tagCount: 1,
    pullCount: 2,
    updatedDate: '2026-06-09',
    versions: [
      {
        tag: 'latest',
        digest: 'sha256:632900a6bb6d5ef719cbf2222175594f07eb18d90c72be995086c2a94adf66f2',
        shortDigest: 'sha256:632900a6bb6d',
        pullReference: `${CATALOG_PREFIX}/nginx:latest`,
        os: 'linux',
        arch: 'arm64',
        sizeHuman: '59.7 MB',
        pushedDate: '2026-06-09',
      },
    ],
  },
  {
    name: 'pytorch',
    displayName: 'PyTorch',
    fullName: 'base-catalog/pytorch',
    category: 'Deep Learning',
    descriptionHtml:
      '<p>오픈소스 딥러닝 프레임워크. 동적 계산 그래프와 풍부한 생태계로 연구·프로덕션 양쪽에서 널리 쓰입니다.</p>\n<h4>주요 특징</h4>\n<ul>\n  <li>동적 계산 그래프(define-by-run)</li>\n  <li>CUDA 기반 GPU 가속</li>\n  <li>TorchScript · torch.compile 로 추론 최적화</li>\n</ul>\n',
    logoText: 'PT',
    registryHost: 'aipub-harbor.cluster10.idc1.ten1010.io',
    pullPrefix: CATALOG_PREFIX,
    latestTag: '2.3.0-cuda12.1',
    latestPullReference: `${CATALOG_PREFIX}/pytorch:2.3.0-cuda12.1`,
    tagCount: 2,
    pullCount: 4,
    updatedDate: '2026-06-09',
    versions: [
      {
        tag: '2.3.0-cuda12.1',
        digest: 'sha256:aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44',
        shortDigest: 'sha256:aa11bb22cc33',
        pullReference: `${CATALOG_PREFIX}/pytorch:2.3.0-cuda12.1`,
        os: 'linux',
        arch: 'amd64',
        sizeHuman: '6.8 GB',
        pushedDate: '2026-06-09',
      },
      {
        tag: '2.2.0-cpu',
        digest: 'sha256:bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55',
        shortDigest: 'sha256:bb22cc33dd44',
        pullReference: `${CATALOG_PREFIX}/pytorch:2.2.0-cpu`,
        os: 'linux',
        arch: 'amd64',
        sizeHuman: '1.9 GB',
        pushedDate: '2026-06-08',
      },
    ],
  },
];

/** ImageBuild DTO → k8s ImageBuild CR (k8sproxy 조회 응답 형태). buildApi 의 mapCrToImageBuild 역변환. */
function toImageBuildCr(b: ImageBuild) {
  const labels: Record<string, string> = {
    'aipub.ten1010.io/dockerfile-id': String(b.dockerfileId),
    'aipub.ten1010.io/username': b.username,
  };
  const annotations: Record<string, string> = {};
  if (b.baseImage) annotations['aipub.ten1010.io/base-image'] = b.baseImage;
  return {
    apiVersion: 'aipub.ten1010.io/v1alpha1',
    kind: 'ImageBuild',
    metadata: {
      name: b.name,
      namespace: b.namespace,
      creationTimestamp: b.createdAt,
      labels,
      annotations,
    },
    spec: { targetImage: b.targetImage },
    status: {
      phase: b.phase,
      message: b.message,
      imageDigest: b.imageDigest,
      startTime: b.startTime,
      completionTime: b.completionTime,
    },
  };
}

function generateMockLogs(build: ImageBuild): string {
  const lines: string[] = [
    `[Kaniko] Building image: ${build.targetImage}`,
    `[Kaniko] Using Dockerfile from ConfigMap`,
    '',
  ];

  if (build.phase === 'Pending') {
    lines.push('[Kaniko] Waiting for build pod to start...');
    return lines.join('\n');
  }

  lines.push(
    `Step 1/5 : FROM base-image`,
    ' ---> Pulling from registry...',
    ' ---> abc123def456',
    'Step 2/5 : RUN apt-get update && apt-get install -y ...',
    ' ---> Running in container_78901...',
    ' ---> 789012abcdef',
    'Step 3/5 : RUN pip install --no-cache-dir ...',
    ' ---> Running in container_34567...',
    '   Collecting packages...',
    '   Installing collected packages...',
    '   Successfully installed packages',
    ' ---> fedcba654321',
  );

  if (build.phase === 'Building' || build.phase === 'Preparing') {
    lines.push('', '[Kaniko] Build in progress...');
    return lines.join('\n');
  }

  if (build.phase === 'Succeeded') {
    lines.push(
      'Step 4/5 : WORKDIR /workspace',
      ' ---> 111222333444',
      'Step 5/5 : CMD ["bash"]',
      ' ---> 555666777888',
      '',
      `[Kaniko] Image built successfully`,
      `[Kaniko] Pushing to ${build.targetImage}...`,
      `[Kaniko] Pushed. Digest: ${build.imageDigest}`,
    );
  }

  if (build.phase === 'Failed') {
    lines.push(
      '',
      `[Kaniko] ERROR: ${build.message ?? 'Build failed'}`,
      '[Kaniko] Build failed.',
    );
  }

  return lines.join('\n');
}
