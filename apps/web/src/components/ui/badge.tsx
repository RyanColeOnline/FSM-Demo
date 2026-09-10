import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'danger' | 'warning' | 'default';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold';
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-[#70b53c] text-white border border-[#5fa02f]',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
  };

  return (
    <div
      className={twMerge(clsx(base, variants[variant], className))}
      {...props}
    />
  );
}
