/**
 * Dockerfile content ↔ 입력 폼 필드 간 순수 변환 함수 모음 (React 무관, 테스트 가능).
 * (이전에는 DockerfileEditorPage god-component 안에 정의돼 있었다.)
 */

/* ── Types ── */

export type InstructionType = 'RUN' | 'COPY_VOLUME' | 'ENV';

export interface EnvPair {
  key: string;
  value: string;
}

export interface Instruction {
  id: string;
  type: InstructionType;
  // RUN
  command?: string;
  // COPY (Volume에서 선택 또는 업로드한 파일 — 둘 다 같은 PVC 경로 모델)
  volumeName?: string;
  volumePath?: string;
  volumeDest?: string;
  // ENV
  envPairs?: EnvPair[];
}

/** 사용자가 입력하는 이미지 메타데이터. Dockerfile content 의 LABEL 지시자로 굽힌다(round-trip). */
export interface ImageLabelFields {
  version: string;
  authors: string;
  licenses: string;
  url: string;
  documentation: string;
  /** 임의 커스텀 라벨 (key=value). 빈 key 는 무시된다. */
  custom: { key: string; value: string }[];
}

export interface DockerfileFields {
  baseImage: string;
  instructions: Instruction[];
  workdir: string;
  exposePorts: string;
  cmd: string;
  labels: ImageLabelFields;
}

export const emptyLabels: ImageLabelFields = {
  version: '',
  authors: '',
  licenses: '',
  url: '',
  documentation: '',
  custom: [],
};

export const defaultFields: DockerfileFields = {
  baseImage: '',
  instructions: [],
  workdir: '/workspace',
  exposePorts: '',
  cmd: 'bash',
  labels: { ...emptyLabels, custom: [{ key: '', value: '' }] },
};

/* ── 이미지 메타데이터 ↔ OCI LABEL 매핑 ── */

const OCI_PREFIX = 'org.opencontainers.image';
export const OCI_LABEL_KEYS = {
  title: `${OCI_PREFIX}.title`,
  version: `${OCI_PREFIX}.version`,
  authors: `${OCI_PREFIX}.authors`,
  licenses: `${OCI_PREFIX}.licenses`,
  url: `${OCI_PREFIX}.url`,
  documentation: `${OCI_PREFIX}.documentation`,
} as const;

/** 전용 입력 필드(또는 자동 title)로 관리되는 라벨 키 — 커스텀 라벨에서 중복 지정 시 경고. */
export const MANAGED_LABEL_KEYS = new Set<string>(Object.values(OCI_LABEL_KEYS));

export type StandardMetaKey = 'version' | 'authors' | 'licenses' | 'url' | 'documentation';

/* ── ID 생성 ── */

/** Instruction 식별용 안정적 ID. (이전엔 모듈 레벨 가변 카운터였다 — WEB-21) */
export function newId(): string {
  return `instr-${crypto.randomUUID()}`;
}

/* ── LABEL 인용/파싱 ── */

/** LABEL 값 인용/이스케이프 ("..." 로 감싸고 \, " 를 이스케이프). */
export function quoteLabelValue(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * ImageLabelFields(+ Dockerfile 이름) → `LABEL key="value"` 줄 목록 (빈 값 생략).
 * title 은 Dockerfile 이름에서 자동 생성한다(별도 입력 필드 없음).
 */
export function buildLabelLines(labels: ImageLabelFields, title: string): string[] {
  const out: string[] = [];
  if (title.trim()) out.push(`LABEL ${OCI_LABEL_KEYS.title}=${quoteLabelValue(title.trim())}`);
  const known: [string, string][] = [
    [OCI_LABEL_KEYS.version, labels.version],
    [OCI_LABEL_KEYS.authors, labels.authors],
    [OCI_LABEL_KEYS.licenses, labels.licenses],
    [OCI_LABEL_KEYS.url, labels.url],
    [OCI_LABEL_KEYS.documentation, labels.documentation],
  ];
  for (const [key, value] of known) {
    if (value.trim()) out.push(`LABEL ${key}=${quoteLabelValue(value.trim())}`);
  }
  for (const { key, value } of labels.custom) {
    const k = key.trim();
    if (k) out.push(`LABEL ${k}=${quoteLabelValue(value.trim())}`);
  }
  return out;
}

/** `LABEL a="x y" b=z` 한 줄을 key-value 쌍으로 파싱 (인용/이스케이프 처리). */
export function parseLabelInstruction(rest: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  let i = 0;
  while (i < rest.length) {
    while (i < rest.length && /\s/.test(rest[i])) i++;
    if (i >= rest.length) break;
    let key = '';
    while (i < rest.length && rest[i] !== '=' && !/\s/.test(rest[i])) key += rest[i++];
    if (rest[i] !== '=') break; // 잘못된 형식
    i++; // '=' 건너뜀
    let value = '';
    if (rest[i] === '"') {
      i++;
      while (i < rest.length && rest[i] !== '"') {
        if (rest[i] === '\\' && i + 1 < rest.length) {
          i++;
          value += rest[i++];
        } else {
          value += rest[i++];
        }
      }
      i++; // 닫는 따옴표
    } else {
      while (i < rest.length && !/\s/.test(rest[i])) value += rest[i++];
    }
    if (key) pairs.push({ key, value });
  }
  return pairs;
}

/** 이미지 레퍼런스를 비교용으로 정규화한다. 태그가 없으면 `:latest` 로 보정한다. (다이제스트 `@sha256:` 은 그대로) */
export function normalizeImageRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;
  const lastSlash = trimmed.lastIndexOf('/');
  const lastColon = trimmed.lastIndexOf(':');
  const hasTag = lastColon > lastSlash;
  return hasTag ? trimmed : `${trimmed}:latest`;
}

