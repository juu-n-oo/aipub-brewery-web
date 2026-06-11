import { useTranslation } from 'react-i18next';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

const DEFAULT_ROWS_OPTIONS = [10, 25, 50, 100];

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

interface PaginationProps {
  /** 선택된 행 수 (좌측 "N of M selected" 표기용). */
  selectedCount: number;
  /** 필터링된 전체 행 수. */
  totalCount: number;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowsOptions?: number[];
}

/**
 * 테이블 하단 페이지네이션 바 (rows-per-page Select + "of N pages" + 4 이동 버튼).
 * (이전에는 BuildListPage / DockerfileListPage 에 동일 JSX + PageBtn 이 중복돼 있었다.)
 */
export function Pagination({
  selectedCount,
  totalCount,
  currentPage,
  totalPages,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsOptions = DEFAULT_ROWS_OPTIONS,
}: PaginationProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      <span>{t('common.rowsSelected', { selected: selectedCount, total: totalCount })}</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>{t('common.rowsPerPage')}</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => onRowsPerPageChange(Number(v))}>
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rowsOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span>{t('common.pageOf', { current: currentPage, total: totalPages })}</span>
        <div className="flex items-center gap-1">
          <PageBtn onClick={() => onPageChange(1)} disabled={currentPage <= 1}>
            <ChevronsLeft className="h-4 w-4" />
          </PageBtn>
          <PageBtn
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </PageBtn>
          <PageBtn
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </PageBtn>
          <PageBtn onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </PageBtn>
        </div>
      </div>
    </div>
  );
}
