import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerfileApi } from '@/api/dockerfile';
import type { DockerfileCreateRequest, DockerfileUpdateRequest } from '@/types/dockerfile';

const QUERY_KEY = 'dockerfiles';
const REVISION_KEY = 'dockerfile-revisions';

/**
 * Dockerfile 목록 조회. 권한에 따라 보낼 파라미터를 분기하되, 실제 관리자 여부는 백엔드가 토큰 roles 로 판별한다.
 * - 관리자(isAdmin): 전체 조회. owner 로 username 필터링 가능. 백엔드가 최신순 정렬.
 * - 멤버: 바인딩된 프로젝트 목록을 전달하면 백엔드가 본인 소유로 제한해 반환한다.
 */
export function useDockerfileList(params: {
  isAdmin: boolean;
  projects: string[];
  owner?: string;
}) {
  const { isAdmin, projects, owner } = params;
  return useQuery({
    queryKey: isAdmin
      ? [QUERY_KEY, 'all', { owner: owner ?? '' }]
      : [QUERY_KEY, 'projects', { projects }],
    queryFn: () => (isAdmin ? dockerfileApi.listAll(owner) : dockerfileApi.list(projects)),
    enabled: isAdmin || projects.length > 0,
  });
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
      queryClient.invalidateQueries({ queryKey: [REVISION_KEY, variables.id] });
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

/* ── Revision hooks ── */

export function useDockerfileRevisions(dockerfileId: number | undefined) {
  return useQuery({
    queryKey: [REVISION_KEY, dockerfileId],
    queryFn: () => dockerfileApi.listRevisions(dockerfileId!),
    enabled: dockerfileId !== undefined,
  });
}

export function useDockerfileRevision(dockerfileId: number | undefined, version: number | undefined) {
  return useQuery({
    queryKey: [REVISION_KEY, dockerfileId, version],
    queryFn: () => dockerfileApi.getRevision(dockerfileId!, version!),
    enabled: dockerfileId !== undefined && version !== undefined,
  });
}

export function useRollbackRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dockerfileId, version }: { dockerfileId: number; version: number }) =>
      dockerfileApi.rollback(dockerfileId, version),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.dockerfileId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [REVISION_KEY, variables.dockerfileId] });
    },
  });
}
