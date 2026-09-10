'use client';

import React from 'react';
import {
  ComboBox as AriaComboBox,
  Input as AriaInput,
  Button as AriaButton,
  Popover as AriaPopover,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  type Key,
} from 'react-aria-components';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AutocompleteItem {
  id: string;
  label: string;
  value?: string;
}

export interface LocationAutocompleteProps {
  items: AutocompleteItem[];
  selectedKey?: string;
  onSelectionChange?: (key: Key | null) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function LocationAutocomplete({
  items,
  selectedKey,
  onSelectionChange,
  placeholder = 'Select or search location...',
  className,
  ariaLabel = 'Filter location',
}: LocationAutocompleteProps) {
  // Ensure items have unique IDs
  const safeItems = React.useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item, idx) => {
      const id = item.id || `item-${idx}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [items]);

  return (
    <AriaComboBox
      aria-label={ariaLabel}
      items={safeItems}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      menuTrigger="focus"
      className={twMerge('relative min-w-[360px] w-96', className)}
    >
      <div className="relative flex items-center">
        <AriaInput
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 pr-8 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] font-medium truncate"
        />
        <AriaButton
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none"
          aria-label="Show locations"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </AriaButton>
      </div>

      <AriaPopover
        className="min-w-[--trigger-width] w-auto max-w-2xl bg-white border border-slate-200 rounded-md shadow-lg p-1 z-50 text-xs font-sans enter:animate-in enter:fade-in enter:zoom-in-95 exit:animate-out exit:fade-out exit:zoom-out-95"
      >
        <AriaListBox className="outline-none space-y-0.5 max-h-[445px] overflow-y-auto">
          {(item: AutocompleteItem) => (
            <AriaListBoxItem
              id={item.id}
              textValue={item.label}
              className={({ isFocused, isSelected }) =>
                twMerge(
                  clsx(
                    'flex items-center justify-between px-3 py-1.5 rounded text-xs cursor-pointer outline-none transition-colors whitespace-nowrap',
                    isFocused ? 'bg-[#f0f7ff] text-[#2d82b7]' : 'text-slate-700',
                    isSelected ? 'font-bold bg-[#e0effe] text-[#1e6091]' : 'font-normal'
                  )
                )
              }
            >
              {({ isSelected }) => (
                <>
                  <span className="truncate mr-3 whitespace-nowrap">{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1e6091] shrink-0" />}
                </>
              )}
            </AriaListBoxItem>
          )}
        </AriaListBox>
      </AriaPopover>
    </AriaComboBox>
  );
}
