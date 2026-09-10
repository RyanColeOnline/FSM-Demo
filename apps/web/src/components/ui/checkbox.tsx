import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={twMerge(
          clsx(
            'h-4 w-4 rounded border-slate-300 text-[#3f6b35] focus:ring-[#3f6b35] cursor-pointer accent-[#3f6b35]',
            className
          )
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
