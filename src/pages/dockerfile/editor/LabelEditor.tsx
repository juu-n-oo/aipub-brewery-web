import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  MANAGED_LABEL_KEYS,
  type ImageLabelFields,
  type StandardMetaKey,
} from '@/lib/dockerfile-content';
import { STANDARD_META } from './standard-meta';

interface LabelEditorProps {
  labels: ImageLabelFields;
  username: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<ImageLabelFields>) => void;
}

/** 이미지 메타데이터(OCI LABEL) 편집 섹션. Dockerfile content 의 LABEL 로 round-trip 된다. */
export function LabelEditor({
  labels,
  username,
  expanded,
  onToggleExpand,
  onChange,
}: LabelEditorProps) {
  const { t } = useTranslation();

  const updateStandard = (k: StandardMetaKey, v: string) => onChange({ [k]: v });
  const addCustom = () => onChange({ custom: [...labels.custom, { key: '', value: '' }] });

  return (
    <section>
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-2 text-lg font-bold text-foreground mb-4 hover:text-primary transition-colors"
      >
        {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        {t('editor.section.metadata')}
      </button>

      {expanded && (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
          {/* 표준 메타데이터 필드 — 좌우 2열 배치 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {STANDARD_META.map((m) => (
              <div key={m.key} className="flex flex-col gap-1.5">
                <Label>{t(m.labelKey)}</Label>
                <Input
                  value={labels[m.key]}
                  onChange={(e) => updateStandard(m.key, e.target.value)}
                  placeholder={
                    m.key === 'authors' ? username || t(m.placeholderKey) : t(m.placeholderKey)
                  }
                  className="h-10 text-sm"
                />
              </div>
            ))}
          </div>

          {/* 커스텀 라벨 */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Label>{t('editor.customLabel')}</Label>
            {labels.custom.map((pair, idx) => {
              const k = pair.key.trim();
              const isManaged = !!k && MANAGED_LABEL_KEYS.has(k);
              const isDup = !!k && labels.custom.filter((p) => p.key.trim() === k).length > 1;
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder={t('editor.customLabelKeyPlaceholder')}
                      value={pair.key}
                      aria-invalid={isManaged || isDup}
                      onChange={(e) =>
                        onChange({
                          custom: labels.custom.map((p, i) =>
                            i === idx ? { ...p, key: e.target.value } : p,
                          ),
                        })
                      }
                      className="flex-1 h-10 text-sm font-mono"
                    />
                    <span className="text-muted-foreground/70 text-sm">=</span>
                    <Input
                      placeholder={t('editor.customLabelValuePlaceholder')}
                      value={pair.value}
                      onChange={(e) =>
                        onChange({
                          custom: labels.custom.map((p, i) =>
                            i === idx ? { ...p, value: e.target.value } : p,
                          ),
                        })
                      }
                      className="flex-1 h-10 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ custom: labels.custom.filter((_, i) => i !== idx) })
                      }
                      className="p-1.5 rounded hover:bg-muted text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {(isManaged || isDup) && (
                    <p className="text-xs text-warning pl-0.5">
                      {isManaged
                        ? t('editor.managedLabelWarning')
                        : t('editor.duplicateLabelWarning')}
                    </p>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustom}
              className="self-start"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('editor.add')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
