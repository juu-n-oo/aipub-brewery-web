import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle, Play, Plus, Trash2, ChevronDown, ChevronUp,
  Upload, HardDrive, Terminal, Variable, Copy,
} from 'lucide-react';
import { useDockerfile, useCreateDockerfile, useUpdateDockerfile } from '@/hooks/useDockerfiles';
import { useRunBuild } from '@/hooks/useBuilds';
import { useAuth } from '@/hooks/useAuthContext';
import { useProject, useVolumes } from '@/hooks/useK8s';
import { validateDockerfile, type DockerfileWarning } from '@/lib/dockerfile-validator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ImageSelector } from '@/components/ImageSelector';
import { VolumeBrowser } from '@/components/VolumeBrowser';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';

const HARBOR_URL = import.meta.env.VITE_HARBOR_URL || 'aipub-harbor.cluster7.idc1.ten1010.io';

/* ── Types ── */

type InstructionType = 'RUN' | 'COPY_UPLOAD' | 'COPY_VOLUME' | 'ENV';

interface Instruction {
  id: string;
  type: InstructionType;
  // RUN
  command?: string;
  // COPY (upload)
  uploadFileName?: string;
  uploadDest?: string;
  // COPY (volume)
  volumeName?: string;
  volumePath?: string;
  volumeDest?: string;
  // ENV
  envKey?: string;
  envValue?: string;
}

interface DockerfileFields {
  baseImage: string;
  instructions: Instruction[];
  workdir: string;
  exposePorts: string;
  cmd: string;
}

const defaultFields: DockerfileFields = {
  baseImage: '',
  instructions: [],
  workdir: '/workspace',
  exposePorts: '',
  cmd: 'bash',
};

let nextInstrId = 1;
function newId() { return `instr-${nextInstrId++}`; }

/* ── Generate Dockerfile ── */

function generateDockerfileContent(fields: DockerfileFields, _uploadedFiles?: Map<string, File>): string {
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
      case 'COPY_UPLOAD':
        if (instr.uploadFileName && instr.uploadDest?.trim()) {
          lines.push(`COPY ${instr.uploadFileName} ${instr.uploadDest.trim()}`);
          lines.push('');
        }
        break;
      case 'COPY_VOLUME':
        if (instr.volumeName && instr.volumePath?.trim() && instr.volumeDest?.trim()) {
          // Volume mount path — Kaniko에서 PVC를 마운트하여 사용
          lines.push(`# Source: AIPub Volume "${instr.volumeName}" (${instr.volumePath})`);
          lines.push(`COPY ${instr.volumePath.trim()} ${instr.volumeDest.trim()}`);
          lines.push('');
        }
        break;
      case 'ENV':
        if (instr.envKey?.trim()) {
          lines.push(`ENV ${instr.envKey.trim()}=${instr.envValue?.trim() ?? ''}`);
          lines.push('');
        }
        break;
    }
  }

  if (fields.workdir.trim()) {
    lines.push(`WORKDIR ${fields.workdir.trim()}`);
    lines.push('');
  }

  const ports = fields.exposePorts.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (ports.length > 0) {
    ports.forEach((p) => lines.push(`EXPOSE ${p}`));
    lines.push('');
  }

  if (fields.cmd.trim()) {
    const cmdParts = fields.cmd.trim().split(/\s+/);
    lines.push(`CMD [${cmdParts.map((p) => `"${p}"`).join(', ')}]`);
  }

  return lines.join('\n') + '\n';
}

/* ── Form Schema ── */

const dockerfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Dockerfile 이름을 입력하세요')
    .max(100, '이름은 100자 이내로 입력하세요')
    .regex(/^[a-zA-Z0-9._-]+$/, '영문, 숫자, -, _, . 만 사용할 수 있습니다'),
  description: z.string().max(3000, '설명은 3000자 이내로 입력하세요'),
});

type FormData = z.infer<typeof dockerfileSchema>;

/* ── Instruction Type Config ── */

const instrTypeOptions: { value: InstructionType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'RUN', label: 'RUN', icon: <Terminal className="h-3.5 w-3.5" />, desc: '쉘 명령어 실행' },
  { value: 'COPY_UPLOAD', label: 'COPY (파일 업로드)', icon: <Upload className="h-3.5 w-3.5" />, desc: '업로드한 파일을 이미지에 복사' },
  { value: 'COPY_VOLUME', label: 'COPY (Volume)', icon: <HardDrive className="h-3.5 w-3.5" />, desc: 'AIPub Volume에서 파일 복사' },
  { value: 'ENV', label: 'ENV', icon: <Variable className="h-3.5 w-3.5" />, desc: '환경 변수 설정' },
];

