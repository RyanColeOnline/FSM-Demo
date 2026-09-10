import * as React from 'react';
import { Check, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatusBadgeProps {
  status: 'Synced' | 'Pending' | 'Failed' | 'Active' | 'Inactive' | string;
  showDropdownArrow?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDropdownArrow = false, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  if (normalized === 'synced') {
    return (
      <span className={twMerge(clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#70b53c] text-white shadow-2xs border border-[#5ea22e]", className))}>
        <Check className="w-3 h-3 stroke-[3]" />
        <span>synced</span>
        {showDropdownArrow && <ChevronDown className="w-3 h-3 opacity-80" />}
      </span>
    );
  }

  if (normalized === 'pending') {
    return (
      <span className={twMerge(clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white shadow-2xs border border-amber-600", className))}>
        <Clock className="w-3 h-3" />
        <span>pending</span>
        {showDropdownArrow && <ChevronDown className="w-3 h-3 opacity-80" />}
      </span>
    );
  }

  if (normalized === 'failed') {
    return (
      <span className={twMerge(clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#be4646] text-white shadow-2xs border border-[#a63a3a]", className))}>
        <AlertTriangle className="w-3 h-3" />
        <span>failed</span>
        {showDropdownArrow && <ChevronDown className="w-3 h-3 opacity-80" />}
      </span>
    );
  }

  return (
    <span className={twMerge(clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800", className))}>
      {status}
    </span>
  );
}
