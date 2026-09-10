'use client';

import React, { useMemo } from 'react';
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateInput as AriaDateInput,
  DateSegment as AriaDateSegment,
  Calendar as AriaCalendar,
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
  Text as AriaText,
  FieldError as AriaFieldError,
  Group as AriaGroup,
  DateValue,
} from 'react-aria-components';
import { CalendarDate, parseDate, getLocalTimeZone, today } from '@internationalized/date';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DatePickerProps extends Omit<AriaDatePickerProps<DateValue>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string | DateValue | null;
  defaultValue?: string | DateValue | null;
  onChange?: (value: string) => void;
  onDateChange?: (value: DateValue | null) => void;
  label?: string;
  description?: string;
  errorMessage?: string;
  size?: 'sm' | 'md';
  className?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  onDateChange,
  label,
  description,
  errorMessage,
  size = 'md',
  className = '',
  formatOptions = { month: 'numeric', day: 'numeric', year: 'numeric' },
  ...props
}: DatePickerProps) {
  // Convert string values (YYYY-MM-DD) to CalendarDate
  const parsedValue = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const clean = value.split('T')[0];
        return parseDate(clean);
      } catch (e) {
        return null;
      }
    }
    return value as DateValue;
  }, [value]);

  const parsedDefaultValue = useMemo(() => {
    if (!defaultValue) return undefined;
    if (typeof defaultValue === 'string') {
      try {
        const clean = defaultValue.split('T')[0];
        return parseDate(clean);
      } catch (e) {
        return undefined;
      }
    }
    return defaultValue as DateValue;
  }, [defaultValue]);

  const handleChange = (date: DateValue | null) => {
    if (onDateChange) {
      onDateChange(date);
    }
    if (onChange) {
      if (date) {
        onChange(date.toString());
      } else {
        onChange('');
      }
    }
  };

  const isSmall = size === 'sm';

  return (
    <AriaDatePicker
      {...props}
      value={parsedValue}
      defaultValue={parsedDefaultValue}
      onChange={handleChange}
      className={`inline-flex flex-col gap-1 text-slate-800 ${className}`}
    >
      {label && (
        <AriaLabel className="text-xs font-semibold text-slate-700">
          {label}
        </AriaLabel>
      )}

      <AriaGroup
        className={`inline-flex items-center justify-between bg-white border border-slate-300 rounded focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400 transition-colors ${
          props.isDisabled ? 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200' : 'hover:border-slate-400'
        } ${isSmall ? 'px-2 py-1 text-xs gap-1.5' : 'px-2.5 py-1.5 text-xs gap-2'}`}
      >
        <AriaDateInput className="flex items-center ">
          {(segment) => (
            <AriaDateSegment
              segment={segment}
              className={`rounded px-0.5 focus:bg-[#3f6b35] focus:text-white focus:outline-none transition-colors ${
                segment.isPlaceholder ? 'text-slate-400' : 'text-slate-800'
              }`}
            />
          )}
        </AriaDateInput>

        <AriaButton
          className={`p-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors focus:outline-none cursor-pointer ${
            props.isDisabled ? 'pointer-events-none' : ''
          }`}
        >
          <CalendarIcon className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </AriaButton>
      </AriaGroup>

      {description && (
        <AriaText slot="description" className="text-[11px] text-slate-500">
          {description}
        </AriaText>
      )}

      {errorMessage && (
        <AriaFieldError className="text-[11px] text-red-600 font-medium">
          {errorMessage}
        </AriaFieldError>
      )}

      {/* Popover Calendar with Accessible Dialog */}
      <AriaPopover
        className="z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-3.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
      >
        <AriaDialog className="focus:outline-none">
          <AriaCalendar className="w-64 ">
            {/* Header with Month / Year and Navigation */}
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

            {/* Calendar Table Grid */}
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
                    className={({ isSelected, isToday, isOutsideVisibleRange, isDisabled }) =>
                      `w-8 h-8 rounded flex items-center justify-center text-xs cursor-pointer transition-colors ${
                        isOutsideVisibleRange ? 'text-slate-300' : 'text-slate-700'
                      } ${
                        isSelected
                          ? 'bg-[#3f6b35] text-white font-bold shadow-2xs'
                          : 'hover:bg-slate-100'
                      } ${
                        isToday && !isSelected
                          ? 'border border-[#3f6b35] font-bold text-[#3f6b35]'
                          : ''
                      } ${isDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`
                    }
                  />
                )}
              </AriaCalendarGridBody>
            </AriaCalendarGrid>
          </AriaCalendar>
        </AriaDialog>
      </AriaPopover>
    </AriaDatePicker>
  );
}
