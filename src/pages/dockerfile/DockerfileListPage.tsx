import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, FileCode2 } from 'lucide-react';
import { useDockerfileList, useDeleteDockerfile } from '@/hooks/useDockerfiles';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/Button';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { formatDateTime, shortenImageRef } from '@/lib/format';
import type { Dockerfile } from '@/types/dockerfile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

const ALL_PROJECTS = '__all__';

export default function DockerfileListPage() {
  const { t } = useTranslation();
  const { isAdmin, projects } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get('projectId') ?? '';
  const projectIds = useMemo(() => projects.map((p) => p.name), [projects]);
  // 멤버: 선택된 프로젝트 또는 바인딩된 전체 프로젝트(삭제된 프로젝트는 useAuth 에 포함되지 않음)
  const queryProjectIds = selectedProjectId ? [selectedProjectId] : projectIds;

  // 관리자 전용: 서버사이드 username(소유자) 필터
  const [ownerFilter, setOwnerFilter] = useState('');

  const { data, isLoading, error } = useDockerfileList({
    isAdmin,
    projects: queryProjectIds,
    owner: isAdmin ? ownerFilter.trim() || undefined : undefined,
  });
  const allDockerfiles = useMemo<Dockerfile[]>(() => data ?? [], [data]);
  const deleteMutation = useDeleteDockerfile();

  const selection = useTableSelection<Dockerfile, number>((df) => df.id);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery) return allDockerfiles;
    const q = searchQuery.toLowerCase();
    return allDockerfiles.filter(
      (df) =>
        df.name.toLowerCase().includes(q) ||
        df.username.toLowerCase().includes(q) ||
        df.project.toLowerCase().includes(q) ||
        df.baseImage.toLowerCase().includes(q),
    );
  }, [allDockerfiles, searchQuery]);

  const sortAccessors = useMemo(
    () => ({
      name: (d: Dockerfile) => d.name,
      project: (d: Dockerfile) => d.project,
      username: (d: Dockerfile) => d.username,
      baseImage: (d: Dockerfile) => d.baseImage,
      createdAt: (d: Dockerfile) => new Date(d.createdAt).getTime(),
      version: (d: Dockerfile) => d.latestVersion ?? 0,
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

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        selection.deselect(deleteTarget.id);
        setDeleteTarget(null);
      },
    });
  };

  const handleBulkDelete = () => {
    if (selection.size === 1) {
      const id = [...selection.selected][0];
      const df = allDockerfiles.find((d) => d.id === id);
      if (df) setDeleteTarget({ id: df.id, name: df.name });
    }
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
      {/* Page Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-foreground">Dockerfiles</h1>
          {allDockerfiles.length > 0 && <Badge variant="count">{allDockerfiles.length}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            /* Admin: 소유자(username) 서버사이드 필터 */
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('dockerfile.ownerFilter')}
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-48 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          ) : (
            /* Member: Project Filter (바인딩된 프로젝트) */
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
          )}
          <Button asChild>
            <Link to="/dockerfiles/new">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
          <Button variant="outline" disabled={selection.size === 0} onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
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

      {/* Content */}
      {allDockerfiles.length === 0 ? (
        <EmptyState
          icon={<FileCode2 className="h-12 w-12" />}
          title={t('dockerfile.empty')}
          description={t('dockerfile.emptyDescription')}
          action={
            <Button asChild>
              <Link to="/dockerfiles/new">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </Button>
          }
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
                <SortableHead label="Name" sortKey="name" sort={sort} onSort={toggle} />
                <SortableHead label="Base Image" sortKey="baseImage" sort={sort} onSort={toggle} />
                <SortableHead
                  label="Version"
                  sortKey="version"
                  sort={sort}
                  onSort={toggle}
                  className="text-center"
                />
                <SortableHead label="Project" sortKey="project" sort={sort} onSort={toggle} />
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
              {paged.map((df) => (
                <TableRow key={df.id}>
                  <TableCell>
                    <Checkbox
                      checked={selection.isSelected(df)}
                      onCheckedChange={() => selection.toggleOne(df)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/dockerfiles/${df.id}/edit?projectId=${df.project}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {df.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[240px] text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate">{shortenImageRef(df.baseImage)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{df.baseImage}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-center">
                    {df.latestVersion != null ? (
                      <Link
                        to={`/dockerfiles/${df.id}/revisions`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        v{df.latestVersion}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{df.project}</TableCell>
                  <TableCell className="text-muted-foreground">{df.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(df.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
            <DialogDescription>
              {t('dockerfile.deleteConfirm', { name: deleteTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteMutation.isPending}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
