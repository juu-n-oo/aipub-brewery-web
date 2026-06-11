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
