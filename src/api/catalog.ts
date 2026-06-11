import { catalogClient } from '@/lib/api-client';
import type { CatalogImage } from '@/types/catalog';

/** Image Catalog API (`/image-catalog/api`). 전역 읽기 전용 큐레이션 base 이미지. */
export const catalogApi = {
  listImages: () => catalogClient.get<CatalogImage[]>('/images'),
  getImage: (name: string) =>
    catalogClient.get<CatalogImage>(`/images/${encodeURIComponent(name)}`),
};
