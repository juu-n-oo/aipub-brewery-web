import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Search,
  FileCode2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import { useDockerfilesMulti, useDeleteDockerfile } from '@/hooks/useDockerfiles';
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
import { EmptyState } from '@/components/ui/EmptyState';
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
        df.project.toLowerCase().includes(q) ||
        df.baseImage.toLowerCase().includes(q),
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
          {/* Project Filter */}
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
          <Button asChild>
            <Link to="/dockerfiles/new">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
          <Button variant="outline" disabled={selected.size === 0} onClick={handleBulkDelete}>
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
              className="h-9 w-56 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
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
              <TableRow className="hover:bg-muted">
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Base Image</TableHead>
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
                      onCheckedChange={() => toggleOne(df.id)}
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
                  <TableCell className="text-muted-foreground">{df.project}</TableCell>
                  <TableCell className="text-muted-foreground">{df.username}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground" title={df.baseImage}>
                    {df.baseImage}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCreatedAt(df.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Available
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.name}&quot; Dockerfile을 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
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

function formatCreatedAt(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
