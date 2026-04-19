import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary text-white',
  secondary: 'bg-muted-bg text-text-secondary',
  count: 'bg-primary-light text-primary font-semibold',
  success: 'bg-success-bg text-success',
  destructive: 'bg-error-bg text-error',
  warning: 'bg-warning-bg text-warning',
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeProps };
