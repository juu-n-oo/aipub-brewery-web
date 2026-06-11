import type { StandardMetaKey } from '@/lib/dockerfile-content';

/**
 * 메타데이터 영역의 표준(OCI) 입력 필드 정의. title 은 Dockerfile 이름에서 자동이라 제외.
 * 라벨/플레이스홀더는 i18n 키.
 */
export const STANDARD_META: { key: StandardMetaKey; labelKey: string; placeholderKey: string }[] = [
  {
    key: 'version',
    labelKey: 'editor.standard.version',
    placeholderKey: 'editor.standard.versionPlaceholder',
  },
  {
    key: 'authors',
    labelKey: 'editor.standard.authors',
    placeholderKey: 'editor.standard.authorsPlaceholder',
  },
  {
    key: 'licenses',
    labelKey: 'editor.standard.licenses',
    placeholderKey: 'editor.standard.licensesPlaceholder',
  },
  { key: 'url', labelKey: 'editor.standard.url', placeholderKey: 'editor.standard.urlPlaceholder' },
  {
    key: 'documentation',
    labelKey: 'editor.standard.documentation',
    placeholderKey: 'editor.standard.documentationPlaceholder',
  },
];

/** STANDARD_META 의 key 목록 — prefill/파싱 결과 자동 펼침 판단에 사용. */
export const STANDARD_META_KEYS: StandardMetaKey[] = STANDARD_META.map((m) => m.key);
