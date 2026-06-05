import { useState } from 'react';
import { Image, Loader2, Check } from 'lucide-react';
import { useProject, useRepositories, useImageTags } from '@/hooks/useK8s';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

const HARBOR_URL = import.meta.env.VITE_HARBOR_URL;

interface ImageSelectorProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageRef: string) => void;
}

type RegistryTab = 'aipub' | 'catalog';

export function ImageSelector({ projectId, open, onOpenChange, onSelect }: ImageSelectorProps) {
  const [tab, setTab] = useState<RegistryTab>('aipub');

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Base Image 선택
          </DialogTitle>
        </DialogHeader>

        {/* Registry Tabs */}
        <div className="flex border-b border-border">
          <TabButton active={tab === 'aipub'} onClick={() => setTab('aipub')}>
            AIPub ImageHub
          </TabButton>
          <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
            Image Catalog
          </TabButton>
        </div>

        {tab === 'aipub' && (
          <AIPubImageSelector projectId={projectId} onSelect={onSelect} onClose={handleClose} />
        )}
        {tab === 'catalog' && <ImageCatalogSelector />}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── AIPub ImageHub Tab ── */

function AIPubImageSelector({
  projectId,
  onSelect,
  onClose,
}: {
  projectId: string;
  onSelect: (ref: string) => void;
  onClose: () => void;
}) {
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: repoReview, isLoading: repoLoading } = useRepositories(selectedHub);
  const { data: tagReview, isLoading: tagLoading } = useImageTags(selectedHub, selectedRepo);

  const imageHubs = project?.spec.binding.imageHubs ?? [];
  const repos = repoReview?.status.repositories ?? [];
  const allTags = (tagReview?.status.artifacts ?? []).flatMap((a) =>
    a.tags.map((tag) => ({ tag, digest: a.digest })),
  );

  const preview = selectedHub
    ? selectedRepo
      ? `${HARBOR_URL}/${selectedHub}/${selectedRepo}:<tag>`
      : `${HARBOR_URL}/${selectedHub}/...`
    : '';

  return (
    <>
      {preview && (
        <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 font-mono truncate">
          {preview}
        </div>
      )}
      <div className="flex border border-border rounded-lg overflow-hidden h-[320px]">
        <Column
          title="ImageHub"
          loading={projectLoading}
          empty={imageHubs.length === 0}
          emptyText="ImageHub 없음"
        >
          {imageHubs.map((hub) => (
            <ColumnItem
              key={hub}
              label={hub}
              selected={selectedHub === hub}
              onClick={() => {
                setSelectedHub(hub);
                setSelectedRepo('');
              }}
            />
          ))}
        </Column>
        <Column
          title="Repository"
          loading={repoLoading && !!selectedHub}
          empty={!!selectedHub && !repoLoading && repos.length === 0}
          emptyText="리포지토리 없음"
          placeholder={!selectedHub}
          placeholderText="ImageHub를 선택하세요"
        >
          {repos.map((r) => (
            <ColumnItem
              key={r.name}
              label={r.name}
              selected={selectedRepo === r.name}
              onClick={() => setSelectedRepo(r.name)}
            />
          ))}
        </Column>
        <Column
          title="Tag"
          loading={tagLoading && !!selectedRepo}
          empty={!!selectedRepo && !tagLoading && allTags.length === 0}
          emptyText="태그 없음"
          placeholder={!selectedRepo}
          placeholderText="Repository를 선택하세요"
          isLast
        >
          {allTags.map(({ tag, digest }) => (
            <li
              key={`${digest}-${tag}`}
              className="px-3 py-2 flex items-center justify-between hover:bg-primary/5 cursor-pointer transition-colors text-sm"
              onClick={() => {
                onSelect(`${HARBOR_URL}/${selectedHub}/${selectedRepo}:${tag}`);
                onClose();
              }}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-foreground font-medium truncate">{tag}</span>
                <span className="text-[10px] text-muted-foreground/70 font-mono truncate">
                  {digest.slice(0, 24)}...
                </span>
              </div>
              <span className="text-xs text-primary shrink-0 ml-2">선택</span>
            </li>
          ))}
        </Column>
      </div>
    </>
  );
}

/* ── Image Catalog Tab ── */

// AIPub 이 제공 예정인 이미지 카탈로그(Harbor 전용 프로젝트 기반, 읽기 전용 큐레이션 이미지).
// 카탈로그 서비스 연동 전까지는 안내 placeholder 를 노출한다.
function ImageCatalogSelector() {
  return (
    <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 text-center">
      <Image className="h-8 w-8 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-foreground">Image Catalog 준비 중</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          AIPub이 제공하는 검증된 base 이미지 카탈로그입니다. 카탈로그 이미지는 수정·삭제가 불가능한
          읽기 전용으로 제공됩니다. (출시 예정)
        </p>
      </div>
    </div>
  );
}

/* ── Shared Components ── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Column({
  title,
  loading,
  empty,
  emptyText,
  placeholder,
  placeholderText,
  isLast,
  children,
}: {
  title: string;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  placeholder?: boolean;
  placeholderText?: string;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex-1 flex flex-col min-w-0 ${isLast ? '' : 'border-r border-border'}`}>
      <div className="px-3 py-2 border-b border-border bg-muted shrink-0">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <ul className="flex-1 overflow-auto">
        {loading ? (
          <li className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </li>
        ) : placeholder ? (
          <li className="flex items-center justify-center py-10 text-xs text-muted-foreground/70">
            {placeholderText}
          </li>
        ) : empty ? (
          <li className="flex items-center justify-center py-10 text-xs text-muted-foreground/70">
            {emptyText}
          </li>
        ) : (
          children
        )}
      </ul>
    </div>
  );
}

function ColumnItem({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <li
      className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-sm ${
        selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
      }`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </li>
  );
}
