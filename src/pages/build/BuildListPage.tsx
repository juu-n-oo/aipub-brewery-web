import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Hammer, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from 'lucide-react';
import { useBuildsMulti } from '@/hooks/useBuilds';
import { useAuth } from '@/hooks/useAuthContext';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BuildPhase, ImageBuild } from '@/types/build';

const phaseConfig: Record<BuildPhase, { label: string; color: string; dotClass: string }> = {
  Pending: { label: '대기 중', color: 'text-text-secondary', dotClass: 'bg-text-muted' },
  Preparing: { label: '준비 중', color: 'text-[#FF9500]', dotClass: 'bg-[#FF9500]' },
  Building: { label: '빌드 중', color: 'text-primary', dotClass: 'bg-primary' },
  Succeeded: { label: '성공', color: 'text-success', dotClass: 'bg-success' },
  Failed: { label: '실패', color: 'text-error', dotClass: 'bg-error' },
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
        b.targetImage.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.phase.toLowerCase().includes(q),
    );
  }, [allBuilds, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allSelected = paged.length > 0 && paged.every((b) => selected.has(buildKey(b)));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(paged.map((b) => buildKey(b))));
  };
  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-text-secondary">{t('common.loading')}</p></div>;
  }
  if (error) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-error">{t('common.error')}</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-text-primary">{t('build.title')}</h1>
          {allBuilds.length > 0 && <Badge variant="count">{allBuilds.length}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selectedProjectId}
              onChange={(e) => { e.target.value ? setSearchParams({ projectId: e.target.value }) : setSearchParams({}); setCurrentPage(1); }}
              className="h-9 pl-3 pr-8 rounded-md border border-border-input bg-white text-sm appearance-none outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] cursor-pointer">
              <option value="">모든 프로젝트</option>
              {projectIds.map((pid) => <option key={pid} value={pid}>{pid}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input type="text" placeholder={t('common.search')} value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-9 pl-9 pr-3 w-48 rounded-md border border-border-input bg-white text-sm placeholder:text-text-muted outline-none focus:border-border-focus focus:ring-primary/50 focus:ring-[3px] transition-all" />
          </div>
        </div>
      </div>

      {allBuilds.length === 0 ? (
        <EmptyState icon={<Hammer className="h-12 w-12" />} title="빌드 기록이 없습니다" description="Dockerfile 편집기에서 빌드를 실행하세요." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-table-header-bg">
                <TableHead className="w-12"><Checkbox checked={allSelected} onChange={toggleAll} /></TableHead>
                <TableHead className="w-16">No</TableHead>
                <TableHead>Target Image</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((build, idx) => {
                const phase = phaseConfig[build.phase];
                const key = buildKey(build);
                return (
                  <TableRow key={key}>
                    <TableCell><Checkbox checked={selected.has(key)} onChange={() => toggleOne(key)} /></TableCell>
                    <TableCell className="text-text-secondary">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                    <TableCell>
                      <Link to={`/builds/${build.namespace}/${build.name}`} className="font-medium text-text-link hover:underline">
                        {build.targetImage}
                      </Link>
                    </TableCell>
                    <TableCell className="text-text-secondary">{build.namespace}</TableCell>
                    <TableCell className="text-text-secondary">{build.username}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 ${phase.color}`}>
                        <span className={`h-2 w-2 rounded-full ${phase.dotClass} ${build.phase === 'Building' || build.phase === 'Preparing' ? 'animate-pulse' : ''}`} />
                        {phase.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary">{formatAge(build.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-3 text-sm text-text-secondary">
            <span>{selected.size} of {filtered.length} row(s) selected</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-8 rounded-md border border-border-input bg-white px-2 text-sm outline-none">
                  <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
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
    </div>
  );
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
