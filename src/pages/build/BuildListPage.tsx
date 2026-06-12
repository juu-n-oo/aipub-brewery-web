import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Hammer } from 'lucide-react';
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
import { useTableSelection } from '@/hooks/useTableSelection';
import { Pagination } from '@/components/ui/Pagination';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime, shortenImageRef } from '@/lib/format';
import { phaseMeta } from '@/lib/build-phase';
import type { ImageBuild } from '@/types/build';

const ALL_PROJECTS = '__all__';

const buildKey = (b: ImageBuild) => `${b.namespace}/${b.name}`;

export default function BuildListPage() {
  const { t } = useTranslation();
  const { projects } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get('projectId') ?? '';
  const projectIds = useMemo(() => projects.map((p) => p.name), [projects]);
  const queryProjectIds = selectedProjectId ? [selectedProjectId] : projectIds;

  const { data: allBuilds, isLoading, error } = useBuildsMulti(queryProjectIds);

  const selection = useTableSelection<ImageBuild>(buildKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

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
  const allSelected = selection.allSelected(paged);

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
              <SelectValue placeholder={t('common.allProjects')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS}>{t('common.allProjects')}</SelectItem>
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
          title={t('build.empty')}
          description={t('build.emptyDescription')}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => selection.toggleAll(paged)}
                  />
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
                <SortableHead label="Status" sortKey="phase" sort={sort} onSort={toggle} />
                <SortableHead label="Project" sortKey="namespace" sort={sort} onSort={toggle} />
                <SortableHead label="Owner" sortKey="username" sort={sort} onSort={toggle} />
                <SortableHead
                  label="Creation Time"
                  sortKey="createdAt"
                  sort={sort}
                  onSort={toggle}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((build, idx) => {
                const meta = phaseMeta[build.phase];
                const key = buildKey(build);
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Checkbox
                        checked={selection.isSelected(build)}
                        onCheckedChange={() => selection.toggleOne(build)}
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
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 ${meta.color}`}>
                        <span
                          className={`h-2 w-2 rounded-full ${meta.dotClass} ${
                            build.phase === 'Building' || build.phase === 'Preparing'
                              ? 'animate-pulse'
                              : ''
                          }`}
                        />
                        {t(meta.labelKey)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{build.namespace}</TableCell>
                    <TableCell className="text-muted-foreground">{build.username}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(build.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination
            selectedCount={selection.size}
            totalCount={filtered.length}
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
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
          <span className="block truncate">{shortenImageRef(image)}</span>
        </TooltipTrigger>
        <TooltipContent>{image}</TooltipContent>
      </Tooltip>
    </TableCell>
  );
}
