import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  GitCommitHorizontal,
  History,
  RotateCcw,
  Eye,
  GitCompareArrows,
  User,
} from 'lucide-react';
import { useDockerfile, useDockerfileRevisions, useRollbackRevision } from '@/hooks/useDockerfiles';
import { formatDateTime, shortenImageRef } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { toast } from 'sonner';

export default function DockerfileRevisionListPage() {
  const { id } = useParams<{ id: string }>();
  const dockerfileId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: dockerfile, isLoading: dLoading } = useDockerfile(dockerfileId);
  const { data: revisions, isLoading: rLoading } = useDockerfileRevisions(dockerfileId);
  const rollbackMutation = useRollbackRevision();

  const [rollbackTarget, setRollbackTarget] = useState<{ version: number } | null>(null);

  const isLoading = dLoading || rLoading;

  const handleRollback = () => {
    if (!rollbackTarget || !dockerfileId) return;
    rollbackMutation.mutate(
      { dockerfileId, version: rollbackTarget.version },
      {
        onSuccess: () => {
          toast.success(`v${rollbackTarget.version}으로 복원되었습니다. (새 리비전 생성됨)`);
          setRollbackTarget(null);
        },
        onError: () => toast.error('롤백에 실패했습니다.'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!dockerfile || !revisions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Dockerfile을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/dockerfiles/${id}/edit`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">{dockerfile.name}</h1>
            <Badge variant="outline">{dockerfile.project}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            리비전 히스토리 — 총 {revisions.length}개 버전
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/dockerfiles/${id}/edit`}>편집</Link>
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

        <div className="flex flex-col gap-0">
          {revisions.map((rev, idx) => {
            const isLatest = idx === 0;
            const prevVersion = idx < revisions.length - 1 ? revisions[idx + 1].version : null;

            return (
              <div key={rev.id} className="relative flex gap-4 py-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 mt-1">
                  <div
                    className={`h-[10px] w-[10px] rounded-full border-2 ${
                      isLatest
                        ? 'bg-primary border-primary'
                        : 'bg-background border-muted-foreground/40'
                    }`}
                    style={{ marginLeft: '14px' }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 bg-card border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold text-sm">v{rev.version}</span>
                        {isLatest && (
                          <Badge variant="default" className="text-xs">
                            latest
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">
                        {rev.message || (
                          <span className="text-muted-foreground italic">메시지 없음</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {rev.createdBy}
                        </span>
                        <span>{formatDateTime(rev.createdAt)}</span>
                        {rev.baseImage && (
                          <span className="font-mono text-xs">
                            FROM {shortenImageRef(rev.baseImage)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          navigate(
                            `/dockerfiles/${id}/revisions/${rev.version}/diff/${revisions[0].version}`,
                          )
                        }
                        title="최신 버전과 비교"
                        disabled={isLatest}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        보기
                      </Button>
                      {prevVersion !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            navigate(
                              `/dockerfiles/${id}/revisions/${prevVersion}/diff/${rev.version}`,
                            )
                          }
                          title="이전 버전과 비교"
                        >
                          <GitCompareArrows className="h-3 w-3 mr-1" />
                          Diff
                        </Button>
                      )}
                      {!isLatest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                          onClick={() => setRollbackTarget({ version: rev.version })}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          복원
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rollback confirmation dialog */}
      <Dialog open={!!rollbackTarget} onOpenChange={() => setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리비전 복원</DialogTitle>
            <DialogDescription>
              v{rollbackTarget?.version}의 내용으로 새 리비전을 생성합니다. 기존 이력은 보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>
              취소
            </Button>
            <Button onClick={handleRollback} disabled={rollbackMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-1" />
              복원
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
