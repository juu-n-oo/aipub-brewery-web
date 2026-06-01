import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * sonner 기반 토스트 헬퍼. 기존 useToast 시그니처를 유지한다.
 * `const { toast } = useToast()` 형태로 사용.
 */
export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
    const message = title ?? description ?? '';
    const opts = title && description ? { description } : undefined;
    return variant === 'destructive'
      ? sonnerToast.error(message, opts)
      : sonnerToast(message, opts);
  };

  const dismiss = (id?: string | number) => sonnerToast.dismiss(id);

  return { toast, dismiss };
}

export { sonnerToast as toast };
