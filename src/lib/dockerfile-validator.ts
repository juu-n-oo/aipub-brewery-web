export interface DockerfileWarning {
  line: number;
  message: string;
  directive: string;
}

const UNSUPPORTED_DIRECTIVES = /^\s*(ADD)\s/i;

/**
 * Dockerfile 내용에서 미지원 지시자(ADD)를 감지한다.
 * COPY는 업로드 파일 및 AIPub Volume 연동으로 지원됨.
 */
export function validateDockerfile(content: string): DockerfileWarning[] {
  const warnings: DockerfileWarning[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('#')) continue;

    const match = line.match(UNSUPPORTED_DIRECTIVES);
    if (match) {
      const directive = match[1].toUpperCase();
      warnings.push({
        line: i + 1,
        message: `${directive} 지시자는 지원하지 않습니다. COPY를 사용해 주세요.`,
        directive,
      });
    }
  }

  return warnings;
}

/**
 * COPY/ADD 지시자가 포함되어 있으면 true를 반환한다.
 */
export function hasUnsupportedDirectives(content: string): boolean {
  return validateDockerfile(content).length > 0;
}
