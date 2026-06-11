import { useCallback, useMemo, useState } from 'react';

/**
 * 테이블 행 다중 선택 로직 (Set 기반).
 * (이전에는 toggleAll/toggleOne/buildKey 가 BuildListPage / DockerfileListPage 에 거의 동일하게 중복됐다.)
 *
 * @param getKey 행 → 안정적 선택 키
 */
export function useTableSelection<T, K = string>(getKey: (item: T) => K) {
  const [selected, setSelected] = useState<Set<K>>(new Set());

  const isSelected = useCallback((item: T) => selected.has(getKey(item)), [selected, getKey]);

  const toggleOne = useCallback(
    (item: T) => {
      const key = getKey(item);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [getKey],
  );

  /** 주어진 페이지(행 목록)가 모두 선택돼 있는지. */
  const allSelected = useCallback(
    (items: T[]) => items.length > 0 && items.every((i) => selected.has(getKey(i))),
    [selected, getKey],
  );

  /** 페이지의 전체 선택/해제 토글. 이미 전부 선택돼 있으면 해제한다. */
  const toggleAll = useCallback(
    (items: T[]) => {
      setSelected((prev) => {
        const everySelected = items.length > 0 && items.every((i) => prev.has(getKey(i)));
        return everySelected ? new Set() : new Set(items.map(getKey));
      });
    },
    [getKey],
  );

  const deselect = useCallback((key: K) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return useMemo(
    () => ({
      selected,
      size: selected.size,
      isSelected,
      toggleOne,
      toggleAll,
      allSelected,
      deselect,
      clear,
    }),
    [selected, isSelected, toggleOne, toggleAll, allSelected, deselect, clear],
  );
}
