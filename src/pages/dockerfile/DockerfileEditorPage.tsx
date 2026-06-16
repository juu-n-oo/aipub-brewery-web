import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Play, Plus, ChevronDown, History } from 'lucide-react';
import {
  useDockerfile,
  useDockerfileList,
  useCreateDockerfile,
  useUpdateDockerfile,
} from '@/hooks/useDockerfiles';
import { useRunBuild } from '@/hooks/useBuilds';
import type { Dockerfile } from '@/types/dockerfile';
import { useAuth } from '@/hooks/useAuthContext';
import { useToast } from '@/hooks/useToast';
import { useProject, useVolumes } from '@/hooks/useK8s';
import { validateDockerfile, type DockerfileWarning } from '@/lib/dockerfile-validator';
import { getErrorMessage } from '@/lib/errors';
import { HARBOR_URL } from '@/lib/env';
import { clampTimeoutMinutesToSeconds, BUILD_TIMEOUT_DEFAULT_MINUTES } from '@/lib/constants';
import { normalizeImageRef } from '@/lib/dockerfile-content';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ImageSelector } from '@/components/ImageSelector';
import { useDockerfileEditorState } from './editor/useDockerfileEditorState';
import { InstructionBlock } from './editor/InstructionBlock';
import { instrTypeOptions } from './editor/instr-options';
import { LabelEditor } from './editor/LabelEditor';
import { BuildDialog } from './editor/BuildDialog';
import { SaveRevisionDialog } from './editor/SaveRevisionDialog';

/* ── Form Schema ── */

type FormData = { name: string; description: string };

/* ── Main Component (orchestration) ── */

