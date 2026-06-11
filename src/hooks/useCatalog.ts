import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { catalogKeys } from '@/lib/query-keys';
import { DEFAULT_STALE_MS } from '@/lib/constants';

/** Image Catalog 이미지 목록(전역). */
export function useCatalogImages(enabled = true) {
  return useQuery({
    queryKey: catalogKeys.list(),
    queryFn: () => catalogApi.listImages(),
    enabled,
    staleTime: DEFAULT_STALE_MS,
  });
}

/** 선택된 카탈로그 이미지 상세(versions 포함). */
export function useCatalogImage(name: string) {
  return useQuery({
    queryKey: catalogKeys.detail(name),
    queryFn: () => catalogApi.getImage(name),
    enabled: !!name,
    staleTime: DEFAULT_STALE_MS,
  });
}
