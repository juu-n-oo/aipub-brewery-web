import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultFields,
  extractBaseImage,
  generateDockerfileContent,
  newId,
  parseDockerfileContent,
  type DockerfileFields,
  type ImageLabelFields,
  type Instruction,
  type InstructionType,
} from '@/lib/dockerfile-content';
import { STANDARD_META_KEYS } from './standard-meta';
import type { Dockerfile } from '@/types/dockerfile';

export type EditorMode = 'form' | 'editor';

/** 빈 라벨 입력란 1개를 기본으로 둔다(폼 UX 일관성). */
function ensureCustomRow(fields: DockerfileFields): DockerfileFields {
  if (fields.labels.custom.length === 0) {
    return { ...fields, labels: { ...fields.labels, custom: [{ key: '', value: '' }] } };
  }
  return fields;
}

/**
 * 에디터의 폼 필드 ↔ Dockerfile content 동기화 / dirty 추적을 캡슐화하는 훅.
 * (이전에는 DockerfileEditorPage god-component 의 ~20 useState + 7 useEffect 에 섞여 있었다.)
 */
export function useDockerfileEditorState(params: {
  isEdit: boolean;
  existing?: Dockerfile;
  username?: string;
  /** content 동기화 시 제목으로 쓸 이름(폼 name 값). title LABEL 자동 생성용. */
  nameValue: string;
}) {
  const { isEdit, existing, username, nameValue } = params;

  const [content, setContent] = useState('');
  const [fields, setFields] = useState<DockerfileFields>({ ...defaultFields, instructions: [] });
  const [mode, setMode] = useState<EditorMode>('form');
  const [metaExpanded, setMetaExpanded] = useState(false);

  // 초기 하이드레이션(EDIT 시 기존 데이터 주입)이 끝났는지 추적한다.
  // 이 플래그가 false 인 동안 form↔content 동기화 effect 를 막아 "수정 화면을 열고
  // 아무것도 건드리지 않은 채 저장하면 content 가 그대로" 인 불변식을 보장한다.
  const didInitRef = useRef(false);

  // EDIT: 기존 데이터로 하이드레이션
  useEffect(() => {
    if (!existing) return;
    const parsed = parseDockerfileContent(existing.content);
    if (existing.baseImage) parsed.baseImage = existing.baseImage;
    setContent(existing.content);
    setFields(ensureCustomRow(parsed));
    didInitRef.current = true;
  }, [existing]);

  // CREATE: 주입할 기존 데이터가 없으므로 마운트 직후 동기화 활성화
  useEffect(() => {
    if (!isEdit) didInitRef.current = true;
  }, [isEdit]);

  // CREATE: 이미지 라벨 기본값 — Authors=로그인 사용자, Version=latest (빈 값일 때만 1회)
  useEffect(() => {
    if (isEdit || !username) return;
    setFields((p) =>
      p.labels.authors
        ? p
        : {
            ...p,
            labels: { ...p.labels, authors: username, version: p.labels.version || 'latest' },
          },
    );
  }, [isEdit, username]);

  // 라벨 값이 있으면 메타데이터 섹션 자동 펼침 (접기는 사용자가 직접)
  useEffect(() => {
    const hasValue =
      STANDARD_META_KEYS.some((key) => fields.labels[key]?.trim()) ||
      fields.labels.custom.some((p) => p.key.trim() || p.value.trim());
    if (hasValue) setMetaExpanded((prev) => prev || true);
  }, [fields.labels]);

  // Sync fields → content (form mode)
  useEffect(() => {
    if (!didInitRef.current) return;
    if (mode === 'form') {
      setContent(generateDockerfileContent(fields, nameValue || existing?.name || ''));
    }
  }, [fields, mode, nameValue, existing?.name]);

  /* ── Instruction CRUD ── */

  const addInstruction = (type: InstructionType) => {
    const instr: Instruction = { id: newId(), type };
    if (type === 'RUN') instr.command = '';
    if (type === 'COPY_VOLUME') {
      instr.volumeName = '';
      instr.volumePath = '';
      instr.volumeDest = '/workspace/';
    }
    if (type === 'ENV') instr.envPairs = [{ key: '', value: '' }];
    setFields((prev) => ({ ...prev, instructions: [...prev.instructions, instr] }));
  };

  const updateInstruction = (id: string, patch: Partial<Instruction>) =>
    setFields((prev) => ({
      ...prev,
      instructions: prev.instructions.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const removeInstruction = (id: string) =>
    setFields((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((i) => i.id !== id),
    }));

  const moveInstruction = (idx: number, dir: -1 | 1) =>
    setFields((prev) => {
      const arr = [...prev.instructions];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, instructions: arr };
    });

  const updateLabels = (patch: Partial<ImageLabelFields>) =>
    setFields((p) => ({ ...p, labels: { ...p.labels, ...patch } }));

  const setBaseImage = (v: string) => setFields((p) => ({ ...p, baseImage: v }));

  /* ── Mode switch (editor → form 재파싱) ── */

  const switchToForm = useCallback(() => {
    if (mode === 'editor') {
      setFields(ensureCustomRow(parseDockerfileContent(content)));
    }
    setMode('form');
  }, [mode, content]);

  /** 저장 시 전송할 baseImage: form 모드는 입력 필드, editor 모드는 content 의 FROM 파싱. */
  const resolveBaseImage = () =>
    mode === 'form' ? fields.baseImage.trim() : extractBaseImage(content);

  return {
    content,
    setContent,
    fields,
    setFields,
    mode,
    setMode,
    metaExpanded,
    setMetaExpanded,
    addInstruction,
    updateInstruction,
    removeInstruction,
    moveInstruction,
    updateLabels,
    setBaseImage,
    switchToForm,
    resolveBaseImage,
  };
}
