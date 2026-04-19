import { http, HttpResponse, delay } from 'msw';
import { mockDockerfiles, mockBuilds } from './data';
import type { Dockerfile } from '@/types/dockerfile';
import type { ImageBuild } from '@/types/build';

let dockerfiles = [...mockDockerfiles];
let builds = [...mockBuilds];
let nextDfId = 100;
let nextBuildId = 100;

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

  http.get('/api/v1/volumes/:ns', async ({ params }) => {
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

  // ── Volume 파일 브라우저 (Backend API) ──

  http.get('/api/v1/volumes/:ns/:name/browse', async ({ params, request }) => {
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

  // ── External Registry: NGC ──

  http.get('/api/v1/registries/ngc/images', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const q = (url.searchParams.get('query') || '').toLowerCase();

    const allImages = [
      { name: 'nvidia/pytorch', fullPath: 'nvcr.io/nvidia/pytorch', description: 'NVIDIA optimized PyTorch container with CUDA, cuDNN', source: 'NGC' },
      { name: 'nvidia/tensorflow', fullPath: 'nvcr.io/nvidia/tensorflow', description: 'NVIDIA optimized TensorFlow container', source: 'NGC' },
      { name: 'nvidia/cuda', fullPath: 'nvcr.io/nvidia/cuda', description: 'NVIDIA CUDA base images', source: 'NGC' },
      { name: 'nvidia/tritonserver', fullPath: 'nvcr.io/nvidia/tritonserver', description: 'NVIDIA Triton Inference Server', source: 'NGC' },
      { name: 'nvidia/nemo', fullPath: 'nvcr.io/nvidia/nemo', description: 'NVIDIA NeMo framework for conversational AI', source: 'NGC' },
      { name: 'nvidia/rapidsai/base', fullPath: 'nvcr.io/nvidia/rapidsai/base', description: 'RAPIDS - GPU DataFrame, ML, Graph Analytics', source: 'NGC' },
      { name: 'nvidia/tensorrt', fullPath: 'nvcr.io/nvidia/tensorrt', description: 'NVIDIA TensorRT - high-performance deep learning inference', source: 'NGC' },
    ];

    const filtered = q ? allImages.filter((img) =>
      img.name.toLowerCase().includes(q) || img.description.toLowerCase().includes(q)
    ) : allImages;

    return HttpResponse.json({ images: filtered, totalCount: filtered.length });
  }),

  http.get('/api/v1/registries/ngc/images/:org/:repo/tags', async ({ params }) => {
    await delay(300);
    const org = params.org as string;
    const repo = params.repo as string;
    const tagMap: Record<string, string[]> = {
      'nvidia/pytorch': ['24.04-py3', '24.03-py3', '24.02-py3', '23.12-py3', '23.10-py3'],
      'nvidia/tensorflow': ['24.04-tf2-py3', '24.03-tf2-py3', '23.12-tf2-py3'],
      'nvidia/cuda': ['12.4.0-devel-ubuntu22.04', '12.3.2-devel-ubuntu22.04', '12.1.1-devel-ubuntu22.04', '11.8.0-devel-ubuntu22.04'],
      'nvidia/tritonserver': ['24.04-py3', '24.03-py3', '23.12-py3'],
      'nvidia/nemo': ['24.03', '24.01.01', '23.10'],
      'nvidia/rapidsai/base': ['24.04-cuda12.2-py3.11', '24.02-cuda12.0-py3.10'],
      'nvidia/tensorrt': ['24.04-py3', '24.03-py3', '23.12-py3'],
    };
    const key = `${org}/${repo}`;
    const tags = tagMap[key] ?? [];
    return HttpResponse.json({ image: `nvcr.io/${key}`, tags });
  }),

  // ── External Registry: HuggingFace ──

  http.get('/api/v1/registries/huggingface/images', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const q = (url.searchParams.get('query') || '').toLowerCase();

    const allImages = [
      { name: 'text-generation-inference', fullPath: 'ghcr.io/huggingface/text-generation-inference', description: 'Hugging Face Text Generation Inference (TGI) - serve LLMs', source: 'HUGGINGFACE' },
      { name: 'text-embeddings-inference', fullPath: 'ghcr.io/huggingface/text-embeddings-inference', description: 'Hugging Face Text Embeddings Inference (TEI)', source: 'HUGGINGFACE' },
      { name: 'transformers-pytorch-gpu', fullPath: 'ghcr.io/huggingface/transformers-pytorch-gpu', description: 'Hugging Face Transformers with PyTorch GPU', source: 'HUGGINGFACE' },
      { name: 'transformers-tensorflow-gpu', fullPath: 'ghcr.io/huggingface/transformers-tensorflow-gpu', description: 'Hugging Face Transformers with TensorFlow GPU', source: 'HUGGINGFACE' },
      { name: 'diffusers-pytorch-cuda', fullPath: 'ghcr.io/huggingface/diffusers-pytorch-cuda', description: 'Hugging Face Diffusers with PyTorch + CUDA', source: 'HUGGINGFACE' },
      { name: 'optimum-nvidia', fullPath: 'ghcr.io/huggingface/optimum-nvidia', description: 'Hugging Face Optimum NVIDIA - TensorRT-LLM acceleration', source: 'HUGGINGFACE' },
    ];

    const filtered = q ? allImages.filter((img) =>
      img.name.toLowerCase().includes(q) || img.description.toLowerCase().includes(q)
    ) : allImages;

    return HttpResponse.json({ images: filtered, totalCount: filtered.length });
  }),

  http.get('/api/v1/registries/huggingface/images/:repo/tags', async ({ params }) => {
    await delay(300);
    const repo = params.repo as string;
    const tagMap: Record<string, string[]> = {
      'text-generation-inference': ['2.0', '1.4', '1.3', 'latest'],
      'text-embeddings-inference': ['1.2', '1.1', 'latest'],
      'transformers-pytorch-gpu': ['4.40.0', '4.38.0', '4.36.0', 'latest'],
      'transformers-tensorflow-gpu': ['4.40.0', '4.38.0', 'latest'],
      'diffusers-pytorch-cuda': ['0.27.0', '0.25.0', 'latest'],
      'optimum-nvidia': ['latest'],
    };
    const tags = tagMap[repo] ?? [];
    return HttpResponse.json({ image: `ghcr.io/huggingface/${repo}`, tags });
  }),

  // ── Dockerfile CRUD ──

  http.get('/api/v1/dockerfiles', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const project = url.searchParams.get('project');
    const filtered = project
      ? dockerfiles.filter((df) => df.project === project)
      : dockerfiles;
    return HttpResponse.json(filtered);
  }),

  http.get('/api/v1/dockerfiles/:id', async ({ params }) => {
    await delay(200);
    const id = Number(params.id);
    const df = dockerfiles.find((d) => d.id === id);
    if (!df) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(df);
  }),

  http.post('/api/v1/dockerfiles', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { project: string; username: string; name: string; description?: string; content: string };

    const newDf: Dockerfile = {
      id: ++nextDfId,
      name: body.name,
      description: body.description || '',
      content: body.content,
      project: body.project,
      username: body.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contextFiles: [],
    };
    dockerfiles.push(newDf);
    return HttpResponse.json(newDf, { status: 201 });
  }),

  http.put('/api/v1/dockerfiles/:id', async ({ params, request }) => {
    await delay(400);
    const id = Number(params.id);
    const body = (await request.json()) as { name?: string; description?: string; content: string };
    const idx = dockerfiles.findIndex((d) => d.id === id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });

    dockerfiles[idx] = {
      ...dockerfiles[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(dockerfiles[idx]);
  }),

  http.delete('/api/v1/dockerfiles/:id', async ({ params }) => {
    await delay(300);
    const id = Number(params.id);
    const idx = dockerfiles.findIndex((d) => d.id === id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    dockerfiles.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── BuildContextFile ──

  http.get('/api/v1/dockerfiles/:dockerfileId/files', async ({ params }) => {
    await delay(200);
    const id = Number(params.dockerfileId);
    const df = dockerfiles.find((d) => d.id === id);
    if (!df) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(df.contextFiles ?? []);
  }),

  http.post('/api/v1/dockerfiles/:dockerfileId/files', async ({ params, request }) => {
    await delay(500);
    const id = Number(params.dockerfileId);
    const df = dockerfiles.find((d) => d.id === id);
    if (!df) return new HttpResponse(null, { status: 404 });

    const url = new URL(request.url);
    const targetPath = url.searchParams.get('targetPath') || 'file';

    const fileResponse = {
      id: Date.now(),
      fileName: targetPath.split('/').pop() || targetPath,
      targetPath,
      fileSize: 1024,
      uploadedAt: new Date().toISOString(),
    };

    if (!df.contextFiles) df.contextFiles = [];
    df.contextFiles.push(fileResponse);

    return HttpResponse.json(fileResponse, { status: 201 });
  }),

  http.delete('/api/v1/dockerfiles/:dockerfileId/files/:fileId', async ({ params }) => {
    await delay(300);
    const dfId = Number(params.dockerfileId);
    const fileId = Number(params.fileId);
    const df = dockerfiles.find((d) => d.id === dfId);
    if (!df) return new HttpResponse(null, { status: 404 });
    if (df.contextFiles) {
      df.contextFiles = df.contextFiles.filter((f) => f.id !== fileId);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Build API ──

  http.get('/api/v1/builds', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const project = url.searchParams.get('project');
    const filtered = project ? builds.filter((b) => b.namespace === project) : builds;
    return HttpResponse.json(filtered);
  }),

  http.get('/api/v1/builds/:ns/:name', async ({ params }) => {
    await delay(200);
    const ns = params.ns as string;
    const name = params.name as string;
    // "logs" 경로와 충돌 방지
    if (name === 'logs') return new HttpResponse(null, { status: 404 });
    const build = builds.find((b) => b.namespace === ns && b.name === name);
    if (!build) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(build);
  }),

  http.post('/api/v1/builds', async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as {
      dockerfileId: number;
      targetImage: string;
      tag: string;
    };

    const df = dockerfiles.find((d) => d.id === body.dockerfileId);
    if (!df) {
      return HttpResponse.json({ message: 'Dockerfile not found' }, { status: 404 });
    }

    const buildName = `imagebuild-${Math.random().toString(36).substring(2, 10)}`;
    const newBuild: ImageBuild = {
      name: buildName,
      namespace: df.project,
      dockerfileId: body.dockerfileId,
      targetImage: `${body.targetImage}:${body.tag}`,
      phase: 'Pending',
      username: 'joonwoo',
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

    return HttpResponse.json(newBuild, { status: 202 });
  }),

  http.get('/api/v1/builds/:ns/:name/logs', async ({ params }) => {
    await delay(200);
    const ns = params.ns as string;
    const name = params.name as string;
    const build = builds.find((b) => b.namespace === ns && b.name === name);
    if (!build) return new HttpResponse(null, { status: 404 });

    const logs = generateMockLogs(build);
    return new HttpResponse(logs, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }),

  // SSE 빌드 로그 스트리밍
  http.get('/api/v1/builds/:ns/:name/logs/stream', ({ params }) => {
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
];

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
