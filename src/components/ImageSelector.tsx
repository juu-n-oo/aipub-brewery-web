import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Loader2, Check, RefreshCw } from 'lucide-react';
import catalogIcon from '@/assets/imagecatalog.png';
import { useProject, useRepositories, useImageTags } from '@/hooks/useK8s';
import { useCatalogImages, useCatalogImage } from '@/hooks/useCatalog';
import { HARBOR_URL } from '@/lib/env';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

interface ImageSelectorProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageRef: string) => void;
}

type Tab = 'catalog' | 'imagehub';

export function ImageSelector({ projectId, open, onOpenChange, onSelect }: ImageSelectorProps) {
  const { t } = useTranslation();
  // 기본 탭은 Image Catalog (큐레이션 이미지 우선 노출).
  const [tab, setTab] = useState<Tab>('catalog');

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            {t('imageSelector.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border">
          <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
            <img src={catalogIcon} alt="" className="h-4 w-4 object-contain" />
            {t('imageSelector.catalog')}
          </TabButton>
          <TabButton active={tab === 'imagehub'} onClick={() => setTab('imagehub')}>
            <Image className="h-4 w-4" />
            {t('imageSelector.imageHub')}
          </TabButton>
        </div>

        {tab === 'catalog' ? (
          <CatalogImageSelector onSelect={onSelect} onClose={handleClose} />
        ) : (
          <AIPubImageSelector projectId={projectId} onSelect={onSelect} onClose={handleClose} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Image Catalog Tab ── */

function CatalogImageSelector({
  onSelect,
  onClose,
}: {
  onSelect: (ref: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [selectedName, setSelectedName] = useState('');

  const {
    data: images,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useCatalogImages();
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useCatalogImage(selectedName);

  const imageList = images ?? [];
  const versions = detail?.versions ?? [];

  return (
    <div className="flex border border-border rounded-lg overflow-hidden h-[320px]">
      <Column
        title={t('imageSelector.image')}
        loading={listLoading}
        error={listError}
        errorText={t('imageSelector.catalogError')}
        onRetry={() => refetchList()}
        empty={!listLoading && imageList.length === 0}
        emptyText={t('imageSelector.catalogEmpty')}
      >
        {imageList.map((img) => (
          <li
            key={img.name}
            className={`px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors text-sm ${
              selectedName === img.name
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted text-foreground'
            }`}
            onClick={() => setSelectedName(img.name)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
              {img.logoText}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{img.displayName}</span>
              <span className="text-[10px] text-muted-foreground/70 truncate">
                {img.category} · {t('imageSelector.tagCount', { count: img.tagCount })}
              </span>
            </div>
            {selectedName === img.name && <Check className="h-3.5 w-3.5 shrink-0 ml-auto" />}
          </li>
        ))}
      </Column>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-3 py-2 border-b border-border bg-muted shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {t('imageSelector.tag')}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {!selectedName ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground/70">
              {t('imageSelector.selectImage')}
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          ) : detailError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-muted-foreground/70">
              <span>{t('imageSelector.catalogError')}</span>
              <RetryButton onClick={() => refetchDetail()} />
            </div>
          ) : (
            <>
              {detail?.descriptionHtml && (
                <div
                  className="px-3 py-2.5 border-b border-border text-xs text-muted-foreground bg-muted/40 [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-2 [&_h4]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_p]:my-1"
                  // 카탈로그 설명은 AIPub 가 큐레이션한 신뢰된 읽기 전용 콘텐츠.
                  dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }}
                />
              )}
              {versions.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-xs text-muted-foreground/70">
                  {t('imageSelector.tagEmpty')}
                </div>
              ) : (
                <ul>
                  {versions.map((v) => (
                    <li
                      key={`${v.digest}-${v.tag}`}
                      className="px-3 py-2 flex items-center justify-between hover:bg-primary/5 cursor-pointer transition-colors text-sm"
                      onClick={() => {
                        onSelect(v.pullReference);
                        onClose();
                      }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground font-medium truncate">{v.tag}</span>
                        <span className="text-[10px] text-muted-foreground/70 font-mono truncate">
                          {v.os}/{v.arch} · {v.sizeHuman} · {v.shortDigest}
                        </span>
                      </div>
                      <span className="text-xs text-primary shrink-0 ml-2">
                        {t('imageSelector.select')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
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
  const { t } = useTranslation();
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
          title={t('imageSelector.imageHub')}
          loading={projectLoading}
          empty={imageHubs.length === 0}
          emptyText={t('imageSelector.imageHubEmpty')}
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
          title={t('imageSelector.repository')}
          loading={repoLoading && !!selectedHub}
          empty={!!selectedHub && !repoLoading && repos.length === 0}
          emptyText={t('imageSelector.repositoryEmpty')}
          placeholder={!selectedHub}
          placeholderText={t('imageSelector.selectImageHub')}
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
          title={t('imageSelector.tag')}
          loading={tagLoading && !!selectedRepo}
          empty={!!selectedRepo && !tagLoading && allTags.length === 0}
          emptyText={t('imageSelector.tagEmpty')}
          placeholder={!selectedRepo}
          placeholderText={t('imageSelector.selectRepository')}
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
              <span className="text-xs text-primary shrink-0 ml-2">
                {t('imageSelector.select')}
              </span>
            </li>
          ))}
        </Column>
      </div>
    </>
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
      className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
  error,
  errorText,
  onRetry,
  empty,
  emptyText,
  placeholder,
  placeholderText,
  isLast,
  children,
}: {
  title: string;
  loading?: boolean;
  error?: boolean;
  errorText?: string;
  onRetry?: () => void;
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
        ) : error ? (
          // 장애 시 빈 상태("없음")와 구분해 에러 + 재시도를 노출한다.
          <li className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-muted-foreground/70">
            <span>{errorText}</span>
            {onRetry && <RetryButton onClick={onRetry} />}
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

function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <RefreshCw className="h-3 w-3" />
      {t('common.retry')}
    </button>
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