/* ── Main Component ── */

export default function DockerfileEditorPage() {
  const { t } = useTranslation();
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { username, projects } = useAuth();
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

  const volumes = volumeList?.items ?? [];
  const imageHubs = projectData?.status?.allBoundImageHubs ?? [];

  const [content, setContent] = useState('');
  const [fields, setFields] = useState<DockerfileFields>({ ...defaultFields, instructions: [] });
  const [uploadedFiles] = useState<Map<string, File>>(new Map());
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<DockerfileWarning[]>([]);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showAddInstr, setShowAddInstr] = useState(false);
  const [buildTag, setBuildTag] = useState('latest');
  const [buildImageName, setBuildImageName] = useState('');
  const [selectedImageHub, setSelectedImageHub] = useState('');
  const [buildContextVolume, setBuildContextVolume] = useState('');
  const [buildContextSubPath, setBuildContextSubPath] = useState('');
  const [mode, setMode] = useState<'form' | 'editor'>('form');
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(dockerfileSchema),
    defaultValues: { name: '', description: '' },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (existing) {
      setValue('name', existing.name);
      setValue('description', existing.description || '');
      setContent(existing.content);
      setSelectedProjectId(existing.project);
    }
  }, [existing, setValue]);

  // imageHub 목록이 로드되면 첫 번째를 기본 선택
  useEffect(() => {
    if (imageHubs.length > 0 && !selectedImageHub) {
      setSelectedImageHub(imageHubs[0]);
    }
  }, [imageHubs, selectedImageHub]);

  // imageHub 또는 이름 변경 시 buildImageName 갱신
  useEffect(() => {
    const name = existing?.name ?? nameValue;
    if (selectedImageHub && name) {
      setBuildImageName(`${HARBOR_URL}/${selectedImageHub}/${name}`);
    }
  }, [selectedImageHub, nameValue, existing?.name]);

  // Sync fields → content (form mode)
  useEffect(() => {
    if (mode === 'form') {
      const generated = generateDockerfileContent(fields, uploadedFiles);
      setContent(generated);
      updateMarkers(generated);
    }
  }, [fields, mode, uploadedFileNames]);

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

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    updateMarkers(content);
  };

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value ?? '';
    setContent(newValue);
    updateMarkers(newValue);
  };

  /* ── Instruction CRUD ── */

  const addInstruction = (type: InstructionType) => {
    const instr: Instruction = { id: newId(), type };
    if (type === 'RUN') instr.command = '';
    if (type === 'COPY_UPLOAD') { instr.uploadFileName = ''; instr.uploadDest = '/workspace/'; }
    if (type === 'COPY_VOLUME') { instr.volumeName = ''; instr.volumePath = ''; instr.volumeDest = '/workspace/'; }
    if (type === 'ENV') { instr.envKey = ''; instr.envValue = ''; }
    setFields((prev) => ({ ...prev, instructions: [...prev.instructions, instr] }));
    setShowAddInstr(false);
  };

  const updateInstruction = (id: string, patch: Partial<Instruction>) => {
    setFields((prev) => ({
      ...prev,
      instructions: prev.instructions.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const removeInstruction = (id: string) => {
    setFields((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((i) => i.id !== id),
    }));
  };

  const moveInstruction = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const arr = [...prev.instructions];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, instructions: arr };
    });
  };

  /* ── File Upload ── */

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      uploadedFiles.set(file.name, file);
    }
    setUploadedFileNames([...uploadedFiles.keys()]);
    e.target.value = '';
  };

  const removeUploadedFile = (name: string) => {
    uploadedFiles.delete(name);
    setUploadedFileNames([...uploadedFiles.keys()]);
  };

  /* ── Submit ── */

  const onSubmit = (data: FormData) => {
    if (isEdit && dockerfileId !== undefined) {
      updateMutation.mutate(
        { id: dockerfileId, data: { name: data.name, description: data.description, content } },
        { onSuccess: () => navigate(`/dockerfiles?projectId=${selectedProjectId}`) },
      );
    } else {
      createMutation.mutate(
        { name: data.name, description: data.description ?? '', content, project: selectedProjectId, username },
        { onSuccess: () => navigate(`/dockerfiles?projectId=${selectedProjectId}`) },
      );
    }
  };

  const handleBuild = () => {
    if (dockerfileId === undefined) return;
    // Volume 이름 → pvcName 변환
    const selectedVol = volumes.find((v) => v.name === buildContextVolume);
    const pvcName = selectedVol?.pvcName;

    runBuildMutation.mutate(
      {
        dockerfileId,
        targetImage: buildImageName,
        tag: buildTag,
        ...(pvcName ? { buildContextPvc: pvcName } : {}),
        ...(buildContextSubPath ? { buildContextSubPath } : {}),
      },
      {
        onSuccess: (build) => {
          setShowBuildDialog(false);
          navigate(`/builds/${build.namespace}/${build.name}`);
        },
      },
    );
  };

  const hasCopyInstruction = fields.instructions.some((i) => i.type === 'COPY_UPLOAD' || i.type === 'COPY_VOLUME')
    || /^COPY\s/m.test(content);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-bold text-text-primary mb-6">
        {isEdit ? `Dockerfile ${t('common.edit')}` : 'Create Dockerfile'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 flex-1">
        {/* 기본 설정 */}
        <section>
          <h2 className="text-base font-bold text-text-primary mb-4">기본 설정</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="project">Project <span className="text-error">*</span></Label>
              {isEdit ? (
                <Input id="project" value={selectedProjectId} disabled />
              ) : (
                <div className="relative">
                  <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border-input bg-white px-3 py-1 text-sm appearance-none outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] cursor-pointer"
                  >
                    {projects.map((p) => (<option key={p.name} value={p.name}>{p.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="name">Dockerfile 이름 <span className="text-error">*</span></Label>
              <Input id="name" placeholder="예: pytorch-cuda-base" {...register('name')} />
              {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                placeholder="Dockerfile에 대한 설명이나 용도를 입력하세요. (선택 사항)"
                {...register('description')}
                rows={3}
                className="flex w-full rounded-md border border-border-input bg-transparent px-3 py-2 text-sm text-text-primary shadow-xs transition-[color,box-shadow] outline-none placeholder:text-text-muted focus-within:border-border-focus focus-within:ring-primary/50 focus-within:ring-[3px] resize-y"
              />
              {errors.description && <p className="text-xs text-error">{errors.description.message}</p>}
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Dockerfile 설정 */}
        <section className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-primary">Dockerfile 설정</h2>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => setMode('form')}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === 'form' ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-muted-bg'}`}>
                입력 폼
              </button>
              <button type="button" onClick={() => setMode('editor')}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === 'editor' ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-muted-bg'}`}>
                에디터
              </button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning-bg p-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-sm text-text-primary">
                <p className="font-medium">{t('dockerfile.unsupportedDirective')}</p>
              </div>
            </div>
          )}

          {mode === 'form' ? (
            <div className="flex gap-6 flex-1">
              {/* Left: Input Fields */}
              <div className="flex-1 flex flex-col gap-4">
                {/* FROM */}
                <div className="rounded-lg border border-border bg-white p-4">
                  <h3 className="text-sm font-bold text-text-primary mb-1">이미지 (FROM)</h3>
                  <p className="text-xs text-text-secondary mb-3">빌드의 기반이 되는 Base 이미지를 선택해 주세요.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="예: harbor.example.com/base/python:3.11-cuda12.1"
                      value={fields.baseImage}
                      onChange={(e) => setFields((p) => ({ ...p, baseImage: e.target.value }))}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" className="shrink-0" onClick={() => setShowImageSelector(true)}>
                      가져오기
                    </Button>
                  </div>
                </div>

                {/* Uploaded Files */}
                <div className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-text-primary">업로드 파일</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" />
                      파일 추가
                    </Button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                  </div>
                  <p className="text-xs text-text-secondary mb-3">
                    COPY 명령어에서 사용할 파일을 업로드하세요. 업로드된 파일은 빌드 컨텍스트에 포함됩니다.
                  </p>
                  {uploadedFileNames.length === 0 ? (
                    <p className="text-xs text-text-muted py-2">업로드된 파일이 없습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFileNames.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 bg-muted-bg rounded-md px-2.5 py-1 text-xs">
                          {name}
                          <button type="button" onClick={() => removeUploadedFile(name)} className="text-error hover:text-error/80">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instruction Blocks */}
                <div className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">명령어 블록</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        RUN, COPY, ENV 명령어를 추가하고 순서를 변경할 수 있습니다.
                      </p>
                    </div>
                    <div className="relative">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddInstr((v) => !v)}>
                        <Plus className="h-3.5 w-3.5" />
                        명령어 추가
                      </Button>
                      {showAddInstr && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAddInstr(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-white shadow-lg py-1">
                            {instrTypeOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted-bg transition-colors text-left"
                                onClick={() => addInstruction(opt.value)}
                              >
                                <span className="text-primary">{opt.icon}</span>
                                <div>
                                  <div className="font-medium text-text-primary">{opt.label}</div>
                                  <div className="text-[10px] text-text-muted">{opt.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {fields.instructions.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-xs text-text-muted border border-dashed border-border rounded-md">
                      "명령어 추가" 버튼으로 RUN, COPY, ENV 블록을 추가하세요.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {fields.instructions.map((instr, idx) => (
                        <InstructionBlock
                          key={instr.id}
                          instr={instr}
                          idx={idx}
                          total={fields.instructions.length}
                          uploadedFileNames={uploadedFileNames}
                          volumes={volumes}
                          namespace={selectedProjectId}
                          onUpdate={(patch) => updateInstruction(instr.id, patch)}
                          onRemove={() => removeInstruction(instr.id)}
                          onMove={(dir) => moveInstruction(idx, dir)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom: WORKDIR, EXPOSE, CMD */}
                <div className="rounded-lg border border-border bg-white p-4">
                  <h3 className="text-sm font-bold text-text-primary mb-3">실행 설정</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>WORKDIR</Label>
                      <Input placeholder="/workspace" value={fields.workdir}
                        onChange={(e) => setFields((p) => ({ ...p, workdir: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>EXPOSE (포트)</Label>
                      <Input placeholder="예: 8888 8080" value={fields.exposePorts}
                        onChange={(e) => setFields((p) => ({ ...p, exposePorts: e.target.value }))} />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <Label>CMD (실행 명령)</Label>
                      <Input placeholder="예: bash" value={fields.cmd}
                        onChange={(e) => setFields((p) => ({ ...p, cmd: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-medium text-text-secondary mb-2">Dockerfile 미리보기</span>
                <div className="flex-1 min-h-[400px] border border-border rounded-lg overflow-hidden">
                  <Editor height="100%" defaultLanguage="dockerfile" value={content}
                    onMount={handleEditorMount} theme="vs-light"
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, fontFamily: 'var(--font-mono)', lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, padding: { top: 12 }, renderLineHighlight: 'none' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[400px] border border-border rounded-lg overflow-hidden">
              <Editor height="100%" defaultLanguage="dockerfile" value={content}
                onChange={handleEditorChange} onMount={handleEditorMount} theme="vs-light"
                options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'var(--font-mono)', lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, padding: { top: 12 }, renderLineHighlight: 'line' }} />
            </div>
          )}
        </section>

        {/* 하단 액션 바 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate(`/dockerfiles?projectId=${selectedProjectId}`)}>
            Cancel
          </Button>
          {isEdit && (
            <Button type="button" variant="outline" onClick={() => setShowBuildDialog(true)} disabled={warnings.length > 0}>
              <Play className="h-4 w-4" /> 빌드 실행
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>{isEdit ? t('common.save') : 'Create'}</Button>
        </div>
      </form>

      {/* Build Dialog */}
      <Dialog open={showBuildDialog} onOpenChange={setShowBuildDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('build.run')}</DialogTitle>
            <DialogDescription>빌드할 이미지 이름과 태그를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {/* ImageHub 선택 */}
            <div className="flex flex-col gap-1.5">
              <Label>ImageHub</Label>
              <div className="relative">
                <select
                  value={selectedImageHub}
                  onChange={(e) => setSelectedImageHub(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border-input bg-white px-3 py-1 text-sm appearance-none outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] cursor-pointer"
                >
                  {imageHubs.map((hub) => (
                    <option key={hub} value={hub}>{hub}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('build.targetImage')}</Label>
              <Input value={buildImageName} onChange={(e) => setBuildImageName(e.target.value)} placeholder={`${HARBOR_URL}/image-hub/image-name`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('build.tag')}</Label>
              <Input value={buildTag} onChange={(e) => setBuildTag(e.target.value)} placeholder={t('build.tagPlaceholder')} />
            </div>

            {/* 빌드 컨텍스트 (COPY 사용 시) */}
            {hasCopyInstruction && (
              <>
                <hr className="border-border" />
                <div className="flex flex-col gap-1.5">
                  <Label>빌드 컨텍스트 Volume</Label>
                  <p className="text-xs text-text-secondary">COPY 명령어에서 참조하는 파일이 있는 Volume을 선택하세요.</p>
                  <div className="relative">
                    <select
                      value={buildContextVolume}
                      onChange={(e) => setBuildContextVolume(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border-input bg-white px-3 py-1 text-sm appearance-none outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] cursor-pointer"
                    >
                      <option value="">선택 안함</option>
                      {volumes.map((v) => (
                        <option key={v.name} value={v.name}>{v.name} ({v.pvcName})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                  </div>
                </div>
                {buildContextVolume && (
                  <div className="flex flex-col gap-1.5">
                    <Label>서브 경로 (선택)</Label>
                    <Input
                      value={buildContextSubPath}
                      onChange={(e) => setBuildContextSubPath(e.target.value)}
                      placeholder="예: /my-project (미지정 시 볼륨 루트)"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuildDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleBuild} disabled={runBuildMutation.isPending || !buildImageName || !buildTag}>
              <Play className="h-4 w-4" /> {t('build.run')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Selector */}
      <ImageSelector projectId={selectedProjectId} open={showImageSelector} onOpenChange={setShowImageSelector}
        onSelect={(imageRef) => setFields((p) => ({ ...p, baseImage: imageRef }))} />
    </div>
  );
}

/* ── Instruction Block Component ── */

// AIPubVolume type used via volumes prop

function InstructionBlock({
  instr, idx, total, uploadedFileNames, namespace,
  onUpdate, onRemove, onMove,
}: {
  instr: Instruction;
  idx: number;
  total: number;
  uploadedFileNames: string[];
  volumes?: unknown;
  namespace: string;
  onUpdate: (patch: Partial<Instruction>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [showBrowser, setShowBrowser] = useState(false);
  const typeLabel = instrTypeOptions.find((o) => o.value === instr.type)?.label ?? instr.type;
  const typeIcon = instrTypeOptions.find((o) => o.value === instr.type)?.icon;

  const typeBgColor = {
    RUN: 'border-l-blue-400',
    COPY_UPLOAD: 'border-l-orange-400',
    COPY_VOLUME: 'border-l-green-400',
    ENV: 'border-l-purple-400',
  }[instr.type];

  return (
    <div className={`rounded-md border border-border bg-muted-bg/30 p-3 border-l-4 ${typeBgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-primary">{typeIcon}</span>
          <span className="text-xs font-bold text-text-primary">{typeLabel}</span>
          <span className="text-[10px] text-text-muted">#{idx + 1}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" disabled={idx === 0} onClick={() => onMove(-1)}
            className="p-1 rounded hover:bg-white disabled:opacity-30 text-text-secondary"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button type="button" disabled={idx === total - 1} onClick={() => onMove(1)}
            className="p-1 rounded hover:bg-white disabled:opacity-30 text-text-secondary"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-white text-error"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Type-specific fields */}
      {instr.type === 'RUN' && (
        <Input placeholder="예: apt-get update && apt-get install -y git" value={instr.command ?? ''}
          onChange={(e) => onUpdate({ command: e.target.value })} className="text-xs font-mono" />
      )}

      {instr.type === 'COPY_UPLOAD' && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">소스 파일</span>
            <select value={instr.uploadFileName ?? ''}
              onChange={(e) => onUpdate({ uploadFileName: e.target.value })}
              className="h-8 rounded-md border border-border-input bg-white px-2 text-xs outline-none">
              <option value="">파일 선택...</option>
              {uploadedFileNames.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
          <Copy className="h-3.5 w-3.5 text-text-muted mb-2 shrink-0" />
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] text-text-secondary">대상 경로</span>
            <Input placeholder="/workspace/" value={instr.uploadDest ?? ''}
              onChange={(e) => onUpdate({ uploadDest: e.target.value })} className="h-8 text-xs" />
          </div>
        </div>
      )}

      {instr.type === 'COPY_VOLUME' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary">AIPub Volume / 파일 경로</span>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Volume:경로 (예: data-storage:/data/requirements.txt)"
                  value={instr.volumeName && instr.volumePath ? `${instr.volumeName}:${instr.volumePath}` : ''}
                  readOnly
                  className="h-8 text-xs flex-1 bg-muted-bg/30"
                />
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0"
                  onClick={() => setShowBrowser(true)}>
                  찾아보기
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Copy className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary">대상 경로</span>
              <Input placeholder="/workspace/" value={instr.volumeDest ?? ''}
                onChange={(e) => onUpdate({ volumeDest: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <VolumeBrowser
            namespace={namespace}
            open={showBrowser}
            onOpenChange={setShowBrowser}
            onSelect={(volName, filePath) => onUpdate({ volumeName: volName, volumePath: filePath })}
          />
        </div>
      )}

      {instr.type === 'ENV' && (
        <div className="flex gap-2 items-center">
          <Input placeholder="Key" value={instr.envKey ?? ''}
            onChange={(e) => onUpdate({ envKey: e.target.value })} className="flex-1 h-8 text-xs" />
          <span className="text-text-muted text-xs">=</span>
          <Input placeholder="Value" value={instr.envValue ?? ''}
            onChange={(e) => onUpdate({ envValue: e.target.value })} className="flex-1 h-8 text-xs" />
        </div>
      )}
    </div>
  );
}
