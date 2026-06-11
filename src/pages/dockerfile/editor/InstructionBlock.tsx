import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Plus,
  Terminal,
  HardDrive,
  Variable,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VolumeBrowser } from '@/components/VolumeBrowser';
import { instrTypeLabel } from './instr-options';
import type { EnvPair, Instruction, InstructionType } from '@/lib/dockerfile-content';

const typeIcons: Record<InstructionType, React.ReactNode> = {
  RUN: <Terminal className="h-3.5 w-3.5" />,
  COPY_VOLUME: <HardDrive className="h-3.5 w-3.5" />,
  ENV: <Variable className="h-3.5 w-3.5" />,
};

export function InstructionBlock({
  instr,
  idx,
  total,
  namespace,
  duplicateEnvKeys,
  onUpdate,
  onRemove,
  onMove,
}: {
  instr: Instruction;
  idx: number;
  total: number;
  namespace: string;
  duplicateEnvKeys?: Set<string>;
  onUpdate: (patch: Partial<Instruction>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const [showBrowser, setShowBrowser] = useState(false);
  const typeLabel = instrTypeLabel(instr.type, t);
  const typeIcon = typeIcons[instr.type];

  const typeBgColor = {
    RUN: 'border-l-blue-400',
    COPY_VOLUME: 'border-l-green-400',
    ENV: 'border-l-purple-400',
  }[instr.type];

  return (
    <div className={`rounded-md border border-border bg-muted/30 p-3.5 border-l-4 ${typeBgColor}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-primary">{typeIcon}</span>
          <span className="text-sm font-bold text-foreground">{typeLabel}</span>
          <span className="text-xs text-muted-foreground/70">#{idx + 1}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => onMove(-1)}
            className="p-1 rounded hover:bg-card disabled:opacity-30 text-muted-foreground"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={idx === total - 1}
            onClick={() => onMove(1)}
            className="p-1 rounded hover:bg-card disabled:opacity-30 text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-card text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Type-specific fields */}
      {instr.type === 'RUN' && (
        <Input
          placeholder={t('editor.runPlaceholder')}
          value={instr.command ?? ''}
          onChange={(e) => onUpdate({ command: e.target.value })}
          className="text-sm font-mono"
        />
      )}

      {instr.type === 'COPY_VOLUME' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t('editor.copyVolumePath')}</span>
              <div className="flex gap-1.5">
                <Input
                  placeholder={t('editor.copyVolumePlaceholder')}
                  value={
                    instr.volumeName && instr.volumePath
                      ? `${instr.volumeName}:${instr.volumePath}`
                      : ''
                  }
                  readOnly
                  className="h-10 text-sm flex-1 bg-muted/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0"
                  onClick={() => setShowBrowser(true)}
                >
                  {t('editor.copySelectUpload')}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Copy className="h-4 w-4 text-muted-foreground/70 shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t('editor.copyDest')}</span>
              <Input
                placeholder={t('editor.copyDestPlaceholder')}
                value={instr.volumeDest ?? ''}
                onChange={(e) => onUpdate({ volumeDest: e.target.value })}
                className="h-10 text-sm"
              />
            </div>
          </div>
          <VolumeBrowser
            namespace={namespace}
            open={showBrowser}
            onOpenChange={setShowBrowser}
            onSelect={(volName, filePath) =>
              onUpdate({ volumeName: volName, volumePath: filePath })
            }
          />
        </div>
      )}

      {instr.type === 'ENV' && (
        <div className="flex flex-col gap-2">
          {(instr.envPairs ?? []).map((pair, pidx) => {
            const pairs = instr.envPairs ?? [];
            const updatePair = (patch: Partial<EnvPair>) => {
              const next = pairs.map((p, i) => (i === pidx ? { ...p, ...patch } : p));
              onUpdate({ envPairs: next });
            };
            const removePair = () => {
              const next = pairs.filter((_, i) => i !== pidx);
              onUpdate({ envPairs: next });
            };
            const dupKey = !!pair.key.trim() && !!duplicateEnvKeys?.has(pair.key.trim());
            return (
              <div key={pidx} className="flex flex-col gap-1">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder={t('editor.envKey')}
                    value={pair.key}
                    aria-invalid={dupKey}
                    onChange={(e) => updatePair({ key: e.target.value })}
                    className="flex-1 h-10 text-sm font-mono"
                  />
                  <span className="text-muted-foreground/70 text-sm">=</span>
                  <Input
                    placeholder={t('editor.envValue')}
                    value={pair.value}
                    onChange={(e) => updatePair({ value: e.target.value })}
                    className="flex-1 h-10 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={removePair}
                    disabled={pairs.length <= 1}
                    className="p-1.5 rounded hover:bg-card text-destructive disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {dupKey && (
                  <p className="text-xs text-warning pl-0.5">{t('editor.duplicateEnvKey')}</p>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              const next = [...(instr.envPairs ?? []), { key: '', value: '' }];
              onUpdate({ envPairs: next });
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('editor.envAddPair')}
          </Button>
        </div>
      )}
    </div>
  );
}
