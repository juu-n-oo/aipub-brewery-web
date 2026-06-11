import { Terminal, HardDrive, Variable } from 'lucide-react';
import type { InstructionType } from '@/lib/dockerfile-content';

/**
 * 명령어 타입별 표시 메타 (라벨/설명은 i18n 키).
 * 컴포넌트 파일과 분리해 fast-refresh 규칙을 만족시킨다.
 */
export const instrTypeOptions: {
  value: InstructionType;
  labelKey: string;
  icon: React.ReactNode;
  descKey: string;
}[] = [
  {
    value: 'RUN',
    labelKey: 'RUN',
    icon: <Terminal className="h-3.5 w-3.5" />,
    descKey: 'editor.runDesc',
  },
  {
    value: 'COPY_VOLUME',
    labelKey: 'editor.copyLabel',
    icon: <HardDrive className="h-3.5 w-3.5" />,
    descKey: 'editor.copyDesc',
  },
  {
    value: 'ENV',
    labelKey: 'editor.envDesc',
    icon: <Variable className="h-3.5 w-3.5" />,
    descKey: 'editor.envDesc',
  },
];

/** 명령어 타입 라벨(RUN/ENV 는 리터럴, COPY 는 i18n). */
export function instrTypeLabel(type: InstructionType, t: (k: string) => string): string {
  if (type === 'RUN') return 'RUN';
  if (type === 'ENV') return 'ENV';
  return t('editor.copyLabel');
}