/* ── Parse Dockerfile content → fields ── */

export function parseDockerfileContent(content: string): DockerfileFields {
  const lines = content.split('\n');
  let baseImage = '';
  const instructions: Instruction[] = [];
  let workdir = '';
  const exposePorts: string[] = [];
  let cmd = '';
  const labels: ImageLabelFields = { ...emptyLabels, custom: [] };

  let pendingVolumeName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) continue;

    // AIPub Volume 주석: 다음 COPY 라인과 쌍으로 처리
    const volumeComment = /^#\s*Source:\s*AIPub Volume\s+"(.+)"$/i.exec(trimmed);
    if (volumeComment) {
      pendingVolumeName = volumeComment[1];
      continue;
    }

    if (trimmed.startsWith('#')) continue;

    const upper = trimmed.toUpperCase();

    if (upper.startsWith('FROM ')) {
      const match = /^FROM\s+(.+)$/i.exec(trimmed);
      if (match) {
        const tokens = match[1].trim().split(/\s+/);
        for (const token of tokens) {
          if (token.startsWith('--')) continue;
          baseImage = token;
          break;
        }
      }
      continue;
    }

    if (upper.startsWith('RUN ')) {
      const command = trimmed.substring(4).trim();
      if (command) {
        instructions.push({ id: newId(), type: 'RUN', command });
      }
      continue;
    }

    if (upper.startsWith('COPY ') || upper.startsWith('ADD ')) {
      const isAdd = upper.startsWith('ADD ');
      const rest = trimmed.substring(isAdd ? 4 : 5).trim();
      const parts = rest.split(/\s+/);

      if (parts.length >= 2) {
        // COPY 는 모두 Volume(또는 업로드) 소스로 통합한다.
        // "# Source: AIPub Volume" 주석이 앞에 있으면 그 볼륨을 채우고,
        // 없으면 volumeName 을 비워 사용자가 "찾아보기"로 다시 지정하도록 둔다.
        instructions.push({
          id: newId(),
          type: 'COPY_VOLUME',
          volumeName: pendingVolumeName ?? '',
          volumePath: '/' + parts.slice(0, -1).join(' '),
          volumeDest: parts[parts.length - 1],
        });
      }
      pendingVolumeName = null;
      continue;
    }

    if (upper.startsWith('ENV ')) {
      const rest = trimmed.substring(4).trim();
      const envPairs: EnvPair[] = [];
      // ENV KEY=VALUE KEY2=VALUE2 형태
      const pairRegex = /(\S+?)=(\S*)/g;
      let m;
      while ((m = pairRegex.exec(rest)) !== null) {
        envPairs.push({ key: m[1], value: m[2] });
      }
      if (envPairs.length === 0) {
        // ENV KEY VALUE 형태 (단일)
        const spParts = rest.split(/\s+/);
        if (spParts.length >= 2) {
          envPairs.push({ key: spParts[0], value: spParts.slice(1).join(' ') });
        } else if (spParts.length === 1) {
          envPairs.push({ key: spParts[0], value: '' });
        }
      }
      if (envPairs.length > 0) {
        instructions.push({ id: newId(), type: 'ENV', envPairs });
      }
      continue;
    }

    if (upper.startsWith('LABEL ')) {
      const rest = trimmed.substring(6).trim();
      for (const { key, value } of parseLabelInstruction(rest)) {
        switch (key) {
          case OCI_LABEL_KEYS.title:
            // title 은 Dockerfile 이름에서 자동 생성 → 필드에 저장하지 않음 (재생성 시 중복 방지)
            break;
          case OCI_LABEL_KEYS.version:
            labels.version = value;
            break;
          case OCI_LABEL_KEYS.authors:
            labels.authors = value;
            break;
          case OCI_LABEL_KEYS.licenses:
            labels.licenses = value;
            break;
          case OCI_LABEL_KEYS.url:
            labels.url = value;
            break;
          case OCI_LABEL_KEYS.documentation:
            labels.documentation = value;
            break;
          default:
            labels.custom.push({ key, value });
        }
      }
      continue;
    }

    if (upper.startsWith('WORKDIR ')) {
      workdir = trimmed.substring(8).trim();
      continue;
    }

    if (upper.startsWith('EXPOSE ')) {
      const port = trimmed.substring(7).trim();
      if (port) exposePorts.push(port);
      continue;
    }

    if (upper.startsWith('CMD ')) {
      const rest = trimmed.substring(4).trim();
      // CMD ["bash"] → bash
      const jsonMatch = /^\[(.+)]$/.exec(rest);
      if (jsonMatch) {
        try {
          const arr = JSON.parse(`[${jsonMatch[1]}]`);
          cmd = arr.join(' ');
        } catch {
          cmd = rest;
        }
      } else {
        cmd = rest;
      }
      continue;
    }

    // ENTRYPOINT 등 지원 안 되는 지시자는 무시 (editor 모드에서 유지됨)
    pendingVolumeName = null;
  }

  return {
    baseImage,
    instructions,
    workdir,
    exposePorts: exposePorts.join(' '),
    cmd,
    labels,
  };
}

