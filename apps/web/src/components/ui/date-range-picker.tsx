'use client';

import React, { useMemo } from 'react';
import {
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerProps as AriaDateRangePickerProps,
  DateInput as AriaDateInput,
  DateSegment as AriaDateSegment,
  RangeCalendar as AriaRangeCalendar,
  CalendarGrid as AriaCalendarGrid,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarCell as AriaCalendarCell,
  Heading as AriaHeading,
  Button as AriaButton,
  Popover as AriaPopover,
  Dialog as AriaDialog,
  Label as AriaLabel,
  Group as AriaGroup,
  DateValue,
} from 'react-aria-components';
import { CalendarDate, parseDate } from '@internationalized/date';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRangePickerProps extends Omit<AriaDateRangePickerProps<DateValue>, 'value' | 'defaultValue' | 'onChange'> {
  value?: { start: string | DateValue; end: string | DateValue } | null;
  defaultValue?: { start: string | DateValue; end: string | DateValue } | null;
  onChange?: (range: { start: string; end: string }) => void;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
}

export function DateRangePicker({
  value,
  defaultValue,
  onChange,
  label,
  size = 'md',
  className = '',
  formatOptions = { month: 'numeric', day: 'numeric', year: 'numeric' },
  ...props
}: DateRangePickerProps) {
  const parsedValue = useMemo(() => {
    if (!value) return null;
    try {
      const start = typeof value.start === 'string' ? parseDate(value.start.split('T')[0]) : value.start;
      const end = typeof value.end === 'string' ? parseDate(value.end.split('T')[0]) : value.end;
      return { start, end };
    } catch (e) {
      return null;
    }
  }, [value]);

  const parsedDefaultValue = useMemo(() => {
    if (!defaultValue) return undefined;
    try {
      const start = typeof defaultValue.start === 'string' ? parseDate(defaultValue.start.split('T')[0]) : defaultValue.start;
      const end = typeof defaultValue.end === 'string' ? parseDate(defaultValue.end.split('T')[0]) : defaultValue.end;
      return { start, end };
    } catch (e) {
      return undefined;
    }
  }, [defaultValue]);

  const handleChange = (range: { start: DateValue; end: DateValue } | null) => {
    if (onChange && range) {
      onChange({
        start: range.start.toString(),
        end: range.end.toString(),
      });
    }
  };

  const isSmall = size === 'sm';

  return (
    <AriaDateRangePicker
      {...props}
      value={parsedValue}
      defaultValue={parsedDefaultValue}
      onChange={handleChange}
      className={`inline-flex flex-col gap-1 text-slate-800 ${className}`}
    >
      {label && (
        <AriaLabel className="text-[11px] font-semibold text-slate-600 mb-0.5">
          {label}
        </AriaLabel>
      )}

      <AriaGroup
        className={`inline-flex items-center bg-white border border-slate-300 rounded focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400 hover:border-slate-400 transition-colors ${
          isSmall ? 'h-7 px-2 text-xs gap-1.5' : 'h-8 px-2.5 text-xs gap-2'
        }`}
      >
        <AriaDateInput slot="start" className="flex items-center ">
          {(segment) => (
            <AriaDateSegment
              segment={segment}
              className={`rounded px-0.5 focus:bg-[#3f6b35] focus:text-white focus:outline-none transition-colors ${
                segment.isPlaceholder ? 'text-slate-400' : 'text-slate-700'
              }`}
            />
          )}
        </AriaDateInput>

        <span aria-hidden="true" className="text-slate-400 font-semibold text-[11px] px-0.5 ">—</span>

        <AriaDateInput slot="end" className="flex items-center ">
          {(segment) => (
            <AriaDateSegment
              segment={segment}
              className={`rounded px-0.5 focus:bg-[#3f6b35] focus:text-white focus:outline-none transition-colors ${
                segment.isPlaceholder ? 'text-slate-400' : 'text-slate-700'
              }`}
            />
          )}
        </AriaDateInput>

        <AriaButton
          className="p-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors focus:outline-none cursor-pointer ml-auto"
        >
          <CalendarIcon className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </AriaButton>
      </AriaGroup>

      {/* Popover Range Calendar */}
      <AriaPopover
        className="z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-3.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
      >
        <AriaDialog className="focus:outline-none">
          <AriaRangeCalendar className="w-64 ">
            <header className="flex items-center justify-between mb-2">
              <AriaButton
                slot="previous"
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </AriaButton>

              <AriaHeading className="text-xs font-bold text-slate-800" />

              <AriaButton
                slot="next"
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </AriaButton>
            </header>

            <AriaCalendarGrid className="w-full border-collapse">
              <AriaCalendarGridHeader>
                {(day) => (
                  <AriaCalendarHeaderCell className="text-[11px] font-semibold text-slate-400 text-center pb-1">
                    {day}
                  </AriaCalendarHeaderCell>
                )}
              </AriaCalendarGridHeader>

              <AriaCalendarGridBody className="divide-y-0">
                {(date) => (
                  <AriaCalendarCell
                    date={date}
                    className={({ isSelected, isSelectionStart, isSelectionEnd, isToday, isOutsideVisibleRange, isDisabled }) =>
                      `w-8 h-8 flex items-center justify-center text-xs cursor-pointer transition-colors ${
                        isOutsideVisibleRange ? 'text-slate-300' : 'text-slate-700'
                      } ${
                        isSelected
                          ? isSelectionStart || isSelectionEnd
                            ? 'bg-[#3f6b35] text-white font-bold rounded shadow-2xs'
                            : 'bg-[#3f6b35]/15 text-[#3f6b35] font-semibold'
                          : 'hover:bg-slate-100 rounded'
                      } ${
                        isToday && !isSelected
                          ? 'border border-[#3f6b35] font-bold text-[#3f6b35] rounded'
                          : ''
                      } ${isDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`
                    }
                  />
                )}
              </AriaCalendarGridBody>
            </AriaCalendarGrid>
          </AriaRangeCalendar>
        </AriaDialog>
      </AriaPopover>
    </AriaDateRangePicker>
  );
}
