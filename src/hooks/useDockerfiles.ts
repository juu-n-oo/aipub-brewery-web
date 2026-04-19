import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerfileApi } from '@/api/dockerfile';
import type { Dockerfile, DockerfileCreateRequest, DockerfileUpdateRequest } from '@/types/dockerfile';

const QUERY_KEY = 'dockerfiles';

export function useDockerfiles(project: string) {
  return useQuery({
    queryKey: [QUERY_KEY, { project }],
    queryFn: () => dockerfileApi.list(project),
    enabled: !!project,
  });
}

export function useDockerfilesMulti(projectIds: string[]) {
  const results = useQueries({
    queries: projectIds.map((pid) => ({
      queryKey: [QUERY_KEY, { project: pid }],
      queryFn: () => dockerfileApi.list(pid),
      enabled: !!pid,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;
  const data: Dockerfile[] = [];
  for (const r of results) {
    if (r.data) data.push(...r.data);
  }

  return { data, isLoading, error };
}

export function useDockerfile(id: number | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => dockerfileApi.get(id!),
    enabled: id !== undefined,
  });
}

export function useCreateDockerfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DockerfileCreateRequest) => dockerfileApi.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, { project: variables.project }] });
    },
  });
}

export function useUpdateDockerfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DockerfileUpdateRequest }) =>
      dockerfileApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteDockerfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dockerfileApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
