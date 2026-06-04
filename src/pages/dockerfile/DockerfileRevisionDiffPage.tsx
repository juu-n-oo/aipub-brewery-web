import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, GitCompareArrows, User } from 'lucide-react';
import {
  useDockerfile,
  useDockerfileRevision,
  useDockerfileRevisions,
} from '@/hooks/useDockerfiles';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useTheme } from '@/hooks/useTheme';

export default function DockerfileRevisionDiffPage() {
  const { id, v1, v2 } = useParams<{ id: string; v1: string; v2: string }>();
  const dockerfileId = id ? Number(id) : undefined;
  const version1 = v1 ? Number(v1) : undefined;
  const version2 = v2 ? Number(v2) : undefined;
  const navigate = useNavigate();
  const { theme } = useTheme();

  const { data: dockerfile } = useDockerfile(dockerfileId);
  const { data: rev1, isLoading: l1 } = useDockerfileRevision(dockerfileId, version1);
  const { data: rev2, isLoading: l2 } = useDockerfileRevision(dockerfileId, version2);
  const { data: allRevisions } = useDockerfileRevisions(dockerfileId);

  const isLoading = l1 || l2;

  const versionOptions = useMemo(
    () => (allRevisions ?? []).map((r) => r.version).sort((a, b) => b - a),
    [allRevisions],
  );

  const baseImageChanged = rev1 && rev2 && rev1.baseImage !== rev2.baseImage;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!rev1 || !rev2) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        리비전을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/dockerfiles/${id}/revisions`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">{dockerfile?.name ?? 'Dockerfile'}</h1>
            {dockerfile?.project && <Badge variant="outline">{dockerfile.project}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">리비전 비교</p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/dockerfiles/${id}/revisions`}>히스토리</Link>
        </Button>
      </div>

      {/* Version selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">이전:</span>
          <Select
            value={String(version1)}
            onValueChange={(val) =>
              navigate(`/dockerfiles/${id}/revisions/${val}/diff/${version2}`)
            }
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versionOptions.map((v) => (
                <SelectItem key={v} value={String(v)} disabled={v === version2}>
                  v{v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-muted-foreground">→</span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">이후:</span>
          <Select
            value={String(version2)}
            onValueChange={(val) =>
              navigate(`/dockerfiles/${id}/revisions/${version1}/diff/${val}`)
            }
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versionOptions.map((v) => (
                <SelectItem key={v} value={String(v)} disabled={v === version1}>
                  v{v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {baseImageChanged && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Base Image 변경됨
          </Badge>
        )}
      </div>

      {/* Revision meta info */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 bg-card border rounded-md px-3 py-2">
          <span className="font-mono font-semibold">v{rev1.version}</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {rev1.createdBy}
          </span>
          <span>{formatDateTime(rev1.createdAt)}</span>
          {rev1.message && (
            <span className="italic truncate max-w-48">{rev1.message}</span>
          )}
        </div>
        <div className="flex items-center gap-4 bg-card border rounded-md px-3 py-2">
          <span className="font-mono font-semibold">v{rev2.version}</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {rev2.createdBy}
          </span>
          <span>{formatDateTime(rev2.createdAt)}</span>
          {rev2.message && (
            <span className="italic truncate max-w-48">{rev2.message}</span>
          )}
        </div>
      </div>

      {/* Diff editor */}
      <div className="border rounded-lg overflow-hidden flex-1" style={{ minHeight: '500px' }}>
        <DiffEditor
          original={rev1.content}
          modified={rev2.content}
          language="dockerfile"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
          }}
          height="500px"
        />
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
