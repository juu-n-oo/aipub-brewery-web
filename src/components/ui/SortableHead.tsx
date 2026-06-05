import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { TableHead } from './Table';
import type { SortState } from '@/hooks/useTableSort';

interface SortableHeadProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
}

/** 클릭하면 정렬되는 테이블 헤더. 활성 컬럼은 방향 화살표, 비활성은 흐린 양방향 아이콘을 보여준다. */
export function SortableHead<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: SortableHeadProps<K>) {
  const active = sort.key === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex select-none items-center gap-1 transition-colors hover:text-foreground"
      >
        {label}
        {active ? (
          sort.dir === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
