import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SearchBarProps {
  fields?: string[];
  selectedField?: string;
  onFieldChange?: (field: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export function SearchBar({
  fields = ['Customer Name', 'Location', 'Email Address', 'Phone Number', 'Last Visit Date'],
  selectedField,
  onFieldChange,
  query,
  onQueryChange,
  placeholder = 'Search...',
  inputClassName,
}: SearchBarProps) {
  return (
    <div className="flex items-center">
      {fields.length > 0 && (
        <div className="relative border border-r-0 border-slate-300 rounded-l bg-slate-50 flex items-center">
          <select
            value={selectedField || fields[0]}
            onChange={(e) => onFieldChange && onFieldChange(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-1.5 shrink-0" />
        </div>
      )}
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className={
          inputClassName ||
          `px-3 py-1.5 text-xs bg-white border border-slate-300 ${
            fields.length > 0 ? 'rounded-r' : 'rounded'
          } focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 w-80`
        }
      />
    </div>
  );
}
