import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApi } from '@/api/build';
import type { ImageBuild, ImageBuildRequest } from '@/types/build';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const QUERY_KEY = 'builds';

export function useBuilds(project: string) {
  return useQuery({
    queryKey: [QUERY_KEY, { project }],
    queryFn: () => buildApi.list(project),
    enabled: !!project,
  });
}

export function useBuildsMulti(projectIds: string[]) {
  const results = useQueries({
    queries: projectIds.map((pid) => ({
      queryKey: [QUERY_KEY, { project: pid }],
      queryFn: () => buildApi.list(pid),
      enabled: !!pid,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;
  const data: ImageBuild[] = [];
  for (const r of results) {
    if (r.data) data.push(...r.data);
  }
  // 최신 빌드가 먼저
  data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { data, isLoading, error };
}

export function useBuild(namespace: string, name: string) {
  return useQuery({
    queryKey: [QUERY_KEY, namespace, name],
    queryFn: () => buildApi.get(namespace, name),
    enabled: !!namespace && !!name,
    refetchInterval: (query) => {
      const phase = query.state.data?.phase;
      if (phase === 'Pending' || phase === 'Preparing' || phase === 'Building') return 3000;
      return false;
    },
  });
}

export function useBuildLogs(namespace: string, name: string) {
  return useQuery({
    queryKey: [QUERY_KEY, namespace, name, 'logs'],
    queryFn: () => buildApi.getLogs(namespace, name),
    enabled: !!namespace && !!name,
    refetchInterval: 5000,
  });
}

/** SSE 기반 실시간 빌드 로그 스트리밍 */
export function useBuildLogStream(namespace: string, name: string, enabled: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!namespace || !name || !enabled) return;

    const es = new EventSource(`${API_BASE_URL}/api/v1/builds/${namespace}/${name}/logs/stream`);
    esRef.current = es;
    setConnected(true);
    setDone(false);

    // 기본 message 이벤트
    es.onmessage = (event) => {
      const data = event.data;
      if (data === '[DONE]') {
        setDone(true);
        es.close();
        setConnected(false);
        return;
      }
      setLines((prev) => [...prev, data]);
    };

    // 'done' named event
    es.addEventListener('done', () => {
      setDone(true);
      es.close();
      setConnected(false);
    });

    es.onerror = () => {
      es.close();
      setConnected(false);
    };
  }, [namespace, name, enabled]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  const reset = useCallback(() => {
    setLines([]);
    setDone(false);
  }, []);

  return { lines, connected, done, reset, text: lines.join('\n') };
}

export function useRunBuild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImageBuildRequest) => buildApi.run(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