export default function DockerfileEditorPage() {
  const { t } = useTranslation();
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects, username, isAdmin } = useAuth();
  const { toast } = useToast();
  const monacoTheme = 'vs-light';
  const dockerfileId = idParam ? Number(idParam) : undefined;
  const isEdit = dockerfileId !== undefined;

  const initialProjectId = searchParams.get('projectId') ?? (projects[0]?.name || '');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);

  const { data: existing, isLoading } = useDockerfile(dockerfileId);
  const createMutation = useCreateDockerfile();
  const updateMutation = useUpdateDockerfile();
  const runBuildMutation = useRunBuild();
  const { data: volumeList } = useVolumes(selectedProjectId);
  const { data: projectData } = useProject(selectedProjectId);
  // 이름 중복 사전검증용: 본인 소유 Dockerfile 목록
  const { data: dfList } = useDockerfileList({
    isAdmin,
    projects: projects.map((p) => p.name),
    owner: username,
  });

  const volumes = volumeList?.items ?? [];
  const imageHubs = projectData?.status?.allBoundImageHubs ?? [];

  const dockerfileSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t('editor.validation.nameRequired'))
          .max(100, t('editor.validation.nameMaxLength'))
          .regex(/^[a-zA-Z0-9._-]+$/, t('editor.validation.namePattern')),
        description: z.string().max(3000, t('editor.validation.descMaxLength')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(dockerfileSchema),
    defaultValues: { name: '', description: '' },
  });

  const nameValue = watch('name');

  // 폼 필드 ↔ content 동기화/dirty 추적은 전용 훅으로 분리.
  const editorState = useDockerfileEditorState({ isEdit, existing, username, nameValue });
  const {
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
  } = editorState;

  const [warnings, setWarnings] = useState<DockerfileWarning[]>([]);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showAddInstr, setShowAddInstr] = useState(false);
  const [buildTag, setBuildTag] = useState('latest');
  const [buildImageName, setBuildImageName] = useState('');
  const [selectedImageHub, setSelectedImageHub] = useState('');
  const [buildContextVolume, setBuildContextVolume] = useState('');
  const [buildContextSubPath, setBuildContextSubPath] = useState('');
  const [buildTimeoutMinutes, setBuildTimeoutMinutes] = useState(BUILD_TIMEOUT_DEFAULT_MINUTES);
  const [buildAfterCreate, setBuildAfterCreate] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<FormData | null>(null);
  const [baseImageError, setBaseImageError] = useState('');

  // 사용자가 빌드 다이얼로그의 이미지 이름을 직접 수정했는지 추적한다.
  const buildImageNameDirty = useRef(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  // EDIT 하이드레이션: 폼 필드(name/description/project)는 페이지가 소유.
  useEffect(() => {
    if (existing) {
      setValue('name', existing.name);
      setValue('description', existing.description || '');
      setSelectedProjectId(existing.project);
    }
  }, [existing, setValue]);

  // imageHub 목록이 로드되면 첫 번째를 기본 선택
  useEffect(() => {
    if (imageHubs.length > 0 && !selectedImageHub) {
      setSelectedImageHub(imageHubs[0]);
    }
  }, [imageHubs, selectedImageHub]);

  // 이미지 이름 기본값 = Dockerfile 이름 (직접 수정 전까지만 동기화)
  useEffect(() => {
    if (buildImageNameDirty.current) return;
    const name = existing?.name ?? nameValue;
    if (name) setBuildImageName(name);
  }, [nameValue, existing?.name]);

  const updateMarkers = useCallback((value: string) => {
    const newWarnings = validateDockerfile(value);
    setWarnings(newWarnings);
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const markers: Monaco.editor.IMarkerData[] = newWarnings.map((w) => ({
      severity: monaco.MarkerSeverity.Warning,
      message: w.message,
      startLineNumber: w.line,
      startColumn: 1,
      endLineNumber: w.line,
      endColumn: model.getLineMaxColumn(w.line),
    }));
    monaco.editor.setModelMarkers(model, 'dockerfile-validator', markers);
  }, []);

  // content 변경 시(폼 동기화 또는 직접 편집) 마커 갱신.
  useEffect(() => {
    updateMarkers(content);
  }, [content, updateMarkers]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    updateMarkers(content);
  };

  const handleEditorChange = (value: string | undefined) => {
    setContent(value ?? '');
  };

  // form↔editor 전환 가드(WEB-15): editor 에서 form 으로 갈 때 미지원 지시자 소실 경고.
  const handleSwitchToForm = () => {
    if (mode === 'editor' && !window.confirm(t('editor.switchToFormWarning'))) return;
    switchToForm();
  };

  /* ── 빌드 컨텍스트/타깃 이미지 계산 ── */

  const hasCopyInstruction =
    fields.instructions.some((i) => i.type === 'COPY_VOLUME') || /^COPY\s/m.test(content);

  // 모든 ENV 블록 통틀어 2회 이상 등장하는 키 (중복 경고용)
  const duplicateEnvKeys = (() => {
    const counts = new Map<string, number>();
    for (const instr of fields.instructions) {
      if (instr.type !== 'ENV') continue;
      for (const p of instr.envPairs ?? []) {
        const k = p.key.trim();
        if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  })();

  // COPY 가 참조할 빌드 컨텍스트 Volume → PVC 해석
  const buildContextVolName =
    buildContextVolume ||
    fields.instructions.find((i) => i.type === 'COPY_VOLUME' && i.volumeName)?.volumeName ||
    (hasCopyInstruction && volumes.length > 0 ? volumes[0].name : '');
  const buildContextPvc = volumes.find((v) => v.name === buildContextVolName)?.pvcName;
  const buildContextMissing = hasCopyInstruction && !buildContextPvc;

  // 빌드 대상 이미지 ref 조립
  const targetImageRepo = buildImageName.trim();
  const targetTag = buildTag.trim() || 'latest';
  const targetImageRef =
    selectedImageHub && targetImageRepo
      ? `${HARBOR_URL}/${selectedImageHub}/${targetImageRepo}`
      : '';
  const targetImageFull = targetImageRef ? `${targetImageRef}:${targetTag}` : '';
  const overwritesBase =
    !!targetImageFull &&
    normalizeImageRef(targetImageFull) === normalizeImageRef(resolveBaseImage());

  // 이름 중복 검사 (프론트 사전검증)
  const trimmedName = (nameValue ?? '').trim();
  const duplicateName =
    !!trimmedName &&
    (dfList ?? []).some(
      (d) =>
        d.project === selectedProjectId &&
        d.username === username &&
        d.name === trimmedName &&
        d.id !== dockerfileId,
    );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* ── baseImage 검증 ── */

  const validateBaseImage = (): boolean => {
    if (!resolveBaseImage()) {
      if (mode === 'form') {
        setBaseImageError(t('editor.baseImageRequired'));
      } else {
        toast({
          title: t('editor.fromRequiredTitle'),
          description: t('editor.fromRequiredDesc'),
          variant: 'destructive',
        });
      }
      return false;
    }
    setBaseImageError('');
    return true;
  };

  /* ── 빌드 컨텍스트 Volume 자동 감지 (두 빌드 버튼 공유 — WEB-2) ── */

  const resolveBuildContextVolume = () => {
    if (!buildContextVolume && hasCopyInstruction && volumes.length > 0) {
      const volInstr = fields.instructions.find((i) => i.type === 'COPY_VOLUME' && i.volumeName);
      setBuildContextVolume(volInstr?.volumeName || volumes[0].name);
    }
  };

  /* ── 빌드 다이얼로그 정리 (WEB-2) ── */

  const finishBuild = () => {
    setShowBuildDialog(false);
    setBuildAfterCreate(false);
  };

  /* ── Submit (저장) ── */

  const onSubmit = (data: FormData) => {
    if (!validateBaseImage()) return;
    if (duplicateName) return;
    if (isEdit && dockerfileId !== undefined) {
      setPendingSaveData(data);
      setRevisionMessage('');
      setShowSaveDialog(true);
    } else {
      const baseImage = resolveBaseImage();
      createMutation.mutate(
        {
          name: data.name,
          description: data.description ?? '',
          content,
          baseImage,
          project: selectedProjectId,
        },
        {
          onSuccess: () => navigate(`/dockerfiles?projectId=${selectedProjectId}`),
          onError: (e) =>
            toast({
              title: t('editor.createFailed'),
              description: getErrorMessage(e),
              variant: 'destructive',
            }),
        },
      );
    }
  };

  const handleConfirmSave = () => {
    if (!pendingSaveData || dockerfileId === undefined) return;
    const baseImage = resolveBaseImage();
    updateMutation.mutate(
      {
        id: dockerfileId,
        data: {
          name: pendingSaveData.name,
          description: pendingSaveData.description,
          content,
          baseImage,
          message: revisionMessage || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowSaveDialog(false);
          setPendingSaveData(null);
          navigate(`/dockerfiles?projectId=${selectedProjectId}`);
        },
        onError: (e) =>
          toast({
            title: t('editor.saveFailed'),
            description: getErrorMessage(e),
            variant: 'destructive',
          }),
      },
    );
  };

  /* ── Build ── */

  const handleBuild = () => {
    const buildOptions = {
      targetImage: targetImageRef,
      tag: targetTag,
      buildTimeoutSeconds: clampTimeoutMinutesToSeconds(buildTimeoutMinutes),
      ...(buildContextPvc ? { buildContextPvc } : {}),
      ...(buildContextSubPath ? { buildContextSubPath } : {}),
    };

    // EDIT·CREATE-성공 경로를 모두 라우팅하는 단일 클로저 (WEB-2)
    const startBuild = (df: Dockerfile) =>
      runBuildMutation.mutate(
        { dockerfile: df, ...buildOptions },
        {
          onSuccess: (build) => {
            finishBuild();
            navigate(`/builds/${build.namespace}/${build.name}`);
          },
          onError: (e) =>
            toast({
              title: t('editor.buildFailed'),
              description: getErrorMessage(e),
              variant: 'destructive',
            }),
        },
      );

    // EDIT 모드: 이미 저장된 Dockerfile 로 바로 빌드.
    if (dockerfileId !== undefined) {
      if (existing) startBuild(existing);
      return;
    }

    // CREATE 모드 ("생성 후 빌드"): 생성 → 성공 시 그 결과로 빌드.
    const baseImage = resolveBaseImage();
    const data = getValues();
    createMutation.mutate(
      {
        name: data.name,
        description: data.description ?? '',
        content,
        baseImage,
        project: selectedProjectId,
      },
      {
        onSuccess: (created) =>
          // 빌드가 실패해도 Dockerfile 은 이미 저장된 상태.
          runBuildMutation.mutate(
            { dockerfile: created, ...buildOptions },
            {
              onSuccess: (build) => {
                finishBuild();
                navigate(`/builds/${build.namespace}/${build.name}`);
              },
              onError: () => {
                finishBuild();
                toast({
                  title: t('editor.buildStartedButFailedTitle'),
                  description: t('editor.buildStartedButFailedDesc'),
                  variant: 'destructive',
                });
                navigate(`/dockerfiles?projectId=${selectedProjectId}`);
              },
            },
          ),
        onError: (e) => {
          finishBuild();
          toast({
            title: t('editor.createFailed'),
            description: getErrorMessage(e),
            variant: 'destructive',
          });
        },
      },
    );
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          {isEdit ? t('editor.editTitle') : t('editor.createTitle')}
        </h1>
        {isEdit && existing?.latestVersion && (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
            v{existing.latestVersion}
          </span>
        )}
        {isEdit && dockerfileId !== undefined && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => navigate(`/dockerfiles/${dockerfileId}/revisions`)}
          >
            <History className="h-3.5 w-3.5" />
            {t('dockerfile.history')}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 flex-1">
        {/* 기본 설정 */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">{t('editor.section.basic')}</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="project">
                {t('editor.project')} <span className="text-destructive">*</span>
              </Label>
              {isEdit ? (
                <Input id="project" value={selectedProjectId} disabled />
              ) : (
                <div className="relative">
                  <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-card px-3.5 py-1 text-base appearance-none outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="name">
                {t('editor.nameRequired')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('editor.namePlaceholder')}
                aria-invalid={!!errors.name || duplicateName}
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : duplicateName ? (
                <p className="text-sm text-destructive">{t('editor.duplicateName')}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="description">{t('editor.description')}</Label>
              <textarea
                id="description"
                placeholder={t('editor.descriptionPlaceholder')}
                {...register('description')}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3.5 py-2.5 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] resize-y"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Dockerfile 설정 */}
        <section className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{t('editor.section.dockerfile')}</h2>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={handleSwitchToForm}
                className={`px-5 py-2 text-sm font-medium transition-colors ${mode === 'form' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              >
                {t('editor.modeForm')}
              </button>
              <button
                type="button"
                onClick={() => setMode('editor')}
                className={`px-5 py-2 text-sm font-medium transition-colors ${mode === 'editor' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              >
                {t('editor.modeEditor')}
              </button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 p-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-sm text-foreground">
                <p className="font-medium">{t('dockerfile.unsupportedDirective')}</p>
              </div>
            </div>
          )}

          {mode === 'form' ? (
            <div className="flex gap-6 flex-1">
              {/* Left: Input Fields */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Base Image */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-base font-bold text-foreground mb-1">
                    {t('editor.baseImage')} <span className="text-destructive">*</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('editor.baseImageDescription')}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('editor.baseImagePlaceholder')}
                      value={fields.baseImage}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBaseImage(v);
                        if (v.trim()) setBaseImageError('');
                      }}
                      aria-invalid={!!baseImageError}
                      className={`flex-1 ${baseImageError ? 'border-destructive focus-within:border-destructive focus-within:ring-destructive/40' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setShowImageSelector(true)}
                    >
                      {t('editor.baseImageImport')}
                    </Button>
                  </div>
                  {baseImageError && (
                    <p className="text-sm text-destructive mt-2">{baseImageError}</p>
                  )}
                </div>

                {/* Instruction Blocks */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {t('editor.instructionBlocks')}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('editor.instructionBlocksDescription')}
                      </p>
                    </div>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddInstr((v) => !v)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('editor.addInstruction')}
                      </Button>
                      {showAddInstr && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowAddInstr(false)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-card shadow-lg py-1">
                            {instrTypeOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-base hover:bg-muted transition-colors text-left"
                                onClick={() => {
                                  addInstruction(opt.value);
                                  setShowAddInstr(false);
                                }}
                              >
                                <span className="text-primary">{opt.icon}</span>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {opt.value === 'RUN' || opt.value === 'ENV'
                                      ? opt.value
                                      : t(opt.labelKey)}
                                  </div>
                                  <div className="text-xs text-muted-foreground/70">
                                    {t(opt.descKey)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {fields.instructions.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/70 border border-dashed border-border rounded-md">
                      {t('editor.instructionsEmpty')}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {fields.instructions.map((instr, idx) => (
                        <InstructionBlock
                          key={instr.id}
                          instr={instr}
                          idx={idx}
                          total={fields.instructions.length}
                          namespace={selectedProjectId}
                          duplicateEnvKeys={duplicateEnvKeys}
                          onUpdate={(patch) => updateInstruction(instr.id, patch)}
                          onRemove={() => removeInstruction(instr.id)}
                          onMove={(dir) => moveInstruction(idx, dir)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom: WORKDIR, EXPOSE, CMD */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-base font-bold text-foreground mb-3">
                    {t('editor.execSettings')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>WORKDIR</Label>
                      <Input
                        placeholder="/workspace"
                        value={fields.workdir}
                        onChange={(e) => setFields((p) => ({ ...p, workdir: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('editor.exposePortLabel')}</Label>
                      <Input
                        placeholder={t('editor.exposePortPlaceholder')}
                        value={fields.exposePorts}
                        onChange={(e) => setFields((p) => ({ ...p, exposePorts: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <Label>{t('editor.cmdLabel')}</Label>
                      <Input
                        placeholder={t('editor.cmdPlaceholder')}
                        value={fields.cmd}
                        onChange={(e) => setFields((p) => ({ ...p, cmd: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-medium text-muted-foreground mb-2">
                  {t('editor.preview')}
                </span>
                <div className="flex-1 min-h-[400px] border border-border rounded-lg overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="dockerfile"
                    value={content}
                    onMount={handleEditorMount}
                    theme={monacoTheme}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      tabSize: 2,
                      padding: { top: 12 },
                      renderLineHighlight: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[400px] border border-border rounded-lg overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="dockerfile"
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme={monacoTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  padding: { top: 12 },
                  renderLineHighlight: 'line',
                }}
              />
            </div>
          )}
        </section>

        {mode === 'form' && (
          <>
            <hr className="border-border" />
            <LabelEditor
              labels={fields.labels}
              username={username || ''}
              expanded={metaExpanded}
              onToggleExpand={() => setMetaExpanded((v) => !v)}
              onChange={updateLabels}
            />
          </>
        )}

        {/* 하단 액션 바 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dockerfiles?projectId=${selectedProjectId}`)}
          >
            {t('common.cancel')}
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBuildAfterCreate(false);
                resolveBuildContextVolume();
                setShowBuildDialog(true);
              }}
              disabled={warnings.length > 0}
            >
              <Play className="h-4 w-4" /> {t('build.run')}
            </Button>
          )}
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || warnings.length > 0 || duplicateName}
              onClick={async () => {
                const nameValid = await trigger('name');
                if (!nameValid || !validateBaseImage() || duplicateName) return;
                resolveBuildContextVolume();
                setBuildAfterCreate(true);
                setShowBuildDialog(true);
              }}
            >
              <Play className="h-4 w-4" /> {t('editor.buildAfterCreate')}
            </Button>
          )}
          <Button type="submit" disabled={isSaving || duplicateName}>
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>

      <SaveRevisionDialog
        open={showSaveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowSaveDialog(false);
            setPendingSaveData(null);
          }
        }}
        message={revisionMessage}
        onMessageChange={setRevisionMessage}
        onConfirm={handleConfirmSave}
        saving={updateMutation.isPending}
      />

      <BuildDialog
        open={showBuildDialog}
        onOpenChange={(open) => {
          setShowBuildDialog(open);
          if (!open) setBuildAfterCreate(false);
        }}
        buildAfterCreate={buildAfterCreate}
        imageHubs={imageHubs}
        selectedImageHub={selectedImageHub}
        onSelectImageHub={setSelectedImageHub}
        imageName={buildImageName}
        onImageNameChange={(v) => {
          buildImageNameDirty.current = true;
          setBuildImageName(v);
        }}
        tag={buildTag}
        onTagChange={setBuildTag}
        targetImageRef={targetImageRef}
        targetImageFull={targetImageFull}
        targetTag={targetTag}
        timeoutMinutes={buildTimeoutMinutes}
        onTimeoutMinutesChange={setBuildTimeoutMinutes}
        overwritesBase={overwritesBase}
        baseImage={resolveBaseImage()}
        hasCopyInstruction={hasCopyInstruction}
        volumes={volumes}
        buildContextVolume={buildContextVolume}
        onBuildContextVolumeChange={setBuildContextVolume}
        buildContextSubPath={buildContextSubPath}
        onBuildContextSubPathChange={setBuildContextSubPath}
        buildContextMissing={buildContextMissing}
        onConfirm={handleBuild}
        confirmDisabled={
          runBuildMutation.isPending ||
          createMutation.isPending ||
          !targetImageRef ||
          buildContextMissing
        }
      />

      {/* Image Selector */}
      <ImageSelector
        projectId={selectedProjectId}
        open={showImageSelector}
        onOpenChange={setShowImageSelector}
        onSelect={(imageRef) => {
          setBaseImage(imageRef);
          if (imageRef.trim()) setBaseImageError('');
        }}
      />
    </div>
  );
}
