import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Timer,
  Package, Circle,
} from 'lucide-react';
import { useBuild, useBuildLogStream, useBuildLogs } from '@/hooks/useBuilds';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { BuildPhase } from '@/types/build';

const phaseConfig: Record<BuildPhase, {
  label: string;
  variant: 'secondary' | 'default' | 'success' | 'destructive' | 'warning';
  icon: React.ReactNode;
  color: string;
}> = {
  Pending: { label: '대기 중', variant: 'secondary', icon: <Clock className="h-4 w-4" />, color: 'text-text-secondary' },
  Preparing: { label: '준비 중', variant: 'warning', icon: <Package className="h-4 w-4" />, color: 'text-[#FF9500]' },
  Building: { label: '빌드 중', variant: 'default', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-primary' },
  Succeeded: { label: '성공', variant: 'success', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-success' },
  Failed: { label: '실패', variant: 'destructive', icon: <XCircle className="h-4 w-4" />, color: 'text-error' },
};

// 빌드 단계 (GitHub Actions 스타일)
const buildSteps = [
  { key: 'Pending', label: '빌드 대기', desc: '빌드 컨텍스트 구성 중' },
  { key: 'Preparing', label: '빌드 준비', desc: 'Dockerfile 및 빌드 컨텍스트 설정' },
  { key: 'Building', label: '이미지 빌드', desc: '이미지 빌드 실행' },
  { key: 'Push', label: '이미지 Push', desc: 'ImageHub 이미지 push' },
];

function getStepStatus(currentPhase: BuildPhase, stepKey: string): 'done' | 'active' | 'pending' | 'failed' {
  const order = ['Pending', 'Preparing', 'Building', 'Push'];
  const currentIdx = currentPhase === 'Succeeded' ? order.length
    : currentPhase === 'Failed' ? order.indexOf('Building')
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
  const isActive = build?.phase === 'Pending' || build?.phase === 'Preparing' || build?.phase === 'Building';

  // SSE 실시간 로그 (활성 빌드)
  const { lines: streamLines, connected, done: streamDone, text: streamText } = useBuildLogStream(namespace, name, isActive ?? false);
  // 폴링 기반 로그 (완료된 빌드)
  const { data: staticLogs } = useBuildLogs(namespace, name);

  // 우선순위: 라이브 동안 수집된 SSE 라인 → 정적 로그 fetch 결과
  // (완료된 빌드에 바로 진입한 경우 streamText는 비어있고 staticLogs가 채워짐)
  const logText = streamText || staticLogs || '';
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 로그 자동 스크롤
  useEffect(() => {
    if (logContainerRef.current && isActive) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [streamLines.length, isActive]);

  if (isLoading || !build) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-text-secondary">{t('common.loading')}</p></div>;
  }

  const phase = phaseConfig[build.phase];
  const duration = build.startTime && build.completionTime
    ? formatDuration(new Date(build.completionTime).getTime() - new Date(build.startTime).getTime())
    : build.startTime ? '진행 중...' : '-';

  return (
    <div className="mx-auto w-[60%]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/builds?projectId=${build?.namespace ?? ''}`)}
            className="p-1.5 rounded-md hover:bg-muted-bg text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">빌드 상세</h1>
            <p className="text-sm text-text-secondary font-mono mt-1">{build.targetImage}</p>
          </div>
        </div>
        <Badge variant={phase.variant} className="gap-1.5 text-base px-3.5 py-1.5">
          {phase.icon}
          {phase.label}
        </Badge>
      </div>

      <div className="flex gap-6">
        {/* Left: Steps + Info */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Build Steps (GitHub Actions style) */}
          <div className="rounded-lg border border-border bg-white">
            <div className="px-4 py-3.5 border-b border-border">
              <h3 className="text-base font-bold text-text-primary">빌드 단계</h3>
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
                        <div className={`w-0.5 flex-1 min-h-[24px] ${
                          status === 'done' ? 'bg-success' : status === 'failed' ? 'bg-error' : 'bg-border'
                        }`} />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className={`text-base font-medium ${
                        status === 'active' ? 'text-primary' : status === 'done' ? 'text-success' : status === 'failed' ? 'text-error' : 'text-text-muted'
                      }`}>
                        {step.label}
                        {status === 'active' && <Loader2 className="inline h-3.5 w-3.5 ml-1.5 animate-spin" />}
                      </div>
                      <div className="text-xs text-text-muted mt-1">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Build Info */}
          <div className="rounded-lg border border-border bg-white p-4">
            <h3 className="text-base font-bold text-text-primary mb-3">빌드 정보</h3>
            <div className="flex flex-col gap-3">
              <InfoRow label="Project" value={build.namespace} />
              <InfoRow label="Owner" value={build.username} />
              <InfoRow label="생성 시간" value={formatDateTime(build.createdAt)} />
              <InfoRow label="소요 시간">
                <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                  <Timer className="h-3.5 w-3.5 text-text-secondary" />{duration}
                </span>
              </InfoRow>
              {build.imageDigest && (
                <InfoRow label="Digest">
                  <code className="text-xs font-mono bg-muted-bg px-1.5 py-0.5 rounded break-all">
                    {build.imageDigest}
                  </code>
                </InfoRow>
              )}
              {build.message && (
                <InfoRow label="메시지">
                  <span className="text-sm text-error">{build.message}</span>
                </InfoRow>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Log */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-text-primary">{t('build.log')}</h3>
            <div className="flex items-center gap-2">
              {isActive && connected && (
                <span className="inline-flex items-center gap-1.5 text-xs text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Live
                </span>
              )}
              {isActive && !connected && streamDone && (
                <span className="text-xs text-text-muted">스트림 완료</span>
              )}
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="flex-1 bg-[#1e1e1e] rounded-lg overflow-auto min-h-[500px] max-h-[calc(100vh-280px)]"
          >
            <div className="p-4">
              {!logText ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 text-[#666] animate-spin" />
                </div>
              ) : (
                <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {logText.split('\n').map((line, i) => (
                    <LogLine key={i} lineNum={i + 1} text={line} />
                  ))}
                  {isActive && connected && (
                    <span className="inline-block w-2 h-4 bg-[#d4d4d4] animate-pulse ml-0.5" />
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 */}
      <div className="flex justify-end pt-5">
        <Button variant="outline" onClick={() => navigate(`/builds?projectId=${build?.namespace ?? ''}`)}>
          <ArrowLeft className="h-4 w-4" /> 목록으로
        </Button>
      </div>
    </div>
  );
}

/* ── Sub Components ── */

function StepDot({ status }: { status: 'done' | 'active' | 'pending' | 'failed' }) {
  if (status === 'done') return <CheckCircle2 className="h-5 w-5 text-success shrink-0" />;
  if (status === 'failed') return <XCircle className="h-5 w-5 text-error shrink-0" />;
  if (status === 'active') return (
    <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
    </div>
  );
  return <Circle className="h-5 w-5 text-border shrink-0" />;
}

function LogLine({ lineNum, text }: { lineNum: number; text: string }) {
  let color = 'text-[#d4d4d4]';
  if (text.startsWith('[Kaniko]') || text.startsWith('Step ')) color = 'text-[#569cd6]';
  else if (text.includes('ERROR') || text.includes('error') || text.includes('Failed')) color = 'text-[#f44747]';
  else if (text.includes('Successfully') || text.includes('successfully') || text.startsWith('✓')) color = 'text-[#6a9955]';
  else if (text.startsWith(' --->')) color = 'text-[#ce9178]';
  else if (text.startsWith('   ')) color = 'text-[#9cdcfe]';

  return (
    <div className="flex hover:bg-white/5 group">
      <span className="w-10 shrink-0 text-right pr-3 text-[#555] select-none group-hover:text-[#888] tabular-nums">
        {lineNum}
      </span>
      <span className={color}>{text || ' '}</span>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children ?? <span className="text-sm text-text-primary">{value}</span>}</div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  if (mins > 0) return `${mins}m ${remainSecs}s`;
  return `${remainSecs}s`;
}
