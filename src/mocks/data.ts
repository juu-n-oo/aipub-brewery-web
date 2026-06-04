import type { Dockerfile } from '@/types/dockerfile';
import type { ImageBuild } from '@/types/build';

export const mockDockerfiles: Dockerfile[] = [
  {
    id: 1,
    name: 'pytorch-cuda-base',
    description: 'PyTorch 2.3 + CUDA 12.1 기반 학습 환경',
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1

RUN apt-get update && apt-get install -y \\
    git \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \\
    torch==2.3.0 \\
    torchvision==0.18.0 \\
    numpy \\
    pandas

WORKDIR /workspace

CMD ["bash"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    project: 'pjw',
    username: 'joonwoo',
    createdAt: '2026-04-15T09:00:00Z',
    updatedAt: '2026-04-16T14:30:00Z',
    latestVersion: 3,
    latestRevisionId: 3,
    contextFiles: [],
  },
  {
    id: 2,
    name: 'tensorflow-jupyter',
    description: 'TensorFlow + JupyterLab 실험 환경',
    content: `FROM harbor.example.com/base/python:3.11

RUN pip install --no-cache-dir \\
    tensorflow==2.16.0 \\
    jupyterlab \\
    matplotlib \\
    scikit-learn

WORKDIR /workspace

EXPOSE 8888

CMD ["jupyter", "lab", "--ip=0.0.0.0", "--allow-root", "--no-browser"]`,
    baseImage: 'harbor.example.com/base/python:3.11',
    project: 'pjw',
    username: 'alice',
    createdAt: '2026-04-14T11:00:00Z',
    updatedAt: '2026-04-14T11:00:00Z',
    latestVersion: 1,
    latestRevisionId: 4,
    contextFiles: [],
  },
  {
    id: 3,
    name: 'vllm-inference',
    description: 'vLLM 기반 LLM 추론 서버',
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1

RUN pip install --no-cache-dir \\
    vllm \\
    transformers \\
    accelerate

ENV HF_HOME=/workspace/.cache/huggingface

WORKDIR /workspace

CMD ["python", "-m", "vllm.entrypoints.openai.api_server"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    project: 'pjw',
    username: 'joonwoo',
    createdAt: '2026-04-17T08:00:00Z',
    updatedAt: '2026-04-17T08:00:00Z',
    latestVersion: 1,
    latestRevisionId: 5,
    contextFiles: [],
  },
];

export const mockRevisions = [
  {
    id: 1, dockerfileId: 1, version: 1,
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1\n\nRUN pip install torch==2.2.0\n\nWORKDIR /workspace\nCMD ["bash"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    message: 'Initial version',
    createdBy: 'joonwoo',
    createdAt: '2026-04-15T09:00:00Z',
  },
  {
    id: 2, dockerfileId: 1, version: 2,
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1\n\nRUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*\n\nRUN pip install torch==2.3.0 numpy\n\nWORKDIR /workspace\nCMD ["bash"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    message: 'apt 패키지 추가, torch 2.3 업그레이드',
    createdBy: 'joonwoo',
    createdAt: '2026-04-16T10:00:00Z',
  },
  {
    id: 3, dockerfileId: 1, version: 3,
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1\n\nRUN apt-get update && apt-get install -y \\\n    git \\\n    wget \\\n    && rm -rf /var/lib/apt/lists/*\n\nRUN pip install --no-cache-dir \\\n    torch==2.3.0 \\\n    torchvision==0.18.0 \\\n    numpy \\\n    pandas\n\nWORKDIR /workspace\n\nCMD ["bash"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    message: 'torchvision, pandas 추가',
    createdBy: 'joonwoo',
    createdAt: '2026-04-16T14:30:00Z',
  },
  {
    id: 4, dockerfileId: 2, version: 1,
    content: `FROM harbor.example.com/base/python:3.11\n\nRUN pip install tensorflow jupyterlab\n\nWORKDIR /workspace\nEXPOSE 8888\nCMD ["jupyter", "lab", "--ip=0.0.0.0"]`,
    baseImage: 'harbor.example.com/base/python:3.11',
    message: 'Initial version',
    createdBy: 'alice',
    createdAt: '2026-04-14T11:00:00Z',
  },
  {
    id: 5, dockerfileId: 3, version: 1,
    content: `FROM harbor.example.com/base/python:3.11-cuda12.1\n\nRUN pip install vllm transformers accelerate\n\nENV HF_HOME=/workspace/.cache/huggingface\nWORKDIR /workspace\nCMD ["python", "-m", "vllm.entrypoints.openai.api_server"]`,
    baseImage: 'harbor.example.com/base/python:3.11-cuda12.1',
    message: 'Initial version',
    createdBy: 'joonwoo',
    createdAt: '2026-04-17T08:00:00Z',
  },
];

export const mockBuilds: ImageBuild[] = [
  {
    name: 'imagebuild-a1b2c3d4',
    namespace: 'pjw',
    dockerfileId: 1,
    targetImage: 'harbor.example.com/pjw/pytorch-cuda-base:v1.0.0',
    phase: 'Succeeded',
    startTime: '2026-04-16T14:31:00Z',
    completionTime: '2026-04-16T14:35:22Z',
    imageDigest: 'sha256:a1b2c3d4e5f6...',
    username: 'joonwoo',
    createdAt: '2026-04-16T14:30:50Z',
  },
  {
    name: 'imagebuild-e5f6a7b8',
    namespace: 'pjw',
    dockerfileId: 2,
    targetImage: 'harbor.example.com/pjw/tensorflow-jupyter:latest',
    phase: 'Failed',
    startTime: '2026-04-15T10:00:00Z',
    completionTime: '2026-04-15T10:02:15Z',
    message: 'ERROR: Could not find a version that satisfies the requirement tensorflow==2.99.0',
    username: 'alice',
    createdAt: '2026-04-15T09:59:50Z',
  },
  {
    name: 'imagebuild-c9d0e1f2',
    namespace: 'pjw',
    dockerfileId: 3,
    targetImage: 'harbor.example.com/pjw/vllm-inference:v0.4.0',
    phase: 'Building',
    startTime: '2026-04-17T08:10:00Z',
    username: 'joonwoo',
    createdAt: '2026-04-17T08:09:50Z',
  },
];
