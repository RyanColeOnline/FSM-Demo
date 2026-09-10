'use client';

export function splitAddressParts(rawAddress?: string, customerName?: string): {
  street: string;
  addressLine2: string;
  cityStateZip: string;
  fullCleanAddress: string;
} {
  if (!rawAddress) {
    return { street: '', addressLine2: '', cityStateZip: '', fullCleanAddress: '' };
  }

  let addr = rawAddress.trim();

  // 1. Strip customer name prefix (e.g. "Ryan Cole - ")
  if (customerName) {
    const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    addr = addr.replace(new RegExp(`^${escaped}\\s*-\\s*`, 'i'), '');
  }
  addr = addr.replace(/^[A-Za-z0-9\\s.,'#-]+?\\s+-\\s+(?=\\d)/i, '');

  // Normalize ", 430," or ", #430," or "Apt 430"
  addr = addr.replace(/,\\s*(\\d+[A-Za-z]?)\\s*,/i, ', Apt $1,');
  addr = addr.replace(/\\b([0-9]+\\s+[A-Za-z0-9\\s]+?)\\s+Apt\\s+(\\d+[A-Za-z]?)/i, '$1, Apt $2');

  let street = '';
  let addressLine2 = '';
  let cityStateZip = '';

  // Handle newlines
  if (addr.includes('\\n')) {
    const parts = addr.split('\\n').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      street = parts[0];
      addressLine2 = parts[1];
      cityStateZip = parts.slice(2).join(', ');
    } else if (parts.length === 2) {
      street = parts[0];
      cityStateZip = parts[1];
    } else {
      street = parts[0] || '';
    }
  } else {
    // Match City, State Zip: e.g. ", Fort Walton Beach, FL 32548"
    const cityStateZipRegex = /,\\s*([^,]+,\\s*[A-Z]{2}\\s*\\d{5}(-\\d{4})?)$/i;
    const match = addr.match(cityStateZipRegex);
    if (match && match.index !== undefined) {
      const streetPart = addr.slice(0, match.index).trim();
      cityStateZip = match[1].trim();

      // Check if streetPart has Apt/Unit/Suite/Line 2
      const line2Regex = /,\\s*((?:Apt|Unit|Suite|Ste|Bldg|Building|#)\\s*[^,]+)$/i;
      const matchLine2 = streetPart.match(line2Regex);
      if (matchLine2 && matchLine2.index !== undefined) {
        street = streetPart.slice(0, matchLine2.index).trim();
        addressLine2 = matchLine2[1].trim();
      } else {
        street = streetPart;
      }
    } else {
      // Fallback
      const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        street = parts[0];
        addressLine2 = parts[1];
        cityStateZip = parts.slice(2).join(', ');
      } else if (parts.length === 2) {
        street = parts[0];
        cityStateZip = parts[1];
      } else {
        street = addr;
      }
    }
  }

  if (addressLine2 && /^\\d+[A-Za-z]?$/i.test(addressLine2)) {
    addressLine2 = `Apt ${addressLine2}`;
  }

  const combinedStreet = [street, addressLine2].filter(Boolean).join(', ');
  const fullCleanAddress = [combinedStreet, cityStateZip].filter(Boolean).join(', ');

  return { street, addressLine2, cityStateZip, fullCleanAddress };
}



import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Flag, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Check,
  MoreHorizontal,
  Edit3
} from 'lucide-react';
import { 
  Button, 
  Checkbox, 
  SearchBar, 
  FilterBar, 
  PageHeader,
  DateRangePicker
} from '@/components/ui';
import { 
  EditFollowUpFlagModal, 
  FlagNoteEntry, 
  mockFollowUpTypes, 
  mockAssignees 
} from '@/components/modals/EditFollowUpFlagModal';
import { useJobs, usePaginatedJobs } from '@/hooks/useJobs';
import { useAppointments } from '@/hooks/useAppointments';
import { useCustomers } from '@/hooks/useCustomers';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { CanonicalFollowUpFlag } from '@murphys/domain';
import { 
  getTripTypeWebHex, 
  getEasternDateString, 
  formatEasternDate, 
  formatEasternDateTime, 
  normalizeToEasternDateString 
} from '@/domain';

interface JobRecord {
  id: string;
  customerId?: string;
  customerNumber?: string;
  dateCreated: string;
  jobNumber: string;
  customerName: string;
  locationAddress: {
    name?: string;
    street: string;
    cityStateZip: string;
  };
  jobTypeBadge: string;
  status: 'Opened' | 'Closed' | 'Abandoned';
  isFlagged: boolean;
  followUpType?: string;
  assignee?: string;
  dueDate?: string;
  isFlagComplete?: boolean;
  notes?: FlagNoteEntry[];
}

const initialJobs: JobRecord[] = [
  {
    id: 'job-1',
    dateCreated: '8/09/2026',
    jobNumber: '134186',
    customerName: 'Dom Villareal',
    locationAddress: {
      name: 'Dom Villareal',
      street: '4232 Beachside 2',
      cityStateZip: 'Miramar Beach, FL 32550',
    },
    jobTypeBadge: 'HVAC SERVICE',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Justin Dunlap',
    dueDate: '2026-08-15',
    isFlagComplete: false,
    notes: [
      {
        id: 'note-1',
        authorName: 'Ethan Mitchell',
        timestamp: '8/07/2026, 4:44 pm',
        text: 'Need quote on new compressor unit and refrigerant recharge.',
        isEditing: false,
      },
      {
        id: 'note-2',
        authorName: 'Sarah Miller',
        timestamp: '8/08/2026, 9:15 am',
        text: 'Customer requested written authorization before proceeding.',
        isEditing: false,
      },
    ],
  },
  {
    id: 'job-2',
    dateCreated: '8/08/2026',
    jobNumber: '134183',
    customerName: '360 Blue, LLC',
    locationAddress: {
      name: '360 Blue, LLC',
      street: '69 Running Oak Cr',
      cityStateZip: 'Santa Rosa Beach, FL 32459',
    },
    jobTypeBadge: 'HVAC SERVICE',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Justin Dunlap',
    notes: [
      {
        id: 'note-3',
        authorName: 'David Smith',
        timestamp: '8/08/2026, 11:30 am',
        text: 'Awaiting landlord approval for unit replacement.',
        isEditing: false,
      },
    ],
  },
  {
    id: 'job-3',
    dateCreated: '8/07/2026',
    jobNumber: '134180',
    customerName: 'Kurt Phillips',
    locationAddress: {
      name: 'Kurt Phillips',
      street: '413 Maritime Ct',
      cityStateZip: 'Destin, FL 32541',
    },
    jobTypeBadge: 'HVAC SERVICE',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Justin Dunlap',
    notes: [
      {
        id: 'note-4',
        authorName: 'Ethan Mitchell',
        timestamp: '8/07/2026, 2:10 pm',
        text: 'Initial appointment created. Follow up needed for quote.',
        isEditing: false,
      },
    ],
  },
  {
    id: 'job-4',
    dateCreated: '8/07/2026',
    jobNumber: '134177',
    customerName: 'Destin Pointe Vacation Rentals',
    locationAddress: {
      name: 'Destin Pointe Vacation Rentals',
      street: '480 Gulf Shore Dr #409',
      cityStateZip: 'Destin, FL 32541',
    },
    jobTypeBadge: 'APPLIANCE SERVICE',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Danny Pardo',
    notes: [],
  },
  {
    id: 'job-5',
    dateCreated: '8/07/2026',
    jobNumber: '134173',
    customerName: 'Southern Vacation Rentals',
    locationAddress: {
      name: 'Southern Vacation Rentals',
      street: '2003 Devmor Court 1A Sunset Cottages',
      cityStateZip: 'Fort Walton Beach, FL 32548',
    },
    jobTypeBadge: 'APPLIANCE SERVICE',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Justin Lung',
    notes: [],
  },
  {
    id: 'job-6',
    dateCreated: '8/07/2026',
    jobNumber: '134171',
    customerName: 'Tom Berghoff',
    locationAddress: {
      name: 'Tom Berghoff',
      street: '6027 Sterling River Way',
      cityStateZip: 'Niceville, FL 32578',
    },
    jobTypeBadge: 'HW HVAC',
    status: 'Opened',
    isFlagged: true,
    followUpType: 'Need Quote/Autho',
    assignee: 'Justin Dunlap',
    notes: [],
  },
  {
    id: 'job-7',
    dateCreated: '8/06/2026',
    jobNumber: '134165',
    customerName: 'American Home Shield',
    locationAddress: {
      name: 'American Home Shield',
      street: '1557 Meadowbrook Ct',
      cityStateZip: 'Niceville, FL 32578',
    },
    jobTypeBadge: 'APPLIANCE SERVICE',
    status: 'Closed',
    isFlagged: false,
    notes: [],
  },
  {
    id: 'job-8',
    dateCreated: '8/05/2026',
    jobNumber: '134159',
    customerName: 'Newman Dailey',
    locationAddress: {
      name: 'Newman Dailey - Beachside Inn',
      street: '2931 Scenic Hwy 98 #106 Beachside Inn',
      cityStateZip: 'Destin, FL 32541',
    },
    jobTypeBadge: 'HVAC SERVICE',
    status: 'Opened',
    isFlagged: false,
    notes: [],
  },
];

const availableJobTypes = [
  'All',
  'HVAC SERVICE',
  'APPLIANCE SERVICE',
  'HW HVAC',
  'COMMERCIAL HVAC',
  'MAINTENANCE',
];

// Canonical Trip Type Color Mapper for Job Types
export function getJobTypeBadgeColor(jobType: string): string {
  return getTripTypeWebHex(jobType);
}

// Format timestamp in Eastern US timezone
function getCurrentFormattedTimestamp(): string {
  return formatEasternDateTime(new Date());
}

function parseDateCreatedFromIso(iso: string) {
  if (!iso) return 'Today';
  const formatted = formatEasternDate(iso);
  return formatted || iso.slice(0, 10);
}

function JobListContent() {
  const searchParams = useSearchParams();
  const flaggedParam = searchParams?.get('flagged');

  const { databaseMode } = useDatabaseMode();
  const [searchField, setSearchField] = useState('Job #');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState(() => getEasternDateString(-7));
  const [endDate, setEndDate] = useState(() => getEasternDateString(0));
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(flaggedParam === 'true');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extra Toolbar Filters for Flagged View
  const [followUpTypeFilter, setFollowUpTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: paginatedData, isLoading: jobsLoading, refetch: refreshJobs } = usePaginatedJobs({
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
    jobType: jobTypeFilter,
    startDate,
    endDate,
    flagged: showFlaggedOnly,
    followUpType: followUpTypeFilter,
    assignee: assigneeFilter,
  });

  const { saveJob } = useJobs();
  const { followUps, saveFollowUp } = useFollowUps();

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, startDate, endDate, jobTypeFilter, statusFilter, showFlaggedOnly, followUpTypeFilter, assigneeFilter]);

  const rawJobsList = paginatedData?.jobs ?? [];
  const totalJobs = showFlaggedOnly ? paginatedJobs.length : (paginatedData?.total ?? 0);
  const totalPages = showFlaggedOnly ? (Math.ceil(paginatedJobs.length / pageSize) || 1) : (paginatedData?.totalPages ?? 1);

  // Edit Follow Up Flag Modal State
  const [editingFlagJob, setEditingFlagJob] = useState<JobRecord | null>(null);
  const [modalFollowUpType, setModalFollowUpType] = useState('Need Quote/Autho');
  const [modalAssignee, setModalAssignee] = useState('');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalFlagComplete, setModalFlagComplete] = useState(false);
  const [modalNotes, setModalNotes] = useState<FlagNoteEntry[]>([]);
  const [activeNoteMenuId, setActiveNoteMenuId] = useState<string | null>(null);

  const noteListRef = useRef<HTMLDivElement>(null);

  // Transform canonical jobs to JobRecord UI model
  const paginatedJobs: JobRecord[] = React.useMemo(() => {
    if (rawJobsList.length > 0) {
      let mapped = rawJobsList.map((j) => {
        const isCompleted = (j.status || '').toLowerCase() === 'closed';
        const isAbandoned = (j.status || '').toLowerCase() === 'abandoned';
        const statusVal: 'Opened' | 'Closed' | 'Abandoned' = isCompleted ? 'Closed' : isAbandoned ? 'Abandoned' : 'Opened';

        const matchedFollowUp = followUps.find(
          (f) => f.jobId === j.id || (j.jobNumber && String(f.jobNumber) === String(j.jobNumber).replace(/\D/g, ''))
        );

        const isFlagged = Boolean(j.isFlagged || (j.followUpFlag && j.followUpFlag !== 'N') || (j as any).flagged || matchedFollowUp);

        const custName = j.customerName || 'Customer';
        const line2 = j.address?.addressLine2 || (j.address as any)?.street2 || '';
        let addrFromObj = '';
        if (j.address) {
          const st = j.address.street || '';
          const fullSt = line2 && !st.includes(line2) ? `${st}, ${line2}` : st;
          addrFromObj = [fullSt, j.address.city, `${j.address.state || 'FL'} ${j.address.zipCode || (j.address as any)?.zip || ''}`.trim()]
            .filter(Boolean)
            .join(', ');
        }
        const rawLoc = addrFromObj || j.locationAddress || '';
        const { street: parsedSt, addressLine2: parsedLine2, cityStateZip: parsedCityStateZip, fullCleanAddress } = splitAddressParts(rawLoc, custName);
        const combinedStreet = [parsedSt, parsedLine2].filter(Boolean).join(', ');
        const fallbackCityStateZip = [
          j.address?.city || j.locationCity,
          j.address?.state || j.locationState || 'FL',
          j.address?.zipCode || (j.address as any)?.zip || j.locationZip,
        ]
          .filter(Boolean)
          .join(', ');
        const finalCityStateZip = parsedCityStateZip || fallbackCityStateZip || '';

        const matchedNotes: FlagNoteEntry[] = (matchedFollowUp?.notes || (j as any).followUpNotes || []).map((n: any) => ({
          id: n.id || `note-${Date.now()}`,
          authorName: n.author || n.authorName || 'Ryan Cole',
          timestamp: n.timestamp || '',
          text: n.text || '',
          isEditing: false,
        }));

        return {
          id: j.id,
          customerId: j.customerId,
          customerNumber: j.customerNumber,
          dateCreated: j.jobCreationDate ? parseDateCreatedFromIso(j.jobCreationDate) : 'Today',
          jobNumber: j.jobNumber || j.id.replace('job-', ''),
          customerName: custName,
          locationAddress: {
            name: custName,
            street: combinedStreet,
            cityStateZip: finalCityStateZip,
          },
          jobTypeBadge: (j.jobType || 'HVAC SERVICE').toUpperCase(),
          status: statusVal,
          isFlagged,
          followUpType: isFlagged ? (matchedFollowUp?.followUpType || j.followUpType || 'Need Quote/Autho') : undefined,
          assignee: matchedFollowUp?.assignedTo || j.assignee || (j as any).followUpAssignee || (isFlagged ? 'Technician' : undefined),
          dueDate: matchedFollowUp?.dueDate || j.followUpDate || j.dueDate || undefined,
          isFlagComplete: Boolean(matchedFollowUp?.isComplete || j.isFlagComplete),
          notes: matchedNotes,
        };
      });

      if (showFlaggedOnly) {
        mapped = mapped.filter((j) => j.isFlagged);
      }

      if (followUpTypeFilter) {
        const fType = followUpTypeFilter.toLowerCase();
        mapped = mapped.filter((j) => (j.followUpType || '').toLowerCase().includes(fType));
      }

      if (assigneeFilter && assigneeFilter !== 'All') {
        mapped = mapped.filter((j) => j.assignee === assigneeFilter);
      }

      return mapped;
    }
    return [];
  }, [rawJobsList, followUps, showFlaggedOnly, followUpTypeFilter, assigneeFilter]);

  useEffect(() => {
    if (flaggedParam === 'true') {
      setShowFlaggedOnly(true);
    }
  }, [flaggedParam]);

  // Outside click listener for note action menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.note-menu-container')) {
        setActiveNoteMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Ensure note list is scrolled to top on load in (first note is top & most important)
  useEffect(() => {
    if (editingFlagJob && noteListRef.current) {
      noteListRef.current.scrollTop = 0;
    }
  }, [editingFlagJob]);

  const handleStatusChange = async (id: string, newStatus: 'Opened' | 'Closed' | 'Abandoned') => {
    const target = rawJobsList.find((j) => j.id === id || j.jobNumber === id);
    if (target) {
      await saveJob({ ...target, status: newStatus });
      refreshJobs();
    }
  };

  // Open Edit Follow Up Flag Modal on clicking Flag icon
  const handleOpenFlagModal = (job: JobRecord) => {
    setEditingFlagJob(job);
    setModalFollowUpType(job.followUpType || 'Need Quote/Autho');
    setModalAssignee(job.assignee || 'Justin Dunlap');
    setModalDueDate(job.dueDate || '');
    setModalFlagComplete(job.isFlagComplete || false);
    setModalNotes(job.notes ? job.notes.map((n) => ({ ...n, isEditing: false })) : []);
    setActiveNoteMenuId(null);
  };

  // Add Note Entry Row AT THE BOTTOM
  const handleAddNoteRow = () => {
    const newNote: FlagNoteEntry = {
      id: `note-${Date.now()}`,
      authorName: 'John Doe',
      timestamp: getCurrentFormattedTimestamp(),
      text: '',
      isEditing: true,
    };
    setModalNotes((prev) => [...prev, newNote]);
    setActiveNoteMenuId(null);
  };

  const handleToggleNoteEdit = (noteId: string) => {
    setModalNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isEditing: !n.isEditing } : n))
    );
    setActiveNoteMenuId(null);
  };

  const handleUpdateNoteText = (noteId: string, text: string) => {
    setModalNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, text } : n))
    );
  };

  // Press Enter key to submit individual note entry into saved row form
  const handleKeyDownNoteSubmit = (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setModalNotes((prev) =>
        prev.map((n) => {
          if (n.id === noteId) {
            if (n.text.trim().length === 0) {
              return null as any;
            }
            return { ...n, isEditing: false };
          }
          return n;
        }).filter(Boolean)
      );
    }
  };

  const handleRemoveNoteRow = (noteId: string) => {
    setModalNotes((prev) => prev.filter((n) => n.id !== noteId));
    setActiveNoteMenuId(null);
  };

  const handleRemoveFlag = async () => {
    if (!editingFlagJob) return;
    const target = rawJobsList.find((j: any) => j.id === editingFlagJob.id || j.jobNumber === editingFlagJob.jobNumber);
    if (target) {
      await saveJob({ ...target, isFlagged: false, followUpFlag: 'N' });
      refreshJobs();
    }
    setEditingFlagJob(null);
  };

  const handleSaveFlagModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlagJob) return;

    const target = rawJobsList.find((j: any) => j.id === editingFlagJob.id || j.jobNumber === editingFlagJob.jobNumber);
    if (target) {
      await saveJob({
        ...target,
        isFlagged: !modalFlagComplete,
        followUpFlag: !modalFlagComplete ? 'Y' : 'N',
        followUpDate: modalDueDate,
      });
      refreshJobs();
    }

    setEditingFlagJob(null);
  };

  return (
    <div className="w-full space-y-4 text-slate-800 pb-12 font-sans">
      {/* 1. Top Header Title */}
      <PageHeader title="Jobs Job List" />

      {/* 2. FilterBar Primitive with Integrated Search Bar (items-start prevents shifting) */}
      <FilterBar className="!items-start transition-all">
        <div className="flex flex-wrap items-start justify-between gap-4 text-xs w-full">
          {/* Left Controls Row - Anchored to top so height changes don't shift elements */}
          <div className="flex flex-wrap items-end gap-4">
            {/* React Aria Date Range Picker */}
            <DateRangePicker
              label="Date Range"
              value={{ start: startDate, end: endDate }}
              onChange={({ start, end }) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            {/* Job Type Dropdown Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                Job Type
              </label>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2d82b7]/15 focus:border-[#2d82b7] min-w-[145px] cursor-pointer shadow-2xs font-medium"
              >
                {availableJobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2d82b7]/15 focus:border-[#2d82b7] min-w-[120px] cursor-pointer shadow-2xs font-medium"
              >
                <option value="All">All</option>
                <option value="Opened">Opened</option>
                <option value="Closed">Closed</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>

            {/* Show Flagged Jobs Only Checkbox */}
            <div className="flex items-center gap-2 pb-1.5 border-r border-slate-200 pr-3">
              <Checkbox
                id="flaggedOnly"
                checked={showFlaggedOnly}
                onChange={(e) => setShowFlaggedOnly(e.target.checked)}
              />
              <label htmlFor="flaggedOnly" className="text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap">
                Show Flagged Jobs Only
              </label>
            </div>
          </div>

          {/* Right Side: Integrated Search Bar + Extra Flagged Filters Beneath */}
          <div className="flex flex-col items-end gap-2">
            <SearchBar
              fields={['Job #', 'Customer', 'Location']}
              selectedField={searchField}
              onFieldChange={setSearchField}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />

            {/* Extra Filter Fields (Follow Up Type & Assignee) Placed Beneath Search Bar */}
            {showFlaggedOnly && (
              <div className="flex items-center gap-3 animate-in fade-in duration-150 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    Follow Up Type
                  </label>
                  <input
                    type="text"
                    placeholder="Filter type..."
                    value={followUpTypeFilter}
                    onChange={(e) => setFollowUpTypeFilter(e.target.value)}
                    className="h-7 px-2.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] w-32 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    Assignee
                  </label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="h-7 px-2.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none min-w-[120px] cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="All">All</option>
                    {mockAssignees.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </FilterBar>

      {/* 3. Job List Table Container */}
      <div className="overflow-hidden shadow-xs border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {showFlaggedOnly && (
                <tr className="bg-transparent border-0">
                  <th colSpan={7} className="bg-transparent border-0 p-0 h-0 pointer-events-none"></th>
                  <th
                    colSpan={2}
                    className="p-1.5 text-center font-bold text-slate-700 bg-[#f4f5f7] border-t border-l border-r border-b-0 border-slate-200 rounded-t-lg text-xs"
                  >
                    Follow Up Details
                  </th>
                </tr>
              )}

              <tr className="bg-slate-50 border-t border-b border-l border-r border-slate-200 font-bold text-[#be4646]">
                <th className="p-3 whitespace-nowrap">Date Created</th>
                <th className="p-3 whitespace-nowrap">Job #</th>
                <th className="p-3 whitespace-nowrap">Customer</th>
                <th className="p-3 whitespace-nowrap">Location Address</th>
                <th className="p-3 whitespace-nowrap">Job Type</th>
                
                <th className="p-3 text-center whitespace-nowrap">Status</th>
                
                {/* Flag Column */}
                <th className="p-3 text-center whitespace-nowrap">Follow Up</th>

                {/* Extra Flag Columns */}
                {showFlaggedOnly && (
                  <>
                    <th className="p-3 text-center whitespace-nowrap border-l border-slate-200 bg-[#f4f5f7]/60 font-bold text-[#be4646] min-w-[140px]">
                      Follow Up Type
                    </th>
                    <th className="p-3 text-center whitespace-nowrap bg-[#f4f5f7]/60 font-bold text-[#be4646] min-w-[140px]">
                      Assignee
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 bg-white border-l border-r border-b border-slate-200">
              {totalJobs === 0 ? (
                <tr>
                  <td colSpan={showFlaggedOnly ? 9 : 7} className="p-8 text-center text-slate-400 italic">
                    No jobs found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => (
                  <tr key={job.id} className="bg-white">
                    <td className="p-3 whitespace-nowrap">{job.dateCreated}</td>

                    {/* Job # with symbol removed */}
                    <td className="p-3 font-semibold text-[#be4646]">
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        {job.jobNumber}
                      </Link>
                    </td>

                    <td className="p-3 font-semibold text-[#be4646]">
                      <Link href={`/customers/${job.customerId || job.customerNumber || encodeURIComponent(job.customerName)}`} className="hover:underline">
                        {job.customerName}
                      </Link>
                    </td>

                    {/* Location Address: Customer name excluded, same font config */}
                    <td className="p-3">
                      <div className="text-slate-700 font-normal text-xs leading-normal">
                        <div>{job.locationAddress.street}</div>
                        {job.locationAddress.cityStateZip ? (
                          <div>{job.locationAddress.cityStateZip}</div>
                        ) : null}
                      </div>
                    </td>

                    {/* Job Type Badge with Canonical Matrix Colors */}
                    <td className="p-3">
                      <span
                        style={{ backgroundColor: getJobTypeBadgeColor(job.jobTypeBadge) }}
                        className="inline-block text-[9px] font-bold text-white px-1.5 py-0.5 rounded tracking-[0.025em] uppercase shadow-2xs"
                      >
                        {job.jobTypeBadge}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as any)}
                        className="text-xs font-normal px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="Opened">Opened</option>
                        <option value="Closed">Closed</option>
                        <option value="Abandoned">Abandoned</option>
                      </select>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenFlagModal(job)}
                        className="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title={job.isFlagged ? "Edit follow up flag" : "Add follow up flag"}
                      >
                        <Flag
                          className={`w-4 h-4 ${
                            job.isFlagged
                              ? 'text-red-600 fill-red-600'
                              : 'text-slate-300 hover:text-red-500'
                          }`}
                        />
                      </button>
                    </td>

                    {showFlaggedOnly && (
                      <>
                        <td className="p-3 text-center font-medium text-slate-700 border-l border-slate-200 whitespace-nowrap bg-slate-50/50 min-w-[140px]">
                          {job.followUpType || 'Need Quote/Autho'}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-800 whitespace-nowrap bg-slate-50/50 min-w-[140px]">
                          {job.assignee || 'Justin Dunlap'}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls Bar (20 jobs per page) */}
          <div className="px-4 py-3 bg-slate-50 border-l border-r border-b border-slate-200 rounded-b-lg flex items-center justify-between text-xs text-slate-600 ">
            <div>
              Showing <span className="font-semibold text-slate-800">{totalJobs === 0 ? 0 : Math.min(1 + (currentPage - 1) * pageSize, totalJobs)}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, totalJobs)}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalJobs.toLocaleString()}</span> jobs
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="font-semibold text-slate-800 px-1">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SHARED EDIT FOLLOW UP FLAG MODAL */}
      <EditFollowUpFlagModal
        job={editingFlagJob}
        isOpen={Boolean(editingFlagJob)}
        onClose={() => setEditingFlagJob(null)}
        onSave={async (updatedData) => {
          if (!editingFlagJob) return;
          const target = rawJobsList.find((j: any) => j.id === editingFlagJob.id || j.jobNumber === editingFlagJob.jobNumber);
          const isCompleted = updatedData.isFlagComplete;

          if (target) {
            await saveJob({
              ...target,
              isFlagged: !isCompleted,
              followUpFlag: !isCompleted ? 'Y' : 'N',
              followUpType: !isCompleted ? updatedData.followUpType : undefined,
              assignee: !isCompleted ? updatedData.assignee : undefined,
              dueDate: !isCompleted ? updatedData.dueDate : undefined,
              isFlagComplete: isCompleted,
            });
          }

          const flagDoc: CanonicalFollowUpFlag = {
            id: `flag-${editingFlagJob.id || editingFlagJob.jobNumber}`,
            jobId: editingFlagJob.id,
            jobNumber: parseInt(String(editingFlagJob.jobNumber).replace(/\D/g, ''), 10) || 0,
            customerId: editingFlagJob.customerId || '',
            customerName: editingFlagJob.customerName || '',
            followUpType: (updatedData.followUpType as any) || 'Need Quote/Autho',
            reason: updatedData.notes?.[0]?.text || '',
            assignedTo: updatedData.assignee || 'Justin Dunlap',
            dueDate: updatedData.dueDate || new Date().toISOString(),
            isComplete: isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : null,
            notes: (updatedData.notes || []).map((n) => ({
              id: n.id,
              author: n.authorName,
              text: n.text,
              timestamp: n.timestamp,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveFollowUp(flagDoc);

          refreshJobs();
          setEditingFlagJob(null);
        }}
        onRemoveFlag={async () => {
          if (!editingFlagJob) return;
          const target = rawJobsList.find((j: any) => j.id === editingFlagJob.id || j.jobNumber === editingFlagJob.jobNumber);
          if (target) {
            await saveJob({
              ...target,
              isFlagged: false,
              followUpFlag: 'N',
              followUpType: undefined,
              assignee: undefined,
              dueDate: undefined,
              isFlagComplete: true,
            });
          }

          const flagDoc: CanonicalFollowUpFlag = {
            id: `flag-${editingFlagJob.id || editingFlagJob.jobNumber}`,
            jobId: editingFlagJob.id,
            jobNumber: parseInt(String(editingFlagJob.jobNumber).replace(/\D/g, ''), 10) || 0,
            customerId: editingFlagJob.customerId || '',
            customerName: editingFlagJob.customerName || '',
            followUpType: (editingFlagJob.followUpType as any) || 'Need Quote/Autho',
            reason: '',
            assignedTo: editingFlagJob.assignee || 'Justin Dunlap',
            dueDate: editingFlagJob.dueDate || new Date().toISOString(),
            isComplete: true,
            completedAt: new Date().toISOString(),
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveFollowUp(flagDoc);

          refreshJobs();
          setEditingFlagJob(null);
        }}
      />
    </div>
  );
}

export default function WexJobListContainer() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Job List...</div>}>
      <JobListContent />
    </Suspense>
  );
}