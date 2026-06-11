import { Clock, Package, Loader2, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import type { BadgeProps } from '@/components/ui/Badge';
import type { BuildPhase } from '@/types/build';

/**
 * 빌드 phase 의 단일 진실원본 (순서 + 표시 메타).
 * (이전에는 BuildDetailPage / BuildListPage 가 phaseConfig 를 서로 다른 형태로 각자 정의하고,
 *  한국어 라벨을 양쪽에 하드코딩했다.)
 *
 * 라벨은 i18n 키(`build.phase.*`)로 관리하므로, 표시 시점에 `t(phaseMeta[phase].labelKey)` 로 얻는다.
 */

/** 빌드 진행 순서(상태머신). 정렬/스텝 계산에 사용. */
export const BUILD_PHASES: BuildPhase[] = [
  'Pending',
  'Preparing',
  'Building',
  'Succeeded',
  'Failed',
];

/** 활성(진행 중) phase — 폴링/스트리밍 활성화 판단에 사용. */
export const ACTIVE_PHASES: BuildPhase[] = ['Pending', 'Preparing', 'Building'];

export function isActivePhase(phase: BuildPhase | undefined): boolean {
  return phase !== undefined && ACTIVE_PHASES.includes(phase);
}

export interface PhaseMeta {
  /** i18n 라벨 키 (`build.phase.<Phase>`). */
  labelKey: string;
  /** Badge variant (BuildDetailPage 배지). */
  variant: NonNullable<BadgeProps['variant']>;
  /** lucide 아이콘 컴포넌트 (사이즈/애니메이션은 호출부에서 className 으로). */
  icon: LucideIcon;
  /** 아이콘에 회전 애니메이션을 적용할지 (Building). */
  spin?: boolean;
  /** 텍스트 색상 클래스 (BuildListPage 점/텍스트). */
  color: string;
  /** 점(dot) 배경색 클래스 (BuildListPage). */
  dotClass: string;
}

export const phaseMeta: Record<BuildPhase, PhaseMeta> = {
  Pending: {
    labelKey: 'build.phase.Pending',
    variant: 'secondary',
    icon: Clock,
    color: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
  Preparing: {
    labelKey: 'build.phase.Preparing',
    variant: 'warning',
    icon: Package,
    color: 'text-[#FF9500]',
    dotClass: 'bg-[#FF9500]',
  },
  Building: {
    labelKey: 'build.phase.Building',
    variant: 'primary',
    icon: Loader2,
    spin: true,
    color: 'text-primary',
    dotClass: 'bg-primary',
  },
  Succeeded: {
    labelKey: 'build.phase.Succeeded',
    variant: 'success',
    icon: CheckCircle2,
    color: 'text-green-600',
    dotClass: 'bg-green-500',
  },
  Failed: {
    labelKey: 'build.phase.Failed',
    variant: 'destructive',
    icon: XCircle,
    color: 'text-destructive',
    dotClass: 'bg-destructive',
  },
};

/**
 * 빌드 상세 스텝(GitHub Actions 스타일) 순서. phase 와는 별개의 표시용 단계로,
 * Push 는 별도 phase 가 아니라 Building 성공 직후의 개념적 단계다.
 */
export const BUILD_STEP_KEYS = ['Pending', 'Preparing', 'Building', 'Push'] as const;
export type BuildStepKey = (typeof BUILD_STEP_KEYS)[number];

/** 스텝 메타(라벨/설명 i18n 키). */
export const buildSteps: { key: BuildStepKey; labelKey: string; descKey: string }[] = [
  { key: 'Pending', labelKey: 'build.step.pending.label', descKey: 'build.step.pending.desc' },
  {
    key: 'Preparing',
    labelKey: 'build.step.preparing.label',
    descKey: 'build.step.preparing.desc',
  },
  { key: 'Building', labelKey: 'build.step.building.label', descKey: 'build.step.building.desc' },
  { key: 'Push', labelKey: 'build.step.push.label', descKey: 'build.step.push.desc' },
];

export type StepStatus = 'done' | 'active' | 'pending' | 'failed';

/** 현재 phase 기준 특정 스텝의 상태를 계산한다. */
export function getStepStatus(currentPhase: BuildPhase, stepKey: BuildStepKey): StepStatus {
  const order: readonly string[] = BUILD_STEP_KEYS;
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
