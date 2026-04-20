import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, FileCode2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from 'lucide-react';
import { useDockerfilesMulti, useDeleteDockerfile } from '@/hooks/useDockerfiles';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

export default function DockerfileListPage() {
  const { t } = useTranslation();
  const { projects } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get('projectId') ?? '';
  const projectIds = useMemo(() => projects.map((p) => p.name), [projects]);
  const queryProjectIds = selectedProjectId ? [selectedProjectId] : projectIds;

  const { data: allDockerfiles, isLoading, error } = useDockerfilesMulti(queryProjectIds);
  const deleteMutation = useDeleteDockerfile();

  const [selected, setSelected] = useState<Set<number>>(new Set());
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
        df.project.toLowerCase().includes(q),
    );
  }, [allDockerfiles, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const allSelected = paged.length > 0 && paged.every((df) => selected.has(df.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(paged.map((df) => df.id)));
  };

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        selected.delete(deleteTarget.id);
        setSelected(new Set(selected));
      },
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 1) {
      const id = [...selected][0];
      const df = allDockerfiles.find((d) => d.id === id);
      if (df) setDeleteTarget({ id: df.id, name: df.name });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-error">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[60%]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-text-primary">Dockerfiles</h1>
          {allDockerfiles.length > 0 && (
            <Badge variant="count">{allDockerfiles.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Project Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                if (e.target.value) {
                  setSearchParams({ projectId: e.target.value });
                } else {
                  setSearchParams({});
                }
                setCurrentPage(1);
              }}
              className="h-10 pl-3.5 pr-9 rounded-md border border-border-input bg-white text-base appearance-none outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] transition-all cursor-pointer"
            >
              <option value="">모든 프로젝트</option>
              {projectIds.map((pid) => (
                <option key={pid} value={pid}>{pid}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          </div>
          <Button asChild>
            <Link to="/dockerfiles/new">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={selected.size === 0}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-3 w-56 rounded-md border border-border-input bg-white text-base placeholder:text-text-muted outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {allDockerfiles.length === 0 ? (
        <EmptyState
          icon={<FileCode2 className="h-12 w-12" />}
          title={t('dockerfile.empty')}
          description="Dockerfile을 생성하여 이미지 빌드를 시작하세요."
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
              <TableRow className="hover:bg-table-header-bg">
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Creation Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((df) => (
                <TableRow key={df.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(df.id)}
                      onChange={() => toggleOne(df.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/dockerfiles/${df.id}/edit?projectId=${df.project}`}
                      className="font-medium text-text-link hover:underline"
                    >
                      {df.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">{df.project}</TableCell>
                  <TableCell className="text-text-secondary">{df.username}</TableCell>
                  <TableCell className="text-text-secondary">
                    {formatCreatedAt(df.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      Available
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-base text-text-secondary">
            <span>{selected.size} of {filtered.length} row(s) selected</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-9 rounded-md border border-border-input bg-white px-2 text-base outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <span>{currentPage} of {totalPages} pages</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage <= 1} className="p-1 rounded hover:bg-muted-bg disabled:opacity-30"><ChevronsLeft className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded hover:bg-muted-bg disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-muted-bg disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-muted-bg disabled:opacity-30"><ChevronsRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.name}&quot; Dockerfile을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCreatedAt(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
