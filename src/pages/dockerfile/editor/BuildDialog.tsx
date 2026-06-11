import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, Play } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { BUILD_TIMEOUT_MIN_MINUTES, BUILD_TIMEOUT_MAX_MINUTES } from '@/lib/constants';
import type { VolumeInfo } from '@/types/k8s';

interface BuildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "생성 후 빌드" 모드 (CREATE 흐름)인지. */
  buildAfterCreate: boolean;

  imageHubs: string[];
  selectedImageHub: string;
  onSelectImageHub: (v: string) => void;

  imageName: string;
  onImageNameChange: (v: string) => void;

  tag: string;
  onTagChange: (v: string) => void;

  /** 미리보기용 태그 제외 ref. */
  targetImageRef: string;
  /** 태그 포함 풀 ref (없으면 빈 문자열). */
  targetImageFull: string;
  /** 미리보기 태그(targetTag). */
  targetTag: string;

  timeoutMinutes: number;
  onTimeoutMinutesChange: (v: number) => void;

  /** 빌드 대상이 베이스 이미지와 동일(덮어쓰기 경고)인지. */
  overwritesBase: boolean;
  baseImage: string;

  /** COPY 명령 존재 → 빌드 컨텍스트 Volume 섹션 노출. */
  hasCopyInstruction: boolean;
  volumes: VolumeInfo[];
  buildContextVolume: string;
  onBuildContextVolumeChange: (v: string) => void;
  buildContextSubPath: string;
  onBuildContextSubPathChange: (v: string) => void;
  buildContextMissing: boolean;

  onConfirm: () => void;
  confirmDisabled: boolean;
}

/** 빌드 옵션(타깃 이미지/태그/타임아웃/컨텍스트) 입력 다이얼로그. */
export function BuildDialog(props: BuildDialogProps) {
  const { t } = useTranslation();
  const confirmLabel = props.buildAfterCreate ? t('editor.buildAfterCreate') : t('build.run');

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{confirmLabel}</DialogTitle>
          <DialogDescription>{t('editor.buildDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          {/* ImageHub / ImageName / Tag */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('editor.imageHub')}</Label>
              <div className="relative">
                <select
                  value={props.selectedImageHub}
                  onChange={(e) => props.onSelectImageHub(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-card px-3.5 py-1 text-base appearance-none outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] cursor-pointer"
                >
                  {props.imageHubs.map((hub) => (
                    <option key={hub} value={hub}>
                      {hub}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('editor.imageName')}</Label>
              <Input
                value={props.imageName}
                onChange={(e) => props.onImageNameChange(e.target.value)}
                placeholder={t('editor.imageNamePlaceholder')}
                className="h-11 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('build.tag')}</Label>
              <Input
                value={props.tag}
                onChange={(e) => props.onTagChange(e.target.value)}
                placeholder={t('build.tagPlaceholder')}
                className="h-11 font-mono text-sm"
              />
            </div>
          </div>

          {/* 빌드 대상 이미지 미리보기 */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('build.targetImage')}</Label>
            <div className="rounded-md border border-input bg-muted/40 px-3.5 py-2.5 font-mono text-sm break-all">
              {props.targetImageFull ? (
                <>
                  <span className="text-foreground">{props.targetImageRef}</span>
                  <span className="text-primary font-medium">:{props.targetTag}</span>
                </>
              ) : (
                <span className="text-muted-foreground/70">{t('editor.targetImagePreview')}</span>
              )}
            </div>
          </div>

          {/* 빌드 제한 시간 (분) */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('build.timeout')}</Label>
            <Input
              type="number"
              min={BUILD_TIMEOUT_MIN_MINUTES}
              max={BUILD_TIMEOUT_MAX_MINUTES}
              value={props.timeoutMinutes}
              onChange={(e) => props.onTimeoutMinutesChange(Number(e.target.value))}
              className="h-11 w-32"
            />
            <p className="text-sm text-muted-foreground">{t('build.timeoutHelp')}</p>
          </div>

          {/* 베이스 이미지와 동일 → 덮어쓰기 경고 */}
          {props.overwritesBase && (
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 p-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-sm text-foreground">
                <p className="font-medium">{t('editor.overwriteBaseTitle')}</p>
                <p className="text-muted-foreground mt-0.5">
                  {t('editor.overwriteBaseDescPrefix')}
                  <span className="font-mono text-foreground break-all">{props.baseImage}</span>
                  {t('editor.overwriteBaseDescSuffix')}
                </p>
              </div>
            </div>
          )}

          {/* 빌드 컨텍스트 (COPY 사용 시) */}
          {props.hasCopyInstruction && (
            <>
              <hr className="border-border" />
              <div className="flex flex-col gap-1.5">
                <Label>{t('editor.buildContextVolume')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('editor.buildContextVolumeDescription')}
                </p>
                <div className="relative">
                  <select
                    value={props.buildContextVolume}
                    onChange={(e) => props.onBuildContextVolumeChange(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-card px-3.5 py-1 text-base appearance-none outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] cursor-pointer"
                  >
                    <option value="">{t('editor.buildContextNone')}</option>
                    {props.volumes.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.pvcName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
                </div>
                {props.buildContextMissing && (
                  <p className="text-sm text-destructive">{t('editor.buildContextMissing')}</p>
                )}
              </div>
              {props.buildContextVolume && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('editor.buildContextSubPath')}</Label>
                  <Input
                    value={props.buildContextSubPath}
                    onChange={(e) => props.onBuildContextSubPathChange(e.target.value)}
                    placeholder={t('editor.buildContextSubPathPlaceholder')}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={props.onConfirm} disabled={props.confirmDisabled}>
            <Play className="h-4 w-4" /> {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
