import { useState } from 'react';
import { Image, Loader2, Check, Search } from 'lucide-react';
import { useProject, useRepositories, useImageTags, useNgcSearch, useNgcTags, useHuggingfaceSearch, useHuggingfaceTags } from '@/hooks/useK8s';
import type { RegistryImage } from '@/types/k8s';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';

const HARBOR_URL = import.meta.env.VITE_HARBOR_URL || 'aipub-harbor.cluster7.idc1.ten1010.io';

interface ImageSelectorProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageRef: string) => void;
}

type RegistryTab = 'aipub' | 'ngc' | 'huggingface';

export function ImageSelector({ projectId, open, onOpenChange, onSelect }: ImageSelectorProps) {
  const [tab, setTab] = useState<RegistryTab>('aipub');

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
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
          <TabButton active={tab === 'ngc'} onClick={() => setTab('ngc')}>
            <span className="inline-flex items-center gap-1.5">
              <NvidiaIcon /> NGC Catalog
            </span>
          </TabButton>
          <TabButton active={tab === 'huggingface'} onClick={() => setTab('huggingface')}>
            <span className="inline-flex items-center gap-1.5">
              <HuggingFaceIcon /> Hugging Face
            </span>
          </TabButton>
        </div>

        {tab === 'aipub' && (
          <AIPubImageSelector projectId={projectId} onSelect={onSelect} onClose={handleClose} />
        )}
        {tab === 'ngc' && (
          <ExternalRegistrySelector registry="ngc" onSelect={onSelect} onClose={handleClose} />
        )}
        {tab === 'huggingface' && (
          <ExternalRegistrySelector registry="huggingface" onSelect={onSelect} onClose={handleClose} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── AIPub ImageHub Tab ── */

function AIPubImageSelector({ projectId, onSelect, onClose }: { projectId: string; onSelect: (ref: string) => void; onClose: () => void }) {
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: repoReview, isLoading: repoLoading } = useRepositories(selectedHub);
  const { data: tagReview, isLoading: tagLoading } = useImageTags(selectedHub, selectedRepo);

  const imageHubs = project?.spec.binding.imageHubs ?? [];
  const repos = repoReview?.status.repositories ?? [];
  const allTags = (tagReview?.status.artifacts ?? []).flatMap((a) => a.tags.map((tag) => ({ tag, digest: a.digest })));

  const preview = selectedHub
    ? selectedRepo ? `${HARBOR_URL}/${selectedHub}/${selectedRepo}:<tag>` : `${HARBOR_URL}/${selectedHub}/...`
    : '';

  return (
    <>
      {preview && (
        <div className="text-xs text-text-secondary bg-muted-bg rounded-md px-3 py-2 font-mono truncate">{preview}</div>
      )}
      <div className="flex border border-border rounded-lg overflow-hidden h-[320px]">
        <Column title="ImageHub" loading={projectLoading} empty={imageHubs.length === 0} emptyText="ImageHub 없음">
          {imageHubs.map((hub) => (
            <ColumnItem key={hub} label={hub} selected={selectedHub === hub}
              onClick={() => { setSelectedHub(hub); setSelectedRepo(''); }} />
          ))}
        </Column>
        <Column title="Repository" loading={repoLoading && !!selectedHub}
          empty={!!selectedHub && !repoLoading && repos.length === 0} emptyText="리포지토리 없음"
          placeholder={!selectedHub} placeholderText="ImageHub를 선택하세요">
          {repos.map((r) => (
            <ColumnItem key={r.name} label={r.name} selected={selectedRepo === r.name}
              onClick={() => setSelectedRepo(r.name)} />
          ))}
        </Column>
        <Column title="Tag" loading={tagLoading && !!selectedRepo}
          empty={!!selectedRepo && !tagLoading && allTags.length === 0} emptyText="태그 없음"
          placeholder={!selectedRepo} placeholderText="Repository를 선택하세요" isLast>
          {allTags.map(({ tag, digest }) => (
            <li key={`${digest}-${tag}`}
              className="px-3 py-2 flex items-center justify-between hover:bg-primary/5 cursor-pointer transition-colors text-sm"
              onClick={() => { onSelect(`${HARBOR_URL}/${selectedHub}/${selectedRepo}:${tag}`); onClose(); }}>
              <div className="flex flex-col min-w-0">
                <span className="text-text-primary font-medium truncate">{tag}</span>
                <span className="text-[10px] text-text-muted font-mono truncate">{digest.slice(0, 24)}...</span>
              </div>
              <span className="text-xs text-primary shrink-0 ml-2">선택</span>
            </li>
          ))}
        </Column>
      </div>
    </>
  );
}

/* ── External Registry Tab (NGC / HuggingFace) ── */

function ExternalRegistrySelector({ registry, onSelect, onClose }: { registry: 'ngc' | 'huggingface'; onSelect: (ref: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<RegistryImage | null>(null);

  // 검색
  const ngcSearch = useNgcSearch(registry === 'ngc' ? searchTerm : '');
  const hfSearch = useHuggingfaceSearch(registry === 'huggingface' ? searchTerm : '');
  const searchResult = registry === 'ngc' ? ngcSearch : hfSearch;
  const images = searchResult.data?.images ?? [];
  const isSearching = searchResult.isLoading;

  // 태그 조회 — NGC는 org/repo 분리 필요
  const ngcOrg = registry === 'ngc' && selectedImage ? selectedImage.name.split('/')[0] ?? '' : '';
  const ngcRepo = registry === 'ngc' && selectedImage ? selectedImage.name.split('/').slice(1).join('/') ?? '' : '';
  const hfRepo = registry === 'huggingface' && selectedImage ? selectedImage.name : '';

  const ngcTags = useNgcTags(ngcOrg, ngcRepo);
  const hfTags = useHuggingfaceTags(hfRepo);
  const tagsResult = registry === 'ngc' ? ngcTags : hfTags;
  const tags = tagsResult.data?.tags ?? [];
  const isLoadingTags = tagsResult.isLoading;

  const handleSearch = () => {
    if (query.trim()) {
      setSearchTerm(query.trim());
      setSelectedImage(null);
    }
  };

  const registryLabel = registry === 'ngc' ? 'NGC Catalog' : 'Hugging Face';

  return (
    <>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder={`${registryLabel}에서 이미지 검색 (예: pytorch, tensorflow)`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={!query.trim()}>검색</Button>
      </div>

      {/* Results */}
      <div className="flex border border-border rounded-lg overflow-hidden h-[320px]">
        {/* Left: Image List */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="px-3 py-2 border-b border-border bg-table-header-bg shrink-0">
            <span className="text-xs font-medium text-text-secondary">이미지</span>
          </div>
          <ul className="flex-1 overflow-auto">
            {!searchTerm ? (
              <li className="flex items-center justify-center py-10 text-xs text-text-muted">
                검색어를 입력하세요
              </li>
            ) : isSearching ? (
              <li className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </li>
            ) : images.length === 0 ? (
              <li className="flex items-center justify-center py-10 text-xs text-text-muted">
                검색 결과가 없습니다
              </li>
            ) : (
              images.map((img) => (
                <li
                  key={img.name}
                  onClick={() => setSelectedImage(img)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedImage?.name === img.name ? 'bg-primary/10' : 'hover:bg-muted-bg'
                  }`}
                >
                  <div className="text-sm font-medium text-text-primary truncate">{img.name}</div>
                  <div className="text-[10px] text-text-muted truncate mt-0.5">{img.description}</div>
                  <div className="text-[10px] text-text-secondary font-mono mt-0.5">{img.fullPath}</div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right: Tags */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-border bg-table-header-bg shrink-0">
            <span className="text-xs font-medium text-text-secondary">Tag</span>
          </div>
          <ul className="flex-1 overflow-auto">
            {!selectedImage ? (
              <li className="flex items-center justify-center py-10 text-xs text-text-muted">
                이미지를 선택하세요
              </li>
            ) : isLoadingTags ? (
              <li className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </li>
            ) : tags.length === 0 ? (
              <li className="flex items-center justify-center py-10 text-xs text-text-muted">
                태그가 없습니다
              </li>
            ) : (
              tags.map((tag) => (
                <li
                  key={tag}
                  className="px-3 py-2.5 flex items-center justify-between hover:bg-primary/5 cursor-pointer transition-colors text-sm"
                  onClick={() => { onSelect(`${selectedImage.fullPath}:${tag}`); onClose(); }}
                >
                  <span className="text-text-primary font-medium">{tag}</span>
                  <span className="text-xs text-primary">선택</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

/* ── Shared Components ── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        active ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function Column({ title, loading, empty, emptyText, placeholder, placeholderText, isLast, children }: {
  title: string; loading?: boolean; empty?: boolean; emptyText?: string;
  placeholder?: boolean; placeholderText?: string; isLast?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`flex-1 flex flex-col min-w-0 ${isLast ? '' : 'border-r border-border'}`}>
      <div className="px-3 py-2 border-b border-border bg-table-header-bg shrink-0">
        <span className="text-xs font-medium text-text-secondary">{title}</span>
      </div>
      <ul className="flex-1 overflow-auto">
        {loading ? <li className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 text-primary animate-spin" /></li>
          : placeholder ? <li className="flex items-center justify-center py-10 text-xs text-text-muted">{placeholderText}</li>
          : empty ? <li className="flex items-center justify-center py-10 text-xs text-text-muted">{emptyText}</li>
          : children}
      </ul>
    </div>
  );
}

function ColumnItem({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <li className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-sm ${
      selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted-bg text-text-primary'
    }`} onClick={onClick}>
      <span className="truncate">{label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </li>
  );
}

function NvidiaIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.593 3.374 6.593 3.374s-2.896 3.9-5.987 3.9c-.376 0-.724-.05-1.03-.144v-4.944l3.04-.464c.003 0-1.08-1.469-3.04-1.269v-.005zM8.948 5.478v1.89c-.16.006-.32.017-.48.036-4.86.6-7.418 5.2-7.418 5.2s3.234 4.616 7.418 4.616c.165 0 .325-.01.48-.025v1.83c-.16.013-.323.02-.49.02-5.073 0-8.458-4.82-8.458-4.82s4.01-6.11 8.948-6.748v.001zm0 8.25v.742c-.156.02-.316.03-.48.03-2.07 0-3.856-2.16-3.856-2.16s1.554-1.928 3.52-2.136c.274-.028.548-.02.816.02v2.81l-.003.005.003-.006v-.305z" />
    </svg>
  );
}

function HuggingFaceIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2.5 8.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm2 3.5c-.5 1.5-2 3-4.5 3s-4-1.5-4.5-3c0 0 1.5 1 4.5 1s4.5-1 4.5-1z" />
    </svg>
  );
}
