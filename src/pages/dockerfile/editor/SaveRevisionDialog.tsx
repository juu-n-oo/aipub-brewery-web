import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

interface SaveRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onMessageChange: (v: string) => void;
  onConfirm: () => void;
  saving: boolean;
}

/** 수정 저장 시 리비전 커밋 메시지를 입력받는 다이얼로그. */
export function SaveRevisionDialog({
  open,
  onOpenChange,
  message,
  onMessageChange,
  onConfirm,
  saving,
}: SaveRevisionDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('editor.saveDialogTitle')}</DialogTitle>
          <DialogDescription>{t('editor.saveDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label>{t('editor.revisionMessage')}</Label>
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={t('editor.revisionMessagePlaceholder')}
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-ring/50 focus:ring-[3px] resize-y"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
