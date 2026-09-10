'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { 
  CanonicalJobCategory, 
  CanonicalJobType, 
  CanonicalTripType, 
  CANONICAL_TRIP_COLORS,
  extractTripType
} from '@/domain/types/jobType';

interface HierarchicalJobTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  userRole?: string; // 'Admin' | 'Office' | 'Field'
  userDispatchGroup?: string; // 'Office Staff' | 'HVAC Techs' | 'Appliance Techs' | 'Installers'
  onOpenChange?: (open: boolean) => void;
  showChevronInJobTypes?: boolean;
}

interface CategoryConfig {
  category: CanonicalJobCategory;
  jobTypes: {
    name: CanonicalJobType;
    standardTripTypes: CanonicalTripType[];
    providerTripTypes?: CanonicalTripType[];
  }[];
}

const MATRIX_CATEGORIES: CategoryConfig[] = [
  {
    category: 'HVAC',
    jobTypes: [
      {
        name: 'Home Warranty (HW)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
        providerTripTypes: ['AHS', 'FI', 'O.R.'],
      },
      {
        name: 'Commercial (C)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
      {
        name: 'Resort (RES)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
      {
        name: 'COD',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
    ],
  },
  {
    category: 'Appliance',
    jobTypes: [
      {
        name: 'Residential (R)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
      {
        name: 'Commercial (C)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
      {
        name: 'Home Warranty (HW)',
        standardTripTypes: ['Diagnostic', 'Install', 'Parts', 'PM', 'Recall'],
      },
    ],
  },
];

function findSelectionFromValue(val: string): { category: CanonicalJobCategory; jobType: CanonicalJobType } | null {
  if (!val) return null;
  const cleanVal = val.toLowerCase().trim();
  
  for (const catConfig of MATRIX_CATEGORIES) {
    for (const jt of catConfig.jobTypes) {
      const jtNameClean = jt.name.toLowerCase();
      const baseJtName = jtNameClean.replace(/\s*\([^)]*\)/g, '').trim();
      const abbreviation = jtNameClean.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
      
      if (
        cleanVal.startsWith(jtNameClean) ||
        cleanVal.startsWith(baseJtName) ||
        (abbreviation && cleanVal.includes(`(${abbreviation})`)) ||
        (catConfig.category === 'Appliance' && cleanVal.includes('residential') && jt.name === 'Residential (R)') ||
        (catConfig.category === 'HVAC' && cleanVal.includes('resort') && jt.name === 'Resort (RES)') ||
        (catConfig.category === 'HVAC' && cleanVal.includes('cod') && jt.name === 'COD')
      ) {
        return { category: catConfig.category, jobType: jt.name };
      }
    }
  }
  return null;
}

export function HierarchicalJobTypeSelector({
  value,
  onChange,
  className = '',
  disabled = false,
  userRole = 'Admin',
  userDispatchGroup = 'Office Staff',
  onOpenChange,
  showChevronInJobTypes = false,
}: HierarchicalJobTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (nextState?: boolean) => {
    const val = typeof nextState === 'boolean' ? nextState : !isOpen;
    setIsOpen(val);
    onOpenChange?.(val);
  };

  // Determine initial active category from value, dispatch group, and role
  const getDefaultCategory = (): CanonicalJobCategory => {
    if (value) {
      const match = findSelectionFromValue(value);
      if (match) return match.category;
      const lower = value.toLowerCase();
      if (lower.includes('appliance') || lower.includes('residential') || lower.includes(' (r)')) {
        return 'Appliance';
      }
      if (lower.includes('hvac') || lower.includes('resort') || lower.includes('cod')) {
        return 'HVAC';
      }
    }

    const group = (userDispatchGroup || 'Office Staff').toLowerCase();
    const role = (userRole || 'Admin').toLowerCase();

    // If specific dispatch group is Appliance Techs -> Appliance
    if (group.includes('appliance')) {
      return 'Appliance';
    }

    // If specific dispatch group is HVAC Techs or Installers -> HVAC
    if (group.includes('hvac') || group.includes('install')) {
      return 'HVAC';
    }

    // If Admin/Office role and in Office Staff (or general) -> HVAC
    if (role.includes('admin') || role.includes('office') || group.includes('office')) {
      return 'HVAC';
    }

    return 'HVAC';
  };

  const [activeCategory, setActiveCategory] = useState<CanonicalJobCategory>(() => {
    const match = findSelectionFromValue(value);
    return match ? match.category : getDefaultCategory();
  });
  const [activeJobType, setActiveJobType] = useState<string | null>(() => {
    const match = findSelectionFromValue(value);
    return match ? match.jobType : null;
  });

  // When dropdown opens or value changes:
  // If an option is already selected, keep trip types visible and selected.
  // Otherwise, trip types column remains unpopulated until user clicks on a job type.
  useEffect(() => {
    if (isOpen) {
      const match = findSelectionFromValue(value);
      if (match) {
        setActiveCategory(match.category);
        setActiveJobType(match.jobType);
      } else {
        const defaultCat = getDefaultCategory();
        setActiveCategory(defaultCat);
        setActiveJobType(null);
      }
    }
  }, [isOpen, value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        toggleOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentCategoryConfig = MATRIX_CATEGORIES.find((c) => c.category === activeCategory) || MATRIX_CATEGORIES[0];
  const activeJobTypeConfig = activeJobType ? currentCategoryConfig.jobTypes.find((jt) => jt.name === activeJobType) || null : null;

  const parsedTrip = extractTripType(value);
  const currentHex = value ? (CANONICAL_TRIP_COLORS[parsedTrip]?.webHex || '#0088ff') : null;

  const handleSelectTrip = (jobTypeName: CanonicalJobType, trip: CanonicalTripType) => {
    const formatted = `${jobTypeName} - ${trip}`;
    onChange(formatted);
    toggleOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-xs font-sans ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggleOpen()}
        className={`w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] transition-all cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {currentHex ? (
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
              style={{ backgroundColor: currentHex }} 
            />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300 bg-slate-100" />
          )}
          <span className={`font-medium truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {value || 'Select Job Type...'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hierarchical Dropdown Panel: Matches Trigger Width Exactly */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Level 1: Category Header Tabs without icons (HVAC first) */}
          <div className="bg-slate-50 p-1.5 border-b border-slate-200 grid grid-cols-2 gap-1.5">
            {MATRIX_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.category);
                    setActiveJobType(null); // Keep trip type column blank until clicked
                  }}
                  className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-white text-[#2d82b7] shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <span>{cat.category}</span>
                </button>
              );
            })}
          </div>

          {/* Level 2 & 3 Body: Equal 50/50 Columns */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 min-h-[200px] max-h-[280px]">
            {/* Left Column: Job Types */}
            <div className="p-1.5 space-y-1 bg-slate-50/40 overflow-y-auto">
              {currentCategoryConfig.jobTypes.map((jt) => {
                const isSelected = activeJobType === jt.name;
                return (
                  <button
                    key={jt.name}
                    type="button"
                    onClick={() => setActiveJobType(jt.name)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#2d82b7]/10 text-[#2d82b7] font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{jt.name}</span>
                    {showChevronInJobTypes && (
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-[#2d82b7] translate-x-0.5' : 'text-slate-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Trip Types under selected Job Type (Only populated when activeJobTypeConfig is set) */}
            <div className="p-1.5 space-y-1 overflow-y-auto bg-white">
              {activeJobTypeConfig && (
                <>
              {/* Standard Trip Types */}
              {activeJobTypeConfig.standardTripTypes.map((trip) => {
                const tripHex = CANONICAL_TRIP_COLORS[trip]?.webHex || '#0088ff';
                const formattedName = `${activeJobTypeConfig.name} - ${trip}`;
                const jtBase = activeJobTypeConfig.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
                const v = (value || '').toLowerCase().trim();
                const tripLower = trip.toLowerCase().trim();
                const isCurrentValue =
                  v === formattedName.toLowerCase() ||
                  v === `${jtBase} - ${tripLower}` ||
                  ((v.includes(activeJobTypeConfig.name.toLowerCase()) || v.includes(jtBase)) && v.includes(tripLower));

                return (
                  <button
                    key={trip}
                    type="button"
                    onClick={() => handleSelectTrip(activeJobTypeConfig.name, trip)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] flex items-center justify-between transition-all group cursor-pointer ${
                      isCurrentValue
                        ? 'bg-[#2d82b7]/10 text-[#2d82b7] font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-2xs group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: tripHex }}
                      />
                      <span className={`truncate ${isCurrentValue ? 'font-bold text-[#2d82b7]' : 'font-medium'}`}>{trip}</span>
                    </div>
                    {isCurrentValue && <Check className="w-3.5 h-3.5 text-[#2d82b7] shrink-0" />}
                  </button>
                );
              })}

              {/* Special Warranty Providers (AHS, FI, O.R.) separated by a divider line */}
              {activeJobTypeConfig.providerTripTypes && activeJobTypeConfig.providerTripTypes.length > 0 && (
                <>
                  <div className="border-t border-slate-200 my-1" />
                  {activeJobTypeConfig.providerTripTypes.map((trip) => {
                    const tripHex = CANONICAL_TRIP_COLORS[trip]?.webHex || '#ff9500';
                    const formattedName = `${activeJobTypeConfig.name} - ${trip}`;
                    const jtBase = activeJobTypeConfig.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
                    const v = (value || '').toLowerCase().trim();
                    const tripLower = trip.toLowerCase().trim();
                    const isCurrentValue =
                      v === formattedName.toLowerCase() ||
                      v === `${jtBase} - ${tripLower}` ||
                      ((v.includes(activeJobTypeConfig.name.toLowerCase()) || v.includes(jtBase)) && v.includes(tripLower));

                    return (
                      <button
                        key={trip}
                        type="button"
                        onClick={() => handleSelectTrip(activeJobTypeConfig.name, trip)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] flex items-center justify-between transition-all group cursor-pointer ${
                          isCurrentValue
                            ? 'bg-[#2d82b7]/10 text-[#2d82b7] font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-2xs group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: tripHex }}
                          />
                          <span className={`truncate ${isCurrentValue ? 'font-bold text-[#2d82b7]' : 'font-medium'}`}>{trip}</span>
                        </div>
                        {isCurrentValue && <Check className="w-3.5 h-3.5 text-[#2d82b7] shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
