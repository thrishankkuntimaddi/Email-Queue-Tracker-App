import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
        destructive: 'bg-red-500 text-white',
        outline: 'border-slate-200 text-slate-900 dark:border-slate-700 dark:text-slate-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