/* ── Generate Dockerfile ── */

export function generateDockerfileContent(fields: DockerfileFields, imageTitle = ''): string {
  const lines: string[] = [];

  lines.push(`FROM ${fields.baseImage || '<base-image>'}`);
  lines.push('');

  for (const instr of fields.instructions) {
    switch (instr.type) {
      case 'RUN':
        if (instr.command?.trim()) {
          lines.push(`RUN ${instr.command.trim()}`);
          lines.push('');
        }
        break;
      case 'COPY_VOLUME':
        if (instr.volumeName && instr.volumePath?.trim() && instr.volumeDest?.trim()) {
          // PVC 루트 기준 상대 경로로 변환 (앞의 / 제거)
          const relativePath = instr.volumePath.trim().replace(/^\/+/, '');
          lines.push(`# Source: AIPub Volume "${instr.volumeName}"`);
          lines.push(`COPY ${relativePath} ${instr.volumeDest.trim()}`);
          lines.push('');
        }
        break;
      case 'ENV': {
        const parts = (instr.envPairs ?? [])
          .filter((p) => p.key.trim())
          .map((p) => `${p.key.trim()}=${p.value.trim()}`);
        if (parts.length > 0) {
          lines.push(`ENV ${parts.join(' ')}`);
          lines.push('');
        }
        break;
      }
    }
  }

  if (fields.workdir.trim()) {
    lines.push(`WORKDIR ${fields.workdir.trim()}`);
    lines.push('');
  }

  const ports = fields.exposePorts
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (ports.length > 0) {
    ports.forEach((p) => lines.push(`EXPOSE ${p}`));
    lines.push('');
  }

  if (fields.cmd.trim()) {
    const cmdParts = fields.cmd.trim().split(/\s+/);
    lines.push(`CMD [${cmdParts.map((p) => `"${p}"`).join(', ')}]`);
  }

  // 이미지 메타데이터 LABEL (최하단). title 은 Dockerfile 이름에서 자동. 빈 값은 생략.
  // 라벨만 바뀔 때 위쪽 RUN 레이어 캐시가 깨지지 않도록 맨 끝에 둔다.
  const labelLines = buildLabelLines(fields.labels, imageTitle);
  if (labelLines.length > 0) {
    if (lines[lines.length - 1] !== '') lines.push('');
    labelLines.forEach((l) => lines.push(l));
  }

  return lines.join('\n') + '\n';
}

/* ── Extract base image from Dockerfile content ── */

// 첫 번째 유효한 `FROM <image>` 라인에서 베이스 이미지 ref 를 추출한다.
// 주석(#) / 빈 줄은 건너뛰고, `FROM --platform=... image AS stage` 형태에서
// 플래그와 `AS <stage>` 별칭을 제외한 이미지 토큰만 반환한다. 없으면 ''.
export function extractBaseImage(content: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^FROM\s+(.+)$/i.exec(line);
    if (!match) continue;
    const tokens = match[1].trim().split(/\s+/);
    for (const token of tokens) {
      if (token.startsWith('--')) continue; // --platform 등 플래그 무시
      return token; // 첫 번째 비-플래그 토큰이 이미지 ref (이후 AS stage 는 무시)
    }
  }
  return '';
}
