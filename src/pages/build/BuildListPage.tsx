import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Hammer,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import { useBuildsMulti } from '@/hooks/useBuilds';
import { useAuth } from '@/hooks/useAuthContext';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { SortableHead } from '@/components/ui/SortableHead';
import { useTableSort } from '@/hooks/useTableSort';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BuildPhase, ImageBuild } from '@/types/build';

const ALL_PROJECTS = '__all__';

const phaseConfig: Record<BuildPhase, { label: string; color: string; dotClass: string }> = {
  Pending: { label: '대기 중', color: 'text-muted-foreground', dotClass: 'bg-muted-foreground' },
  Preparing: { label: '준비 중', color: 'text-[#FF9500]', dotClass: 'bg-[#FF9500]' },
  Building: { label: '빌드 중', color: 'text-primary', dotClass: 'bg-primary' },
  Succeeded: { label: '성공', color: 'text-green-600', dotClass: 'bg-green-500' },
  Failed: { label: '실패', color: 'text-destructive', dotClass: 'bg-destructive' },
};

export default function BuildListPage() {
  const { t } = useTranslation();
  const { projects } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get('projectId') ?? '';
  const projectIds = useMemo(() => projects.map((p) => p.name), [projects]);
  const queryProjectIds = selectedProjectId ? [selectedProjectId] : projectIds;

  const { data: allBuilds, isLoading, error } = useBuildsMulti(queryProjectIds);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const buildKey = (b: ImageBuild) => `${b.namespace}/${b.name}`;

  const filtered = useMemo(() => {
    if (!searchQuery) return allBuilds;
    const q = searchQuery.toLowerCase();
    return allBuilds.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.targetImage.toLowerCase().includes(q) ||
        (b.baseImage?.toLowerCase().includes(q) ?? false) ||
        b.username.toLowerCase().includes(q) ||
        b.phase.toLowerCase().includes(q),
    );
  }, [allBuilds, searchQuery]);

  const sortAccessors = useMemo(
    () => ({
      name: (b: ImageBuild) => b.name,
      baseImage: (b: ImageBuild) => b.baseImage,
      targetImage: (b: ImageBuild) => b.targetImage,
      namespace: (b: ImageBuild) => b.namespace,
      username: (b: ImageBuild) => b.username,
      phase: (b: ImageBuild) => b.phase,
      createdAt: (b: ImageBuild) => new Date(b.createdAt).getTime(),
    }),
    [],
  );
  const { sorted, sort, toggle } = useTableSort(filtered, sortAccessors, {
    key: 'createdAt',
    dir: 'desc',
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paged = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allSelected = paged.length > 0 && paged.every((b) => selected.has(buildKey(b)));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(paged.map((b) => buildKey(b))));
  };
  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-destructive">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-foreground">{t('build.title')}</h1>
          {allBuilds.length > 0 && <Badge variant="count">{allBuilds.length}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId || ALL_PROJECTS}
            onValueChange={(v) => {
              if (v && v !== ALL_PROJECTS) setSearchParams({ projectId: v });
              else setSearchParams({});
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="모든 프로젝트" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS}>모든 프로젝트</SelectItem>
              {projectIds.map((pid) => (
                <SelectItem key={pid} value={pid}>
                  {pid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-56 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
        </div>
      </div>

      {allBuilds.length === 0 ? (
        <EmptyState
          icon={<Hammer className="h-12 w-12" />}
          title="빌드 기록이 없습니다"
          description="Dockerfile 편집기에서 빌드를 실행하세요."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted">
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-16">No</TableHead>
                <SortableHead label="Name" sortKey="name" sort={sort} onSort={toggle} />
                <SortableHead label="Base Image" sortKey="baseImage" sort={sort} onSort={toggle} />
                <SortableHead
                  label="Target Image"
                  sortKey="targetImage"
                  sort={sort}
                  onSort={toggle}
                />
                <SortableHead label="Project" sortKey="namespace" sort={sort} onSort={toggle} />
                <SortableHead label="Owner" sortKey="username" sort={sort} onSort={toggle} />
                <SortableHead label="Status" sortKey="phase" sort={sort} onSort={toggle} />
                <SortableHead label="Age" sortKey="createdAt" sort={sort} onSort={toggle} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((build, idx) => {
                const phase = phaseConfig[build.phase];
                const key = buildKey(build);
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => toggleOne(key)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <Link
                        to={`/builds/${build.namespace}/${build.name}`}
                        className="block truncate font-medium text-primary hover:underline"
                      >
                        {build.name}
                      </Link>
                    </TableCell>
                    <ImageCell image={build.baseImage} />
                    <ImageCell image={build.targetImage} />
                    <TableCell className="text-muted-foreground">{build.namespace}</TableCell>
                    <TableCell className="text-muted-foreground">{build.username}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 ${phase.color}`}>
                        <span
                          className={`h-2 w-2 rounded-full ${phase.dotClass} ${
                            build.phase === 'Building' || build.phase === 'Preparing'
                              ? 'animate-pulse'
                              : ''
                          }`}
                        />
                        {phase.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAge(build.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {selected.size} of {filtered.length} row(s) selected
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(v) => {
                    setRowsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span>
                {currentPage} of {totalPages} pages
              </span>
              <div className="flex items-center gap-1">
                <PageBtn onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </PageBtn>
                <PageBtn
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PageBtn>
                <PageBtn
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </PageBtn>
                <PageBtn
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </PageBtn>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded p-1 transition-colors hover:bg-muted disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** registry/project/image:tag → project/image:tag 축약 + hover 시 풀 경로 툴팁 */
function ImageCell({ image }: { image?: string }) {
  if (!image) {
    return <TableCell className="text-muted-foreground/50">-</TableCell>;
  }
  return (
    <TableCell className="max-w-[240px] text-muted-foreground">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block truncate">{shortenImageName(image)}</span>
        </TooltipTrigger>
        <TooltipContent>{image}</TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

function shortenImageName(fullImage: string): string {
  // "registry.host/project/image:tag" → "project/image:tag"
  const parts = fullImage.split('/');
  if (parts.length >= 3) {
    return parts.slice(-2).join('/');
  }
  return fullImage;
}

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${mins}m`;
}
