import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api/k8s';
import { DEFAULT_STALE_MS } from '@/lib/constants';

export function useProject(name: string) {
  return useQuery({
    queryKey: ['k8s', 'project', name],
    queryFn: () => k8sApi.getProject(name),
    enabled: !!name,
    staleTime: DEFAULT_STALE_MS,
  });
}

export function useAipubUser(username: string) {
  return useQuery({
    queryKey: ['k8s', 'aipubUser', username],
    queryFn: () => k8sApi.getAipubUser(username),
    enabled: !!username,
    staleTime: DEFAULT_STALE_MS,
  });
}

export function useImageHubs() {
  return useQuery({
    queryKey: ['imageHubs'],
    queryFn: () => k8sApi.listImageHubs(),
    staleTime: DEFAULT_STALE_MS,
  });
}

/**
 * 로그인 유저가 base 이미지로 쓸 수 있는 ImageHub 목록.
 * AipubUser CR(`status.allBoundImageHubs`)과 aipub backend ImageHub 목록을 합집합으로 노출한다.
 * 두 소스 중 하나만 성공해도 그 결과를 보여주며(장애 허용), 둘 다 실패할 때만 에러로 본다.
 */
export function useAvailableImageHubs(username: string) {
  const userQuery = useAipubUser(username);
  const hubsQuery = useImageHubs();

  const imageHubs = useMemo(() => {
    const set = new Set<string>();
    (userQuery.data?.status?.allBoundImageHubs ?? []).forEach((h) => set.add(h));
    (hubsQuery.data ?? []).forEach((i) => {
      if (i.name) set.add(i.name);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [userQuery.data, hubsQuery.data]);

  return {
    imageHubs,
    isLoading: (userQuery.isLoading || hubsQuery.isLoading) && imageHubs.length === 0,
    isError: userQuery.isError && hubsQuery.isError,
    refetch: () => {
      void userQuery.refetch();
      void hubsQuery.refetch();
    },
  };
}

export function useVolumes(namespace: string) {
  return useQuery({
    queryKey: ['volumes', namespace],
    queryFn: () => k8sApi.getVolumes(namespace),
    enabled: !!namespace,
    staleTime: DEFAULT_STALE_MS,
  });
}

export function useVolumeFiles(namespace: string, volumeName: string, path: string) {
  return useQuery({
    queryKey: ['volumes', namespace, volumeName, 'browse', path],
    queryFn: () => k8sApi.getVolumeFiles(namespace, volumeName, path),
    enabled: !!namespace && !!volumeName,
  });
}

export function useRepositories(imgHub: string) {
  return useQuery({
    queryKey: ['k8s', 'imageReview', imgHub],
    queryFn: () => k8sApi.getRepositories(imgHub),
    enabled: !!imgHub,
  });
}

export function useImageTags(imgHub: string, repo: string) {
  return useQuery({
    queryKey: ['k8s', 'imageReview', imgHub, repo],
    queryFn: () => k8sApi.getImageTags(imgHub, repo),
    enabled: !!imgHub && !!repo,
  });
}
