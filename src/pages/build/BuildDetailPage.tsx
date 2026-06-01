import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  Package,
  Circle,
} from 'lucide-react';
import { useBuild, useBuildLogStream, useBuildLogs } from '@/hooks/useBuilds';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { BuildPhase } from '@/types/build';

const phaseConfig: Record<
  BuildPhase,
  { label: string; variant: NonNullable<BadgeProps['variant']>; icon: React.ReactNode }
> = {
  Pending: { label: '대기 중', variant: 'secondary', icon: <Clock className="h-4 w-4" /> },
  Preparing: { label: '준비 중', variant: 'warning', icon: <Package className="h-4 w-4" /> },
  Building: {
    label: '빌드 중',
    variant: 'primary',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  Succeeded: { label: '성공', variant: 'success', icon: <CheckCircle2 className="h-4 w-4" /> },
  Failed: { label: '실패', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
};

// 빌드 단계 (GitHub Actions 스타일)
const buildSteps = [
  { key: 'Pending', label: '빌드 대기', desc: '빌드 컨텍스트 구성 중' },
  { key: 'Preparing', label: '빌드 준비', desc: 'Dockerfile 및 빌드 컨텍스트 설정' },
  { key: 'Building', label: '이미지 빌드', desc: '이미지 빌드 실행' },
  { key: 'Push', label: '이미지 Push', desc: 'ImageHub 이미지 push' },
];

function getStepStatus(
  currentPhase: BuildPhase,
  stepKey: string,
): 'done' | 'active' | 'pending' | 'failed' {
  const order = ['Pending', 'Preparing', 'Building', 'Push'];
  const currentIdx =
    currentPhase === 'Succeeded'
      ? order.length
      : currentPhase === 'Failed'
        ? order.indexOf('Building')
        : order.indexOf(currentPhase);
  const stepIdx = order.indexOf(stepKey);

  if (currentPhase === 'Failed' && stepIdx === currentIdx) return 'failed';
  if (currentPhase === 'Succeeded') return 'done';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export default function BuildDetailPage() {
  const { t } = useTranslation();
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>();
  const navigate = useNavigate();

  const { data: build, isLoading } = useBuild(namespace, name);
  const isActive =
    build?.phase === 'Pending' || build?.phase === 'Preparing' || build?.phase === 'Building';

  const {
    lines: streamLines,
    connected,
    done: streamDone,
    text: streamText,
  } = useBuildLogStream(namespace, name, isActive ?? false);
  const { data: staticLogs } = useBuildLogs(namespace, name);

  const logText = streamText || staticLogs || '';
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current && isActive) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [streamLines.length, isActive]);

  if (isLoading || !build) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const phase = phaseConfig[build.phase];
  const duration =
    build.startTime && build.completionTime
      ? formatDuration(
          new Date(build.completionTime).getTime() - new Date(build.startTime).getTime(),
        )
      : build.startTime
        ? '진행 중...'
        : '-';

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/builds?projectId=${build?.namespace ?? ''}`)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">빌드 상세</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{build.targetImage}</p>
          </div>
        </div>
        <Badge variant={phase.variant} className="gap-1.5 px-3.5 py-1.5 text-sm">
          {phase.icon}
          {phase.label}
        </Badge>
      </div>

      <div className="flex gap-6">
        {/* Left: Steps + Info */}
        <div className="flex w-72 shrink-0 flex-col gap-4">
          {/* Build Steps (GitHub Actions style) */}
          <Card className="gap-0 py-0">
            <div className="border-b px-4 py-3.5">
              <h3 className="text-base font-bold text-foreground">빌드 단계</h3>
            </div>
            <div className="p-3">
              {buildSteps.map((step, idx) => {
                const status = getStepStatus(build.phase, step.key);
                return (
                  <div key={step.key} className="flex gap-3">
                    {/* Vertical line + dot */}
                    <div className="flex flex-col items-center">
                      <StepDot status={status} />
                      {idx < buildSteps.length - 1 && (
                        <div
                          className={`min-h-[24px] w-0.5 flex-1 ${
                            status === 'done'
                              ? 'bg-green-500'
                              : status === 'failed'
                                ? 'bg-destructive'
                                : 'bg-border'
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <div
                        className={`text-base font-medium ${
                          status === 'active'
                            ? 'text-primary'
                            : status === 'done'
                              ? 'text-green-600'
                              : status === 'failed'
                                ? 'text-destructive'
                                : 'text-muted-foreground/70'
                        }`}
                      >
                        {step.label}
                        {status === 'active' && (
                          <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin" />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/70">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Build Info */}
          <Card className="gap-0 p-4">
            <h3 className="mb-3 text-base font-bold text-foreground">빌드 정보</h3>
            <div className="flex flex-col gap-3">
              <InfoRow label="Project" value={build.namespace} />
              <InfoRow label="Owner" value={build.username} />
              <InfoRow label="생성 시간" value={formatDateTime(build.createdAt)} />
              <InfoRow label="소요 시간">
                <span className="inline-flex items-center gap-1 text-sm text-foreground">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  {duration}
                </span>
              </InfoRow>
              {build.imageDigest && (
                <InfoRow label="Digest">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">
                    {build.imageDigest}
                  </code>
                </InfoRow>
              )}
              {build.message && (
                <InfoRow label="메시지">
                  <span className="text-sm text-destructive">{build.message}</span>
                </InfoRow>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Live Log */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">{t('build.log')}</h3>
            <div className="flex items-center gap-2">
              {isActive && connected && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Live
                </span>
              )}
              {isActive && !connected && streamDone && (
                <span className="text-xs text-muted-foreground/70">스트림 완료</span>
              )}
            </div>
          </div>
          {/* 로그 뷰어: 터미널이므로 다크 고정 */}
          <div
            ref={logContainerRef}
            className="min-h-[500px] max-h-[calc(100vh-280px)] flex-1 overflow-auto rounded-lg border bg-[#1e1e1e]"
          >
            <div className="p-4">
              {!logText ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-[#666]" />
                </div>
              ) : (
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {logText.split('\n').map((line, i) => (
                    <LogLine key={i} lineNum={i + 1} text={line} />
                  ))}
                  {isActive && connected && (
                    <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[#d4d4d4]" />
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 */}
      <div className="flex justify-end pt-5">
        <Button
          variant="outline"
          onClick={() => navigate(`/builds?projectId=${build?.namespace ?? ''}`)}
        >
          <ArrowLeft className="h-4 w-4" /> 목록으로
        </Button>
      </div>
    </div>
  );
}

/* ── Sub Components ── */

function StepDot({ status }: { status: 'done' | 'active' | 'pending' | 'failed' }) {
  if (status === 'done') return <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />;
  if (status === 'failed') return <XCircle className="h-5 w-5 shrink-0 text-destructive" />;
  if (status === 'active')
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      </div>
    );
  return <Circle className="h-5 w-5 shrink-0 text-border" />;
}

function LogLine({ lineNum, text }: { lineNum: number; text: string }) {
  let color = 'text-[#d4d4d4]';
  if (text.startsWith('[Kaniko]') || text.startsWith('Step ')) color = 'text-[#569cd6]';
  else if (text.includes('ERROR') || text.includes('error') || text.includes('Failed'))
    color = 'text-[#f44747]';
  else if (text.includes('Successfully') || text.includes('successfully') || text.startsWith('✓'))
    color = 'text-[#6a9955]';
  else if (text.startsWith(' --->')) color = 'text-[#ce9178]';
  else if (text.startsWith('   ')) color = 'text-[#9cdcfe]';

  return (
    <div className="group flex hover:bg-white/5">
      <span className="w-10 shrink-0 select-none pr-3 text-right tabular-nums text-[#555] group-hover:text-[#888]">
        {lineNum}
      </span>
      <span className={color}>{text || ' '}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <div className="mt-1">
        {children ?? <span className="text-sm text-foreground">{value}</span>}
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  if (mins > 0) return `${mins}m ${remainSecs}s`;
  return `${remainSecs}s`;
}
