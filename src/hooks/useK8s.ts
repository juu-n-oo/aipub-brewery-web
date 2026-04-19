import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api/k8s';

export function useProject(name: string) {
  return useQuery({
    queryKey: ['k8s', 'project', name],
    queryFn: () => k8sApi.getProject(name),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVolumes(namespace: string) {
  return useQuery({
    queryKey: ['volumes', namespace],
    queryFn: () => k8sApi.getVolumes(namespace),
    enabled: !!namespace,
    staleTime: 5 * 60 * 1000,
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

export function useNgcSearch(query: string) {
  return useQuery({
    queryKey: ['registry', 'ngc', 'search', query],
    queryFn: () => k8sApi.searchNgcImages(query),
    enabled: !!query,
  });
}

export function useNgcTags(org: string, repository: string) {
  return useQuery({
    queryKey: ['registry', 'ngc', 'tags', org, repository],
    queryFn: () => k8sApi.getNgcTags(org, repository),
    enabled: !!org && !!repository,
  });
}

export function useHuggingfaceSearch(query: string) {
  return useQuery({
    queryKey: ['registry', 'huggingface', 'search', query],
    queryFn: () => k8sApi.searchHuggingfaceImages(query),
    enabled: !!query,
  });
}

export function useHuggingfaceTags(repository: string) {
  return useQuery({
    queryKey: ['registry', 'huggingface', 'tags', repository],
    queryFn: () => k8sApi.getHuggingfaceTags(repository),
    enabled: !!repository,
  });
}
