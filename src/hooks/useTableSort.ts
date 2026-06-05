import { useCallback, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

type Accessor<T> = (item: T) => string | number | null | undefined;

/**
 * 테이블 컬럼 정렬 상태 + 정렬된 목록을 관리하는 훅.
 * - 헤더 클릭 시 같은 컬럼이면 asc↔desc 토글, 다른 컬럼이면 asc 로 시작.
 * - null/undefined 값은 방향과 무관하게 항상 마지막으로 보낸다.
 * - 문자열은 localeCompare(numeric) 로 자연 정렬한다.
 *
 * 정렬 키 K 는 accessors 객체의 키에서만 추론한다 (initial.key 의 리터럴로
 * 좁혀지지 않도록). accessors 는 컴포넌트에서 useMemo 로 안정화해 전달할 것.
 */
export function useTableSort<T, A extends Record<string, Accessor<T>>>(
  items: T[],
  accessors: A,
  initial: SortState<Extract<keyof A, string>>,
) {
  type K = Extract<keyof A, string>;
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = useCallback((key: K) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  }, []);

  const sorted = useMemo(() => {
    const accessor = accessors[sort.key];
    if (!accessor) return items;
    const arr = [...items];
    arr.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [items, sort, accessors]);

  return { sorted, sort, toggle };
}
