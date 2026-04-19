import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-border-input bg-transparent px-3 py-1 text-sm text-text-primary shadow-xs transition-[color,box-shadow] outline-none placeholder:text-text-muted selection:bg-primary selection:text-primary-foreground focus-within:border-border-focus focus-within:ring-primary/50 focus-within:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
