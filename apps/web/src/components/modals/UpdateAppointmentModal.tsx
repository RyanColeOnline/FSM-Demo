'use client';

import React, {  useState, useEffect , useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Search,
  Check,
  ChevronLeft,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  FileText,
  Calendar,
  Layers,
  Wrench,
  ShieldCheck,
  History,
  Edit3,
  Trash2,
  Info,
  ChevronDown
} from 'lucide-react';
import { DatePicker, HierarchicalJobTypeSelector } from '@/components/ui';
import { TagGroup, TagList, Tag, Button as AriaButton } from 'react-aria-components';
import { CanonicalAuthorizedPerson } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { useAppointments } from '@/hooks/useAppointments';
import { APPOINTMENT_STATUSES, APPOINTMENT_FREQUENCIES, PAYMENT_TERMS } from '@/constants/globalChoices';

export interface CustomerEquipment {
  id: string;
  name: string;
  installDate?: string;
  mfg: string;
  serialNo: string;
  modelNo: string;
  status: string;
}

export interface CustomerMaintenancePlan {
  id: string;
  name: string;
  noPaymentPlan: boolean;
  expirationDate: string;
  contractPrice: string;
  annualPrice: string;
  appliedAmount: string;
}

export interface JobNoteItem {
  id: string;
  user: string;
  dateTime: string;
  noteText: string;
  isEditing?: boolean;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  type: 'Email' | 'SMS';
  value: string;
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface UpdateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    locations?: any[];
    balance?: string;
  } | null;
  editingJobId?: string | null;
  editingAppointmentId?: string | null;
  initialValues?: {
    id?: string;
    jobNumber?: string;
    jobType?: string;
    startTime?: string;
    endTime?: string;
    appointmentDate?: string;
    frequency?: string;
    primaryTech?: string;
    additionalTech?: string;
    additionalTechs?: string[];
    technicians?: string[];
    assignLater?: boolean;
    appointmentStatus?: 'Scheduled' | 'Missed' | 'In Progress' | 'Complete' | 'Incomplete' | 'Unscheduled' | string;
    appointmentConfirmation?: 'Not Confirmed' | 'Confirmed' | string;
    callNotes?: string;
    dispatchNotes?: string;
    scheduleMode?: 'schedule' | 'request';
    locationAddress?: string;
    equipmentIds?: string[];
    selectedEquipmentIds?: string[];
  };
  allTechsList?: string[];
  onSave?: (savedData: {
    editingJobId?: string | null;
    customer: any;
    primaryTech: string;
    additionalTech?: string;
    additionalTechs?: string[];
    technicians?: string[];
    appointmentDate: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    appointmentStatus: string;
    appointmentConfirmation: string;
    jobType: string;
    location: string;
    callNotes: string;
    dispatchNotes?: string;
    frequency: string;
    equipmentIds?: string[];
    selectedEquipment?: any[];
  }) => void;
  onUnschedule?: (targetId?: string) => void;
  onCancelAppointment?: (targetId?: string, cancelAllPast?: boolean) => void;
  onDeleteAppointment?: (targetId?: string) => void;
}

export const ALL_USERS_LIST = [
  'Andrew (Jr) Murphy',
  'Amanda Hoover',
  'Christian Nguyen',
  'Danny Pardo',
  'Ethan Mitchell',
  'Ethan Murphy',
  'Joe Colacino',
  'Jon Martin',
  'Justin Dunlap',
  'Justin Lung',
  'Matt Curtsinger',
  'Minor Cover',
  'Nancy Murphy',
  'Robert Hudson',
  'Wes Rykoskey',
];

export function getClosestCentralTimeSlot(): {
  start: { hour: string; min: string; ampm: 'AM' | 'PM' };
  end: { hour: string; min: string; ampm: 'AM' | 'PM' };
  dateStr: string;
} {
  const now = new Date();
  const cdtTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hStr, mStr] = cdtTimeStr.split(':');
  const curHour = parseInt(hStr, 10) || 0;
  const curMin = parseInt(mStr, 10) || 0;

  // Round up to closest next full hour (e.g. 12:35 -> 13:00 / 1pm; 10:04 -> 11:00 / 11am; 10:00 -> 10:00)
  const startHour24 = curMin > 0 ? (curHour + 1) % 24 : curHour;
  const endHour24 = (startHour24 + 1) % 24;

  const toSlot = (h24: number) => {
    const ampm: 'AM' | 'PM' = h24 >= 12 && h24 < 24 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour: String(h12), min: '00', ampm };
  };

  const cdtDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = cdtDateParts.find((p) => p.type === 'year')?.value || String(now.getFullYear());
  const month = cdtDateParts.find((p) => p.type === 'month')?.value || '01';
  const day = cdtDateParts.find((p) => p.type === 'day')?.value || '01';
  const dateStr = `${year}-${month}-${day}`;

  return {
    start: toSlot(startHour24),
    end: toSlot(endHour24),
    dateStr,
  };
}

export function getTechsForJobType(jobType?: string): string[] {
  return ALL_USERS_LIST;
}

export const defaultTechsList = ALL_USERS_LIST;

export function JobLocationDropdown({
  value,
  onChange,
  locations,
  onOpenQuickEdit,
  placeholder = 'Select location...',
  showEditButton = true,
}: {
  value: string;
  onChange: (loc: string) => void;
  locations: string[];
  onOpenQuickEdit?: () => void;
  placeholder?: string;
  showEditButton?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const displayList = locations.slice(0, 50);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] text-left cursor-pointer hover:border-slate-400"
        >
          <span className="truncate pr-2 font-medium">{value || placeholder}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-xl max-h-[256px] overflow-y-auto z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
            {displayList.length === 0 ? (
              <div className="p-3 text-slate-400 italic text-xs text-center">No locations available</div>
            ) : (
              displayList.map((loc) => (
                <div
                  key={loc}
                  onClick={() => {
                    onChange(loc);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    value === loc ? 'bg-sky-50 text-[#2d82b7] font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <span className="truncate pr-2">{loc}</span>
                  {value === loc && <Check className="w-3.5 h-3.5 text-[#2d82b7] shrink-0" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showEditButton && onOpenQuickEdit && (
        <button
          type="button"
          onClick={onOpenQuickEdit}
          className="p-1.5 text-[#be4646] hover:bg-slate-100 rounded border border-slate-200 cursor-pointer transition-colors shrink-0"
          title="Quick Edit Locations"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function UpdateAppointmentModal({
  isOpen,
  onClose,
  customer,
  editingJobId = null,
  editingAppointmentId,
  initialValues,
  allTechsList,
  onSave,
  onUnschedule,
  onCancelAppointment,
  onDeleteAppointment,
}: UpdateAppointmentModalProps) {
  const isNew = !editingAppointmentId && (!editingJobId || editingJobId === 'new') && !initialValues?.id;
  const { databaseMode, client } = useDatabaseMode();
  const [liveCustomer, setLiveCustomer] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveCustomer() {
      if (customer?.id && isOpen) {
        try {
          const c = await client.fetchCustomerById(customer.id, databaseMode);
          if (c && isMounted) {
            setLiveCustomer(c);
          }
        } catch (e) {
          console.error('Error fetching live customer in modal:', e);
        }
      }
    }
    loadLiveCustomer();
    return () => {
      isMounted = false;
    };
  }, [customer?.id, isOpen, databaseMode, client]);

  const formatAddrString = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') {
      let s = item.trim();
      s = s.replace(/^[^-]+?\s+-\s+/i, '');
      s = s.replace(/\bprimary location\b,?\s*/gi, '');
      s = s.replace(/^,\s*/, '');
      s = s.replace(/,\s*FL,\s*([0-9]{5}),\s*FL$/i, ', Fort Walton Beach, FL $1')
           .replace(/,\s*([A-Z]{2}),\s*([0-9]{5}),\s*\1$/i, ', $1 $2')
           .replace(/,\s*FL,\s*([0-9]{5})$/i, ', FL $1');
      return s.trim();
    }
    if (item && typeof item === 'object') {
      const st = (item.street || item.addr1 || '').trim();
      if (!st || st.toLowerCase() === 'primary location' || st.toLowerCase().includes('primary location')) {
        return '';
      }
      const a2 = (item.addressLine2 || item.addr2 || (item as any).street2 || '').trim();
      const ct = (item.city || '').trim();
      const stt = (item.state || 'FL').trim();
      const zp = (item.zipCode || item.zip || '').trim();
      
      let streetCombined = st;
      if (a2 && !st.includes(a2)) {
        streetCombined = `${st} ${a2}`.trim();
      }
      
      const parts: string[] = [];
      if (streetCombined) parts.push(streetCombined);
      if (ct && !streetCombined.includes(ct)) parts.push(ct);
      if (stt && !streetCombined.includes(stt)) {
        parts.push(`${stt}${zp ? ` ${zp}` : ''}`.trim());
      } else if (zp && !streetCombined.includes(zp)) {
        parts.push(zp);
      }
      return parts.join(', ');
    }
    return '';
  };

  const currentCustomer = useMemo(() => {
    const raw = liveCustomer || customer || {
      id: 'cust-pamela',
      name: 'Pamela Witt',
      phone: '(850) 555-0143',
      email: 'pamela.witt@example.com',
      address: '50 Hillcrest Dr, Shalimar, FL 32579',
      balance: '$0.00',
    };
    return {
      ...raw,
      address: formatAddrString(raw.address) || '',
      phone: typeof raw.phone === 'string' ? raw.phone : '(850) 555-0100',
      balance: typeof raw.balance === 'string' ? raw.balance : '$0.00',
    };
  }, [liveCustomer, customer]);

  // Sub-tabs & Mode state
  const [showQuickEditLocations, setShowQuickEditLocations] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationPage, setLocationPage] = useState(1);
  const LOCATIONS_PER_PAGE = 5;

  const [equipmentPage, setEquipmentPage] = useState(1);
  const EQUIPMENT_PER_PAGE = 5;

  const customerLocationsList = useMemo(() => {
    const list: string[] = [];

    const formatAddr = (item: any) => {
      if (!item) return '';
      if (typeof item === 'string') {
        let s = item.trim();
        s = s.replace(/^[^-]+?\s+-\s+/i, '');
        s = s.replace(/\bprimary location\b,?\s*/gi, '');
        s = s.replace(/^,\s*/, '');
        s = s.replace(/,\s*FL,\s*([0-9]{5}),\s*FL$/i, ', Fort Walton Beach, FL $1')
             .replace(/,\s*([A-Z]{2}),\s*([0-9]{5}),\s*\1$/i, ', $1 $2')
             .replace(/,\s*FL,\s*([0-9]{5})$/i, ', FL $1');
        return s.trim();
      }
      if (item && typeof item === 'object') {
        const st = (item.street || item.addr1 || '').trim();
        if (!st || st.toLowerCase() === 'primary location' || st.toLowerCase().includes('primary location')) {
          return '';
        }
        const a2 = (item.addressLine2 || item.addr2 || (item as any).street2 || '').trim();
        const ct = (item.city || '').trim();
        const stt = (item.state || 'FL').trim();
        const zp = (item.zipCode || item.zip || '').trim();
        
        let streetCombined = st;
        if (a2 && !st.includes(a2)) {
          streetCombined = `${st} ${a2}`.trim();
        }
        
        const parts: string[] = [];
        if (streetCombined) parts.push(streetCombined);
        if (ct && !streetCombined.includes(ct)) parts.push(ct);
        if (stt && !streetCombined.includes(stt)) {
          parts.push(`${stt}${zp ? ` ${zp}` : ''}`.trim());
        } else if (zp && !streetCombined.includes(zp)) {
          parts.push(zp);
        }
        return parts.join(', ');
      }
      return '';
    };

    const isBadAddress = (str: string) => {
      if (!str) return true;
      const lower = str.toLowerCase().trim();
      if (lower.includes('primary location') || lower === 'no street provided') return true;
      if (/^,\s*/.test(str)) return true;
      const parts = str.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length <= 2 && /^[A-Z]{2}\s+\d{5}$/i.test(parts[parts.length - 1])) {
        return true;
      }
      return false;
    };

    const rawLocs = (currentCustomer as any).locations;
    if (Array.isArray(rawLocs)) {
      rawLocs.forEach((locItem: any) => {
        const clean = formatAddr(locItem);
        if (clean && !isBadAddress(clean) && !list.includes(clean)) {
          list.push(clean);
        }
      });
    }

    if (currentCustomer.address) {
      const cleanPrimary = formatAddr(currentCustomer.address);
      if (cleanPrimary && !isBadAddress(cleanPrimary) && !list.includes(cleanPrimary)) {
        list.unshift(cleanPrimary);
      }
    }

    return list.length > 0 ? list : (currentCustomer.address ? [formatAddr(currentCustomer.address)].filter(s => !isBadAddress(s)) : []);
  }, [currentCustomer]);

  const filteredCustomerLocations = useMemo(() => {
    if (!locationSearchQuery.trim()) return customerLocationsList;
    const q = locationSearchQuery.toLowerCase().trim();
    return customerLocationsList.filter((loc) => loc.toLowerCase().includes(q));
  }, [customerLocationsList, locationSearchQuery]);

  const totalLocationPages = Math.ceil(filteredCustomerLocations.length / LOCATIONS_PER_PAGE) || 1;
  const paginatedCustomerLocations = useMemo(() => {
    const start = (locationPage - 1) * LOCATIONS_PER_PAGE;
    return filteredCustomerLocations.slice(start, start + LOCATIONS_PER_PAGE);
  }, [filteredCustomerLocations, locationPage]);

  const defaultSlot = useMemo(() => getClosestCentralTimeSlot(), []);

  const [bookingCallMode, setBookingCallMode] = useState<'call_only' | 'call_with_appt'>('call_with_appt');
  const [bookingSubTab, setBookingSubTab] = useState<'appointment' | 'notes' | 'balance' | 'maintenance' | 'equipment'>('appointment');
  const [bookingScheduleMode, setBookingScheduleMode] = useState<'schedule' | 'request'>('schedule');

  // Form Fields
  const [bookingDate, setBookingDate] = useState(defaultSlot.dateStr);
  const [bookingFrequency, setBookingFrequency] = useState('one time');
  const [bookingStartHour, setBookingStartHour] = useState(defaultSlot.start.hour);
  const [bookingStartMin, setBookingStartMin] = useState(defaultSlot.start.min);
  const [bookingStartAmpm, setBookingStartAmpm] = useState<'AM' | 'PM'>(defaultSlot.start.ampm);
  const [bookingEndHour, setBookingEndHour] = useState(defaultSlot.end.hour);
  const [bookingEndMin, setBookingEndMin] = useState(defaultSlot.end.min);
  const [bookingEndAmpm, setBookingEndAmpm] = useState<'AM' | 'PM'>(defaultSlot.end.ampm);

function extractAdditionalTechs(initialValues?: UpdateAppointmentModalProps['initialValues']): string[] {
  if (!initialValues) return [];
  if (Array.isArray(initialValues.additionalTechs) && initialValues.additionalTechs.length > 0) {
    return initialValues.additionalTechs.filter(Boolean);
  }
  if (Array.isArray(initialValues.technicians) && initialValues.technicians.length > 0) {
    const p = initialValues.primaryTech || '';
    return initialValues.technicians.filter((t) => t && t !== p);
  }
  if (initialValues.additionalTech && typeof initialValues.additionalTech === 'string') {
    return initialValues.additionalTech.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

  const [bookingPrimaryTech, setBookingPrimaryTech] = useState('Justin Lung');
  const [bookingAssignLater, setBookingAssignLater] = useState(false);
  const [bookingAdditionalTechs, setBookingAdditionalTechs] = useState<string[]>(() => extractAdditionalTechs(initialValues));
  const bookingAdditionalTech = bookingAdditionalTechs.join(', ');
  const [bookingSelectedJob, setBookingSelectedJob] = useState(() => {
    if (initialValues?.jobNumber) {
      const digits = String(initialValues.jobNumber).replace(/^#|^Job\s*/i, '').trim();
      return `#${digits}`;
    }
    return 'New Job';
  });
  const [bookingJobType, setBookingJobType] = useState('');
  const [bookingLocation, setBookingLocation] = useState(currentCustomer.address);

  const [bookingApptStatus, setBookingApptStatus] = useState<'Scheduled' | 'Missed' | 'In Progress' | 'Complete' | 'Incomplete'>('Scheduled');
  const [bookingApptConfirmed, setBookingApptConfirmed] = useState<'Not Confirmed' | 'Confirmed'>('Not Confirmed');
  const [showNoticesPopover, setShowNoticesPopover] = useState(false);

  // Service Request Mode Fields
  const [reqDurationHour, setReqDurationHour] = useState('2 hours');
  const [reqDurationMin, setReqDurationMin] = useState('00 min');
  const [reqMinTechLevel, setReqMinTechLevel] = useState('Level 1');

  // New Call section state
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [newCallDayNum, setNewCallDayNum] = useState(18);
  const [newCallHourInput, setNewCallHourInput] = useState(defaultSlot.start.hour.padStart(2, '0'));
  const [newCallMinInput, setNewCallMinInput] = useState(defaultSlot.start.min);
  const [newCallAmpmInput, setNewCallAmpmInput] = useState<'AM' | 'PM'>(defaultSlot.start.ampm);
  const [newCallDateTimeStr, setNewCallDateTimeStr] = useState('');
  const [bookingPhoneNumber, setBookingPhoneNumber] = useState('');
  const [bookingCallNotes, setBookingCallNotes] = useState('');
  const [newCallContactPerson, setNewCallContactPerson] = useState('');
  const [bookingCallType, setBookingCallType] = useState('Inbound');

  // Primary Appointment Contact Inline State
  const [showPrimaryApptContact, setShowPrimaryApptContact] = useState(false);
  const [primaryApptContactPerson, setPrimaryApptContactPerson] = useState('');
  const [primaryApptContactType, setPrimaryApptContactType] = useState('SMS');
  const [primaryApptContactValue, setPrimaryApptContactValue] = useState('');

  // Appointment Notifications Toggles & Recipients
  const [notifyScheduled, setNotifyScheduled] = useState(false);
  const [notify1Week, setNotify1Week] = useState(false);
  const [notify1Day, setNotify1Day] = useState(false);
  const [notifyEnRoute, setNotifyEnRoute] = useState(true);

  const [recipientsList, setRecipientsList] = useState<NotificationRecipient[]>([]);

  // Job Calls & Notes List
  const [jobNotesList, setJobNotesList] = useState<JobNoteItem[]>([]);
  const [otherLocationNotesList, setOtherLocationNotesList] = useState<JobNoteItem[]>([]);

  // Equipment List
  const [mockLocationEquipment, setMockLocationEquipment] = useState<CustomerEquipment[]>([]);

  const totalEquipmentPages = Math.ceil(mockLocationEquipment.length / EQUIPMENT_PER_PAGE) || 1;
  const paginatedEquipment = useMemo(() => {
    const start = (equipmentPage - 1) * EQUIPMENT_PER_PAGE;
    return mockLocationEquipment.slice(start, start + EQUIPMENT_PER_PAGE);
  }, [mockLocationEquipment, equipmentPage]);

  // Maintenance Plans
  const [mockCustomerMaintenancePlans, setMockCustomerMaintenancePlans] = useState<CustomerMaintenancePlan[]>([]);

// Helper to format install date nicely as MM/DD/YYYY
function formatInstallDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (!trimmed) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  try {
    const cleanStr = trimmed.replace(/\s+at\s+/i, ' ');
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    }
  } catch (err) {
    // fallback
  }
  return trimmed;
}

  // Live Equipment & Maintenance Plans Data Fetching
  useEffect(() => {
    let isMounted = true;
    async function loadCustomerEquipmentAndPlans() {
      if (!isOpen || !currentCustomer?.id) {
        setMockLocationEquipment([]);
        setMockCustomerMaintenancePlans([]);
        return;
      }

      try {
        const custId = currentCustomer.id;
        const [eqList, mpList] = await Promise.all([
          client.fetchEquipment(custId, undefined, currentCustomer.name, databaseMode),
          client.fetchMaintenancePlans(custId, databaseMode),
        ]);

        if (isMounted) {
          let filteredEq = eqList;
          if (bookingLocation && bookingLocation.trim()) {
            const bLoc = bookingLocation.toLowerCase();
            const bStreet = bLoc.split(',')[0].replace(/^(best beach getaways|southern vacation rentals|beachwalk vacation rentals|360 blue)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').trim();
            const tokens = bStreet.split(/\s+/).filter((t: string) => t.length > 2);

            filteredEq = eqList.filter((e: any) => {
              const eLoc = (e.locationAddress || e.locationStreet || '').toLowerCase();
              if (!eLoc) return false;
              if (eLoc.includes(bStreet) || bLoc.includes(eLoc)) return true;
              return tokens.length > 0 && tokens.some((t: string) => eLoc.includes(t));
            });
          }

          setMockLocationEquipment(
            filteredEq.map((e: any) => ({
              id: e.id,
              name: e.equipmentName || e.name || e.equipmentType || e.systemType || 'Equipment',
              installDate: formatInstallDate(e.installationDate || e.installDate || e.installedOn),
              mfg: e.manufacturer || e.mfg || '',
              serialNo: e.serialNumber || e.serialNo || '',
              modelNo: e.modelNumber || e.modelNo || '',
              status: e.equipmentStatus || e.status || (e.isArchived ? 'Inactive' : 'Active'),
            }))
          );

          let filteredMp = mpList;
          if (bookingLocation && bookingLocation.trim()) {
            const bLoc = bookingLocation.toLowerCase();
            const bStreet = bLoc.split(',')[0].replace(/^(best beach getaways|southern vacation rentals|beachwalk vacation rentals|360 blue)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').trim();
            const tokens = bStreet.split(/\s+/).filter((t: string) => t.length > 2);

            filteredMp = mpList.filter((mp: any) => {
              const mpLocStr = (
                mp.locationAddress ||
                (mp.location && (mp.location.street || mp.location.cityStateZip)) ||
                mp.address ||
                ''
              ).toLowerCase();
              if (!mpLocStr) return false;
              if (mpLocStr.includes(bStreet) || bLoc.includes(mpLocStr)) return true;
              return tokens.length > 0 && tokens.some((t: string) => mpLocStr.includes(t));
            });
          }

          setMockCustomerMaintenancePlans(
            filteredMp.map((mp) => {
              const parseMoney = (val: any) => {
                if (typeof val === 'number') return `$${val.toFixed(2)}`;
                if (typeof val === 'string') {
                  const cleaned = val.replace(/[^\d.]/g, '');
                  const num = parseFloat(cleaned);
                  return !isNaN(num) ? `$${num.toFixed(2)}` : val;
                }
                return '$0.00';
              };
              return {
                id: mp.id,
                name: mp.name,
                noPaymentPlan: !mp.billingFrequency || mp.billingFrequency === 'Annual',
                expirationDate: mp.expiresDate || mp.expirationDate || '',
                contractPrice: parseMoney(mp.contractPrice || mp.contractTotal || mp.annualPrice || 0),
                annualPrice: parseMoney(mp.annualPrice || 0),
                appliedAmount: parseMoney(mp.paymentsApplied || '$0.00'),
              };
            })
          );
        }

        if (currentCustomer?.id) {
          const authList = await client.fetchAuthorizedPersons(currentCustomer.id, databaseMode);
          if (isMounted && authList && authList.length > 0) {
            setFetchedAuthPersons(authList);
          }
        }
      } catch (err) {
        console.error('Error fetching live customer equipment & maintenance in modal:', err);
      }
    }

    loadCustomerEquipmentAndPlans();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentCustomer?.id, currentCustomer?.name, bookingLocation, databaseMode, client]);

  const [copiedEquipmentKey, setCopiedEquipmentKey] = useState<string | null>(null);
  const [fetchedAuthPersons, setFetchedAuthPersons] = useState<CanonicalAuthorizedPerson[]>([]);

  const rawAuthPersons = (currentCustomer as any)?.authorizedPersons && (currentCustomer as any).authorizedPersons.length > 0
    ? (currentCustomer as any).authorizedPersons
    : fetchedAuthPersons;

  const customerAuthorizedPersons: AuthorizedPerson[] = (rawAuthPersons && rawAuthPersons.length > 0)
    ? rawAuthPersons.map((ap: any) => ({
        id: ap.id,
        name: ap.fullName || ap.name || `${ap.firstName || ''} ${ap.lastName || ''}`.trim(),
        relationship: ap.relationship || ap.positionLabel || 'Authorized Person',
        phone: ap.phone || ap.mobilePhone || '',
        email: ap.email || ''
      }))
    : [];

  // Helper parser for 12h time
  const parseTimeStrToParts = (timeStr: string) => {
    if (!timeStr) return { hour: '2', min: '00', ampm: 'PM' as 'AM' | 'PM' };
    let ampm: 'AM' | 'PM' = 'PM';
    let clean = timeStr.trim().toLowerCase();
    if (clean.includes('pm')) {
      ampm = 'PM';
      clean = clean.replace('pm', '').trim();
    } else if (clean.includes('am')) {
      ampm = 'AM';
      clean = clean.replace('am', '').trim();
    }
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10) || 2;
    const m = parts[1] ? parts[1].slice(0, 2) : '00';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return { hour: String(h), min: m, ampm };
  };

  // State for Cancel / Unschedule / Delete Secondary Modal
  const [showCancelUnscheduleModal, setShowCancelUnscheduleModal] = useState(false);
  const [selectedUnscheduleOption, setSelectedUnscheduleOption] = useState<'Unschedule' | 'Cancel' | 'Delete'>('Unschedule');
  const [cancelAllPastAppts, setCancelAllPastAppts] = useState(false);

  const { saveAppointment: saveLiveAppointment, deleteAppointment: deleteLiveAppointment } = useAppointments();

  const handleExecuteUnscheduleCancelDelete = async () => {
    const targetId = editingAppointmentId || initialValues?.id || (editingJobId ? (editingJobId.startsWith('job-') ? `appt-${editingJobId.replace('job-', '')}` : `appt-${editingJobId}`) : null);

    if (selectedUnscheduleOption === 'Unschedule') {
      if (onUnschedule) {
        onUnschedule(targetId || undefined);
      } else if (targetId && saveLiveAppointment) {
        await saveLiveAppointment({
          id: targetId,
          status: 'Unscheduled',
          isScheduled: false,
          assignedTech: null,
          assignedTechId: null,
          jobType: bookingJobType || 'HVAC service',
          serviceNotes: bookingCallNotes || '',
        } as any);
      }
    } else if (selectedUnscheduleOption === 'Cancel') {
      if (onCancelAppointment) {
        onCancelAppointment(targetId || undefined, cancelAllPastAppts);
      } else if (targetId && saveLiveAppointment) {
        await saveLiveAppointment({
          id: targetId,
          status: 'Cancelled',
          isScheduled: false,
        } as any);
      }
    } else if (selectedUnscheduleOption === 'Delete') {
      if (onDeleteAppointment) {
        onDeleteAppointment(targetId || undefined);
      } else if (targetId && deleteLiveAppointment) {
        await deleteLiveAppointment(targetId);
      }
    }
    setShowCancelUnscheduleModal(false);
    onClose();
  };

  const dynamicTechsList = React.useMemo(() => {
    if (allTechsList && allTechsList.length > 0) return allTechsList;
    return getTechsForJobType(bookingJobType);
  }, [allTechsList, bookingJobType]);

  const initialValuesKey = JSON.stringify(initialValues || {});
  const customerKey = JSON.stringify(customer || {});

  useEffect(() => {
    if (!isOpen) return;

    const isNew = !editingAppointmentId && (!editingJobId || editingJobId === 'new') && !initialValues?.id;

    if (isNew) {
      const dynamicSlot = getClosestCentralTimeSlot();
      if (initialValues?.jobNumber) {
        const digits = String(initialValues.jobNumber).replace(/^#|^Job\s*/i, '').trim();
        setBookingSelectedJob(`#${digits}`);
      } else {
        setBookingSelectedJob('New Job');
      }
      setJobNotesList([]);
      setOtherLocationNotesList([]);
      setBookingCallNotes(initialValues?.callNotes || '');
      setBookingPhoneNumber('');
      setNewCallContactPerson('');
      setPrimaryApptContactPerson('');
      setPrimaryApptContactValue('');
      setRecipientsList([]);
      setNotifyScheduled(false);
      setNotify1Week(false);
      setNotify1Day(false);
      setNotifyEnRoute(true);
      setBookingJobType(initialValues?.jobType || '');
      setBookingScheduleMode(initialValues?.scheduleMode || 'schedule');
      setBookingApptStatus((initialValues?.appointmentStatus as any) || (initialValues?.scheduleMode === 'request' ? 'Unscheduled' : 'Scheduled'));
      setBookingApptConfirmed((initialValues?.appointmentConfirmation as any) || 'Not Confirmed');
      setBookingPrimaryTech(initialValues?.primaryTech || 'Justin Lung');
      setBookingAdditionalTechs(extractAdditionalTechs(initialValues));
      setBookingAssignLater(initialValues?.assignLater || initialValues?.scheduleMode === 'request');
      setBookingDate(initialValues?.appointmentDate || dynamicSlot.dateStr);
      if (initialValues?.startTime) {
        const parsed = parseTimeStrToParts(initialValues.startTime);
        setBookingStartHour(parsed.hour);
        setBookingStartMin(parsed.min);
        setBookingStartAmpm(parsed.ampm);
      } else {
        setBookingStartHour(dynamicSlot.start.hour);
        setBookingStartMin(dynamicSlot.start.min);
        setBookingStartAmpm(dynamicSlot.start.ampm);
      }
      if (initialValues?.endTime) {
        const parsed = parseTimeStrToParts(initialValues.endTime);
        setBookingEndHour(parsed.hour);
        setBookingEndMin(parsed.min);
        setBookingEndAmpm(parsed.ampm);
      } else {
        setBookingEndHour(dynamicSlot.end.hour);
        setBookingEndMin(dynamicSlot.end.min);
        setBookingEndAmpm(dynamicSlot.end.ampm);
      }
      setNewCallHourInput(dynamicSlot.start.hour.padStart(2, '0'));
      setNewCallMinInput(dynamicSlot.start.min);
      setNewCallAmpmInput(dynamicSlot.start.ampm);
      setBookingLocation(initialValues?.locationAddress || customerLocationsList[0] || currentCustomer.address || '');
    } else {
      if (initialValues) {
        if (initialValues.appointmentDate) setBookingDate(initialValues.appointmentDate);
        if (initialValues.frequency) setBookingFrequency(initialValues.frequency);
        if (initialValues.primaryTech) setBookingPrimaryTech(initialValues.primaryTech);
        if (initialValues.additionalTech !== undefined || initialValues.additionalTechs !== undefined || initialValues.technicians !== undefined) {
          setBookingAdditionalTechs(extractAdditionalTechs(initialValues));
        }
        if (initialValues.assignLater !== undefined) setBookingAssignLater(initialValues.assignLater);
        if (initialValues.startTime) {
          const parsed = parseTimeStrToParts(initialValues.startTime);
          setBookingStartHour(parsed.hour);
          setBookingStartMin(parsed.min);
          setBookingStartAmpm(parsed.ampm);
        }
        if (initialValues.endTime) {
          const parsed = parseTimeStrToParts(initialValues.endTime);
          setBookingEndHour(parsed.hour);
          setBookingEndMin(parsed.min);
          setBookingEndAmpm(parsed.ampm);
        }
        if (initialValues.appointmentStatus) setBookingApptStatus(initialValues.appointmentStatus as any);
        if (initialValues.appointmentConfirmation) setBookingApptConfirmed(initialValues.appointmentConfirmation as any);
        if (initialValues.jobType) setBookingJobType(initialValues.jobType);
        if (initialValues.callNotes) setBookingCallNotes(initialValues.callNotes);
        if (initialValues.scheduleMode) {
          setBookingScheduleMode(initialValues.scheduleMode);
        } else if (
          (initialValues as any).isScheduled === false || 
          (initialValues.appointmentStatus as any) === 'Unscheduled' ||
          (initialValues as any).status === 'Unscheduled'
        ) {
          setBookingScheduleMode('request');
        } else {
          setBookingScheduleMode('schedule');
        }
        if (initialValues.jobNumber) {
          const digits = String(initialValues.jobNumber).replace(/^#|^Job\s*/i, '').trim();
          setBookingSelectedJob(`#${digits}`);
        } else if (editingJobId && editingJobId !== 'new') {
          const digits = editingJobId.replace(/^(job|appt|sr)-/i, '').trim();
          setBookingSelectedJob(`#${digits}`);
        } else {
          setBookingSelectedJob('New Job');
        }
      }
    }

    if ((initialValues as any)?.locationAddress) {
      setBookingLocation(formatAddrString((initialValues as any).locationAddress));
    } else if (customerLocationsList.length > 0) {
      setBookingLocation(customerLocationsList[0]);
    } else if ((customer as any)?.address) {
      setBookingLocation(formatAddrString((customer as any).address));
    }
    if (customer?.phone) {
      setBookingPhoneNumber(customer.phone);
    }
    if (customer?.name) {
      setNewCallContactPerson(customer.name);
    }
  }, [isOpen, initialValuesKey, customerKey, editingJobId, editingAppointmentId]);

  if (!isOpen) return null;

  const updateNewCallDateTime = (day: number, h: string, m: string, ap: 'AM' | 'PM') => {
    setNewCallDayNum(day);
    setNewCallHourInput(h);
    setNewCallMinInput(m);
    setNewCallAmpmInput(ap);
    const dayStr = String(day).padStart(2, '0');
    setNewCallDateTimeStr(`08/${dayStr}/2026 ${h}:${m} ${ap}`);
  };

  const formatPhoneNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleCopyEquipmentValue = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEquipmentKey(key);
    setTimeout(() => setCopiedEquipmentKey(null), 2000);
  };

  const handleAddRecipient = () => {
    const newId = `rec-${Date.now()}`;
    setRecipientsList((prev) => [
      ...prev,
      { id: newId, name: currentCustomer.name, type: 'SMS', value: currentCustomer.phone },
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipientsList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRecipientPersonChange = (id: string, name: string) => {
    const person = customerAuthorizedPersons.find((p) => p.name === name);
    setRecipientsList((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          let val = '';
          if (person) {
            val = r.type === 'SMS' ? (person.phone || '') : (person.email || '');
          } else {
            val = r.type === 'SMS' ? currentCustomer.phone : (currentCustomer.email || '');
          }
          return { ...r, name, value: val };
        }
        return r;
      })
    );
  };

  const handleRecipientTypeChange = (id: string, type: string) => {
    const selectedType = type as 'Email' | 'SMS';
    setRecipientsList((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const person = customerAuthorizedPersons.find((p) => p.name === r.name);
          let val = '';
          if (person) {
            val = selectedType === 'SMS' ? (person.phone || '') : (person.email || '');
          } else {
            val = selectedType === 'SMS' ? currentCustomer.phone : (currentCustomer.email || '');
          }
          return { ...r, type: selectedType, value: val };
        }
        return r;
      })
    );
  };

  const handleSaveModal = () => {
    const parseTimeTo24h = (h: string, m: string, ampm: string) => {
      let hr = parseInt(h, 10);
      if (ampm === 'PM' && hr < 12) hr += 12;
      if (ampm === 'AM' && hr === 12) hr = 0;
      return hr + parseInt(m, 10) / 60;
    };

    const startFloat = parseTimeTo24h(bookingStartHour, bookingStartMin, bookingStartAmpm);
    const endFloat = parseTimeTo24h(bookingEndHour, bookingEndMin, bookingEndAmpm);
    const durHours = Math.max(0.5, endFloat - startFloat);

    const format24hTimeStr = (val: number) => {
      const hr = Math.floor(val);
      const mn = Math.round((val % 1) * 60);
      return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
    };

    const targetTech = bookingAssignLater ? '' : bookingPrimaryTech;

    // Persist Call & Note directly to Firestore
    (async () => {
      try {
        const parsedJNum = parseInt(String(initialValues?.jobNumber || editingJobId || '0').replace(/\D/g, ''), 10) || null;
        const jNum = parsedJNum || Math.floor(100000 + Math.random() * 900000);
        const isServiceRequest = bookingScheduleMode === 'request';
        const reqHours = parseFloat(reqDurationHour || '1') + (parseFloat(reqDurationMin || '0') / 60);

        // 1. Save / Update Appointment in Firestore appointments collection
        const apptId = editingAppointmentId || initialValues?.id || (isServiceRequest ? `sr-${Date.now()}` : `appt-${Date.now()}`);
        const additionalTechStr = bookingAdditionalTechs.join(', ');
        const allAssignedTechs = [targetTech, ...bookingAdditionalTechs].filter(Boolean);
        const liveApptRecord: any = {
          id: apptId,
          jobNumber: jNum,
          customerId: currentCustomer.id || '',
          customerName: currentCustomer.name || 'Customer',
          jobType: bookingJobType || 'HVAC service',
          assignedTech: isServiceRequest ? null : targetTech,
          additionalTech: !isServiceRequest && bookingAdditionalTechs.length > 0 ? additionalTechStr : null,
          additionalTechs: isServiceRequest ? [] : bookingAdditionalTechs,
          technicians: isServiceRequest ? [] : allAssignedTechs,
          appointmentDate: isServiceRequest ? null : bookingDate,
          startTime: isServiceRequest ? null : `${bookingStartHour}:${bookingStartMin} ${bookingStartAmpm}`,
          endTime: isServiceRequest ? null : `${bookingEndHour}:${bookingEndMin} ${bookingEndAmpm}`,
          durationHours: isServiceRequest ? reqHours : durHours,
          expectedDurationHours: isServiceRequest ? reqHours : durHours,
          minSkillLevel: isServiceRequest ? (parseInt(String(reqMinTechLevel).replace(/\D/g, ''), 10) || 1) : undefined,
          dateTime: isServiceRequest ? `${bookingDate}T08:00:00Z` : `${bookingDate}T${format24hTimeStr(startFloat)}:00Z`,
          status: isServiceRequest ? 'Unscheduled' : (bookingApptStatus || 'Assigned'),
          isScheduled: !isServiceRequest,
          scheduleMode: bookingScheduleMode,
          isServiceRequest: isServiceRequest,
          serviceNotes: bookingCallNotes || '',
          locationAddress: bookingLocation || (typeof currentCustomer.address === 'string' ? currentCustomer.address : '') || '',
          updatedAt: new Date().toISOString(),
        };
        await client.saveAppointment(liveApptRecord, databaseMode);

        // 2. Save Job to Jobs collection (sandbox_jobs)
        const liveJob: any = {
          id: `job-${jNum}`,
          jobNumber: String(jNum),
          customerId: currentCustomer.id || '',
          customerNumber: (currentCustomer as any).customerNumber || currentCustomer.id || '',
          customerName: currentCustomer.name || 'Customer',
          jobType: bookingJobType || 'HVAC service',
          status: 'Opened',
          locationAddress: bookingLocation || (typeof currentCustomer.address === 'string' ? currentCustomer.address : ''),
          jobCreationDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          jobDescription: bookingCallNotes || (isServiceRequest ? 'Service Request' : 'Scheduled appointment.'),
          assignedTech: isServiceRequest ? null : (targetTech || null),
          invoicesTotal: 0,
          balance: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await client.saveJob(liveJob, databaseMode);

        // 3. Find and EDIT existing Call in Firestore if one exists for this appointment or job
        let existingCallId: string | null = null;
        try {
          const targetApptId = editingAppointmentId || initialValues?.id;
          const existingCalls = await client.fetchCalls(databaseMode);
          const matched = existingCalls.find((c) => 
            (targetApptId && c.appointmentId === targetApptId) ||
            (jNum && (c.jobNumber === jNum || String(c.jobNumber) === String(jNum)))
          );
          if (matched) existingCallId = matched.id;
        } catch (err) {}

        const newCallRecord: any = {
          id: existingCallId || `call-${Date.now()}`,
          customerId: currentCustomer.id || '',
          customerName: currentCustomer.name || 'Customer',
          contactName: newCallContactPerson || currentCustomer.name || '',
          phoneCid: bookingPhoneNumber || currentCustomer.phone || null,
          callDate: newCallDateTimeStr || new Date().toISOString(),
          callType: (bookingCallType as any) || 'Inbound',
          activityType: 'Call',
          relatedLocation: bookingLocation || (typeof currentCustomer.address === 'string' ? currentCustomer.address : null),
          notes: bookingCallNotes || (isServiceRequest ? 'Service request logged.' : 'Appointment booked.'),
          user: 'Ryan Cole',
          jobNumber: jNum,
          appointmentId: liveApptRecord.id,
          createdAt: existingCallId ? undefined : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await client.saveCall(newCallRecord, databaseMode);

        // 2. Save Note to Notes collection (Job Calls & Notes)
        if (bookingCallNotes && bookingCallNotes.trim()) {
          await client.saveNote({
            id: `note-${Date.now()}`,
            customerId: currentCustomer.id || '',
            jobId: editingJobId || (jNum ? `job-${jNum}` : 'job-1'),
            jobNumber: jNum || undefined,
            authorId: 'usr-staff',
            authorRole: 'Staff',
            authorName: 'Ethan Mitchell',
            title: 'Appointment Call Note',
            content: bookingCallNotes.trim(),
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, databaseMode);
        }
      } catch (err) {
        console.error('Error saving call/note from modal to Firestore:', err);
      }
    })();

    if (onSave) {
      const additionalTechStr = bookingAdditionalTechs.join(', ');
      const allAssignedTechs = [targetTech, ...bookingAdditionalTechs].filter(Boolean);
      onSave({
        editingJobId,
        customer: currentCustomer,
        primaryTech: targetTech,
        additionalTech: additionalTechStr,
        additionalTechs: bookingAdditionalTechs,
        technicians: allAssignedTechs,
        appointmentDate: bookingDate,
        startTime: format24hTimeStr(startFloat),
        endTime: format24hTimeStr(endFloat),
        durationHours: durHours,
        appointmentStatus: bookingApptStatus,
        appointmentConfirmation: bookingApptConfirmed,
        jobType: bookingJobType,
        location: bookingLocation,
        callNotes: bookingCallNotes,
        frequency: bookingFrequency,
      });
    }

    onClose();
  };

  // Warning System logic
  const parseFloat24 = (h: string, m: string, ampm: string) => {
    let hr = parseInt(h, 10);
    if (ampm === 'PM' && hr < 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;
    return hr + parseInt(m, 10) / 60;
  };
  const startVal = parseFloat24(bookingStartHour, bookingStartMin, bookingStartAmpm);
  const endVal = parseFloat24(bookingEndHour, bookingEndMin, bookingEndAmpm);
  const isOutsideHours = startVal < 8.0 || endVal > 17.0 || startVal >= 17.0;

  let dayOfWeek = 2; // Default Tuesday
  if (bookingDate) {
    const parts = bookingDate.split('-').map(Number);
    if (parts.length === 3) {
      dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    }
  }
  const isOffDuty = isOutsideHours || dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-5 p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans max-h-[92vh] flex flex-col">
        {/* ================= 1. STATIONARY FIXED MODAL HEADER ================= */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-slate-800">
            {!isNew
              ? (bookingScheduleMode === 'request' ? 'Update Service Request' : 'Update Appointment')
              : bookingCallMode === 'call_only'
              ? 'Log Call Only'
              : bookingScheduleMode === 'request'
              ? 'New Service Request'
              : 'New Appointment'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


            {/* Top Action Bar (Hidden when editing existing appointment) */}
            {!editingJobId && (
              <div className="bg-slate-50 border-b border-slate-200 py-1.5 shrink-0">
                <div className="w-[85%] mx-auto grid grid-cols-2 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setBookingCallMode('call_only')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                      bookingCallMode === 'call_only'
                        ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Log Call Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingCallMode('call_with_appt')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                      bookingCallMode === 'call_with_appt'
                        ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Log Call with Appointment
                  </button>
                </div>
              </div>
            )}

            {/* Customer Banner Header Box */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-200 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/customers/${currentCustomer.id}`}
                      className="font-bold text-[#be4646] text-sm hover:underline cursor-pointer"
                    >
                      {currentCustomer.name}
                    </Link>
                  </div>
                  <div className="text-[11px] text-slate-600 space-x-3">
                    <span>H: N/A</span>
                    <span>M: {currentCustomer.phone.replace(/[^0-9()-]/g, '')}</span>
                    <span>Email: {currentCustomer.email || 'pamela.witt@example.com'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>Total Customer Balance: <span className="font-bold text-slate-900">{currentCustomer.balance || '$0.00'}</span></span>
                  <span className="text-slate-400 cursor-help" title="This includes all unpaid invoices, in addition to, payments and credits not applied to invoices.">ⓘ</span>
                </div>
              </div>
            </div>

            {/* MODAL BODY CONTENT */}
            {bookingCallMode === 'call_only' ? (
              /* TAB 1: LOG CALL ONLY VIEW (Type removed, spacious 3-col layout) */
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 max-h-[60vh] font-sans">
                <div className="grid grid-cols-3 gap-3">
                  {/* Field 1: Date / Time * with React Aria DatePicker */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Date / Time <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="w-[125px] shrink-0">
                        <DatePicker
                          value={bookingDate}
                          onChange={(d) => {
                            setBookingDate(d);
                            setNewCallDateTimeStr(`${d} ${newCallHourInput}:${newCallMinInput} ${newCallAmpmInput}`);
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-800 shrink-0">
                        <input
                          type="text"
                          value={newCallHourInput}
                          onChange={(e) => {
                            setNewCallHourInput(e.target.value);
                            setNewCallDateTimeStr(`${bookingDate} ${e.target.value}:${newCallMinInput} ${newCallAmpmInput}`);
                          }}
                          className="w-5 text-center font-semibold focus:outline-none"
                          maxLength={2}
                        />
                        <span>:</span>
                        <input
                          type="text"
                          value={newCallMinInput}
                          onChange={(e) => {
                            setNewCallMinInput(e.target.value);
                            setNewCallDateTimeStr(`${bookingDate} ${newCallHourInput}:${e.target.value} ${newCallAmpmInput}`);
                          }}
                          className="w-5 text-center font-semibold focus:outline-none"
                          maxLength={2}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextAp = newCallAmpmInput === 'AM' ? 'PM' : 'AM';
                            setNewCallAmpmInput(nextAp);
                            setNewCallDateTimeStr(`${bookingDate} ${newCallHourInput}:${newCallMinInput} ${nextAp}`);
                          }}
                          className="font-bold text-[10px] text-slate-600 hover:text-slate-900 ml-0.5 px-1 py-0.5 rounded bg-slate-100 cursor-pointer"
                        >
                          {newCallAmpmInput}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Field 2: Phone Number */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      value={bookingPhoneNumber}
                      onChange={(e) => setBookingPhoneNumber(formatPhoneNumber(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    />
                  </div>

                  {/* Field 3: Contact Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Contact</label>
                    <select
                      value={newCallContactPerson || currentCustomer.name}
                      onChange={(e) => setNewCallContactPerson(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      <option value={currentCustomer.name}>{currentCustomer.name}</option>
                      {customerAuthorizedPersons.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}{p.relationship ? ` (${p.relationship})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Call Type</label>
                    <select
                      value={bookingCallType}
                      onChange={(e) => setBookingCallType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    >
                      <option value="Inbound">Inbound</option>
                      <option value="Outbound">Outbound</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Related Location(s) <span className="text-slate-400 cursor-help" title="Select location for call log">ⓘ</span>
                    </label>
                    <JobLocationDropdown
                      value={bookingLocation}
                      onChange={(loc) => setBookingLocation(loc)}
                      locations={customerLocationsList}
                      showEditButton={false}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={4}
                    value={bookingCallNotes}
                    onChange={(e) => setBookingCallNotes(e.target.value)}
                    placeholder="Enter call notes..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                  />
                </div>

                <div className="px-1 py-2.5 border-t border-slate-200 flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const newCallRecord: any = {
                          id: `call-${Date.now()}`,
                          customerId: currentCustomer.id || '',
                          customerName: currentCustomer.name || 'Customer',
                          contactName: newCallContactPerson || currentCustomer.name || '',
                          phoneCid: bookingPhoneNumber || currentCustomer.phone || null,
                          callDate: newCallDateTimeStr || `${bookingDate} ${newCallHourInput}:${newCallMinInput} ${newCallAmpmInput}`,
                          callType: bookingCallType || 'Inbound',
                          activityType: 'Call',
                          relatedLocation: bookingLocation || (typeof currentCustomer.address === 'string' ? currentCustomer.address : formatAddrString(currentCustomer.address)) || null,
                          notes: bookingCallNotes || '',
                          user: 'Ryan Cole',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        await client.saveCall(newCallRecord, databaseMode);
                        if (onSave) onSave({ call: newCallRecord } as any);
                      } catch (e) {
                        console.error('Error logging call only:', e);
                      }
                      onClose();
                    }}
                    className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded shadow-2xs transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: LOG CALL WITH APPOINTMENT VIEW */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Job Location & Job Type Banner */}
              <div className="p-3 space-y-2 bg-slate-50/50 border-b border-slate-200 shrink-0">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Job Location <span className="text-red-500">*</span>
                  </label>
                  <JobLocationDropdown
                    value={bookingLocation}
                    onChange={(loc) => setBookingLocation(loc)}
                    locations={customerLocationsList}
                    onOpenQuickEdit={() => setShowQuickEditLocations(true)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Job <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bookingSelectedJob}
                      onChange={(e) => setBookingSelectedJob(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      {!editingJobId && <option value="New Job">New Job</option>}
                      {bookingSelectedJob && bookingSelectedJob !== 'New Job' && (
                        <option value={bookingSelectedJob}>{bookingSelectedJob}</option>
                      )}
                      <option value="#134375">#134375</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <HierarchicalJobTypeSelector
                      value={bookingJobType}
                      onChange={(val) => setBookingJobType(val)}
                      userDispatchGroup="Office Staff"
                      userRole="admin"
                      showChevronInJobTypes={true}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-1 px-5 border-b border-slate-200 text-xs font-sans pt-1 shrink-0 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setBookingSubTab('appointment')}
                  className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                    bookingSubTab === 'appointment'
                      ? 'border border-slate-300 border-b-white bg-white text-slate-800 font-semibold -mb-px shadow-2xs'
                      : 'text-[#be4646] hover:underline font-medium bg-transparent'
                  }`}
                >
                  Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setBookingSubTab('notes')}
                  className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                    bookingSubTab === 'notes'
                      ? 'border border-slate-300 border-b-white bg-white text-slate-800 font-semibold -mb-px shadow-2xs'
                      : 'text-[#be4646] hover:underline font-medium bg-transparent'
                  }`}
                >
                  Calls & Notes
                </button>
                <button
                  type="button"
                  onClick={() => setBookingSubTab('balance')}
                  className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                    bookingSubTab === 'balance'
                      ? 'border border-slate-300 border-b-white bg-white text-slate-800 font-semibold -mb-px shadow-2xs'
                      : 'text-[#be4646] hover:underline font-medium bg-transparent'
                  }`}
                >
                  Balance
                </button>
                <button
                  type="button"
                  onClick={() => setBookingSubTab('maintenance')}
                  className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                    bookingSubTab === 'maintenance'
                      ? 'border border-slate-300 border-b-white bg-white text-slate-800 font-semibold -mb-px shadow-2xs'
                      : 'text-[#be4646] hover:underline font-medium bg-transparent'
                  }`}
                >
                  Maintenance {mockCustomerMaintenancePlans.length > 0 ? `(${mockCustomerMaintenancePlans.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setBookingSubTab('equipment')}
                  className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                    bookingSubTab === 'equipment'
                      ? 'border border-slate-300 border-b-white bg-white text-slate-800 font-semibold -mb-px shadow-2xs'
                      : 'text-[#be4646] hover:underline font-medium bg-transparent'
                  }`}
                >
                  Equipment {mockLocationEquipment.length > 0 ? `(${mockLocationEquipment.length})` : ''}
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="max-h-[50vh] overflow-y-auto flex-1">
                {bookingSubTab === 'appointment' ? (
                  /* SUB-TAB 1: APPOINTMENT FORM */
                  <div className="p-4 space-y-4">
                    {/* Mode Toggle Row */}
                    <div className="space-y-3">
                      <div className="w-72 bg-slate-100 p-0.5 rounded border border-slate-300">
                        <div className="grid grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setBookingScheduleMode('schedule')}
                            className={`py-1.5 text-xs font-semibold rounded transition-all text-center cursor-pointer ${
                              bookingScheduleMode === 'schedule'
                                ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 bg-transparent'
                            }`}
                          >
                            Schedule Now
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookingScheduleMode('request')}
                            className={`py-1.5 text-xs font-semibold rounded transition-all text-center cursor-pointer ${
                              bookingScheduleMode === 'request'
                                ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 bg-transparent'
                            }`}
                          >
                            Service Request
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Module: Schedule Now vs Service Request Fields */}
                      {bookingScheduleMode === 'schedule' ? (
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                          {/* Row 1: Timing & Tech fields */}
                          <div className="flex items-start gap-8">
                            {/* Group A: Timing */}
                            <div className="grid grid-cols-2 gap-3 flex-1">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-700">
                                  Appointment Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                  size="sm"
                                  value={bookingDate}
                                  onChange={(d) => setBookingDate(d)}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-700">
                                  Frequency <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={bookingFrequency}
                                  onChange={(e) => setBookingFrequency(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                                >
                                  {APPOINTMENT_FREQUENCIES.map((freq) => (
                                    <option key={freq} value={freq}>{freq}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Group B: Techs */}
                            <div className="grid grid-cols-2 gap-3 flex-1">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-semibold text-slate-700 truncate">
                                    Primary Tech {!bookingAssignLater && <span className="text-red-500">*</span>}
                                  </label>
                                  <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={bookingAssignLater}
                                      onChange={(e) => setBookingAssignLater(e.target.checked)}
                                      className="rounded accent-[#be4646]"
                                    />
                                    <span>Assign Later</span>
                                  </label>
                                </div>
                                <select
                                  disabled={bookingAssignLater}
                                  value={bookingPrimaryTech}
                                  onChange={(e) => setBookingPrimaryTech(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer disabled:bg-slate-100"
                                >
                                  <option value="">Select Primary Tech...</option>
                                  {dynamicTechsList.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-700 truncate">Additional Tech(s)</label>
                                <div className="min-h-[32px] px-2 py-1 bg-white border border-slate-300 rounded focus-within:ring-1 focus-within:ring-[#2d82b7] focus-within:border-[#2d82b7] flex flex-wrap items-center gap-1.5 transition-all">
                                  {bookingAdditionalTechs.length > 0 && (
                                    <TagGroup
                                      aria-label="Additional Technicians"
                                      onRemove={(keys) => {
                                        const toRemove = new Set(Array.from(keys));
                                        setBookingAdditionalTechs((prev) => prev.filter((name) => !toRemove.has(name)));
                                      }}
                                    >
                                      <TagList
                                        items={bookingAdditionalTechs.map((name) => ({ id: name, name }))}
                                        className="flex flex-wrap gap-1.5"
                                      >
                                        {(item) => (
                                          <Tag
                                            id={item.id}
                                            textValue={item.name}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-white shadow-xs focus:outline-none select-none transition-colors"
                                          >
                                            {({ allowsRemoving }) => (
                                              <>
                                                <span>{item.name}</span>
                                                {allowsRemoving && (
                                                  <AriaButton
                                                    slot="remove"
                                                    aria-label={`Remove ${item.name}`}
                                                    className="hover:bg-slate-700 rounded-full p-0.5 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px] leading-none flex items-center justify-center w-3.5 h-3.5"
                                                  >
                                                    ✕
                                                  </AriaButton>
                                                )}
                                              </>
                                            )}
                                          </Tag>
                                        )}
                                      </TagList>
                                    </TagGroup>
                                  )}
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val && !bookingAdditionalTechs.includes(val)) {
                                        setBookingAdditionalTechs((prev) => [...prev, val]);
                                      }
                                    }}
                                    className="flex-1 min-w-[130px] px-1 py-0.5 bg-transparent border-0 text-xs text-slate-800 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">
                                      {bookingAdditionalTechs.length === 0 ? 'Select Additional Tech...' : '+ Add Tech...'}
                                    </option>
                                    {dynamicTechsList
                                      .filter((t) => t !== bookingPrimaryTech && !bookingAdditionalTechs.includes(t))
                                      .map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Time & Statuses */}
                          <div className="flex items-start gap-8">
                            <div className="flex-1 space-y-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Time <span className="text-red-500">*</span>
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <select value={bookingStartHour} onChange={(e) => setBookingStartHour(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                    <option key={h} value={String(h)}>{h}</option>
                                  ))}
                                </select>
                                <span>:</span>
                                <select value={bookingStartMin} onChange={(e) => setBookingStartMin(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer">
                                  <option value="00">00</option>
                                  <option value="15">15</option>
                                  <option value="30">30</option>
                                  <option value="45">45</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setBookingStartAmpm(bookingStartAmpm === 'AM' ? 'PM' : 'AM')}
                                  className="px-2 py-1 bg-[#2d82b7] text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  {bookingStartAmpm}
                                </button>

                                <span className="px-1 text-slate-500 font-medium">to</span>

                                <select value={bookingEndHour} onChange={(e) => setBookingEndHour(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                    <option key={h} value={String(h)}>{h}</option>
                                  ))}
                                </select>
                                <span>:</span>
                                <select value={bookingEndMin} onChange={(e) => setBookingEndMin(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer">
                                  <option value="00">00</option>
                                  <option value="15">15</option>
                                  <option value="30">30</option>
                                  <option value="45">45</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setBookingEndAmpm(bookingEndAmpm === 'AM' ? 'PM' : 'AM')}
                                  className="px-2 py-1 bg-[#2d82b7] text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  {bookingEndAmpm}
                                </button>

                                {/* Warning System Trigger Icon & Popover */}
                                {(isOutsideHours || isOffDuty) && (
                                  <div className="relative ml-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setShowNoticesPopover(!showNoticesPopover)}
                                      className="p-1 bg-[#fef9ec] hover:bg-amber-100 border border-amber-300/80 text-amber-800 rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title="Click to view Appointment Notices"
                                    >
                                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                                    </button>

                                    {showNoticesPopover && (
                                      <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-lg shadow-2xl border border-slate-300 w-80 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 font-sans">
                                        <div className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2">
                                          Appointment Notices
                                        </div>
                                        <div className="space-y-2">
                                          {isOutsideHours && (
                                            <div className="flex items-center gap-2.5 p-2.5 bg-[#fef9ec] border border-amber-200/80 rounded-md text-amber-900 text-xs font-medium shadow-2xs">
                                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                              <span>Appointment outside of business hours.</span>
                                            </div>
                                          )}
                                          {isOffDuty && (
                                            <div className="flex items-center gap-2.5 p-2.5 bg-[#fef9ec] border border-amber-200/80 rounded-md text-amber-900 text-xs font-medium shadow-2xs">
                                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                              <span>Technician is off duty.</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Appointment Status and Appointment Confirmation Dropdowns - ONLY ON UPDATE APPOINTMENT */}
                            {!isNew && (
                              <div className="grid grid-cols-2 gap-3 flex-1">
                                <div className="space-y-1">
                                  <label className="block text-[11px] font-semibold text-slate-700">
                                    Appointment Status
                                  </label>
                                  <select
                                    value={bookingApptStatus}
                                    onChange={(e) => setBookingApptStatus(e.target.value as any)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer font-medium"
                                  >
                                    {APPOINTMENT_STATUSES.map((status) => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[11px] font-semibold text-slate-700">
                                    Appointment Confirmation
                                  </label>
                                  <select
                                    value={bookingApptConfirmed}
                                    onChange={(e) => setBookingApptConfirmed(e.target.value as any)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer font-medium"
                                  >
                                    <option value="Not Confirmed">Not Confirmed</option>
                                    <option value="Confirmed">Confirmed</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* SERVICE REQUEST FIELDS */
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Duration <span className="text-red-500">*</span>
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={reqDurationHour}
                                  onChange={(e) => setReqDurationHour(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                                >
                                  <option value="0 hours">0 hours</option>
                                  <option value="1 hour">1 hour</option>
                                  <option value="2 hours">2 hours</option>
                                  <option value="3 hours">3 hours</option>
                                  <option value="4 hours">4 hours</option>
                                </select>
                                <select
                                  value={reqDurationMin}
                                  onChange={(e) => setReqDurationMin(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                                >
                                  <option value="00 min">00 min</option>
                                  <option value="15 min">15 min</option>
                                  <option value="30 min">30 min</option>
                                  <option value="45 min">45 min</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Minimum Technician Level <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={reqMinTechLevel}
                                onChange={(e) => setReqMinTechLevel(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                              >
                                <option value="Level 1">Level 1</option>
                                <option value="Level 2">Level 2</option>
                                <option value="Level 3">Level 3</option>
                                <option value="Level 4">Level 4</option>
                                <option value="Level 5">Level 5</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Section 1: New Call */}
                    <div className="border border-slate-200 rounded-lg bg-slate-50/50 space-y-3 p-3.5 relative">
                      <h4 className="font-bold text-slate-800 text-xs">New Call</h4>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700">Date / Time <span className="text-red-500">*</span></label>
                          <div className="flex items-center gap-1.5">
                            <div className="w-[125px] shrink-0">
                              <DatePicker
                                value={bookingDate}
                                onChange={(d) => {
                                  setBookingDate(d);
                                  setNewCallDateTimeStr(`${d} ${bookingStartHour}:${bookingStartMin} ${bookingStartAmpm}`);
                                }}
                                size="sm"
                              />
                            </div>
                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-800 shrink-0">
                              <input
                                type="text"
                                value={bookingStartHour}
                                onChange={(e) => setBookingStartHour(e.target.value)}
                                className="w-5 text-center font-semibold focus:outline-none"
                              />
                              <span>:</span>
                              <input
                                type="text"
                                value={bookingStartMin}
                                onChange={(e) => setBookingStartMin(e.target.value)}
                                className="w-5 text-center font-semibold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setBookingStartAmpm((prev) => prev === 'AM' ? 'PM' : 'AM')}
                                className="font-bold text-[10px] text-slate-600 hover:text-slate-900 ml-0.5 px-1 py-0.5 rounded bg-slate-100 cursor-pointer"
                              >
                                {bookingStartAmpm}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700">Phone Number</label>
                          <input
                            type="text"
                            value={bookingPhoneNumber}
                            onChange={(e) => setBookingPhoneNumber(formatPhoneNumber(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700">Contact</label>
                          <select
                            value={newCallContactPerson}
                            onChange={(e) => setNewCallContactPerson(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                          >
                            <option value={currentCustomer.name}>{currentCustomer.name}</option>
                            {customerAuthorizedPersons.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}{p.relationship ? ` (${p.relationship})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700">Call Type</label>
                          <select
                            value={bookingCallType}
                            onChange={(e) => setBookingCallType(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800"
                          >
                            <option>Inbound</option>
                            <option>Outbound</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-700">Related Location(s)</label>
                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-medium truncate max-w-[200px]">
                              {typeof currentCustomer.address === 'string' ? currentCustomer.address : formatAddrString(currentCustomer.address)}
                            </span>
                            <button type="button" className="text-slate-400 hover:text-slate-600">×</button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          rows={3}
                          value={bookingCallNotes}
                          onChange={(e) => setBookingCallNotes(e.target.value)}
                          placeholder="Call notes..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                        />
                      </div>

                      {showPrimaryApptContact ? (
                        <div className="space-y-1.5 p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                          <label className="block text-[11px] font-semibold text-slate-700">Primary Appointment Contact</label>
                          <div className="flex items-center gap-2">
                            <select
                              value={primaryApptContactPerson}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setPrimaryApptContactPerson(newName);
                                const person = customerAuthorizedPersons.find((p) => p.name === newName);
                                if (person) {
                                  setPrimaryApptContactValue(primaryApptContactType === 'SMS' ? (person.phone || '') : (person.email || ''));
                                } else {
                                  setPrimaryApptContactValue(primaryApptContactType === 'SMS' ? currentCustomer.phone : (currentCustomer.email || ''));
                                }
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                            >
                              <option value={currentCustomer.name}>{currentCustomer.name}</option>
                              {customerAuthorizedPersons.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}{p.relationship ? ` (${p.relationship})` : ''}
                                </option>
                              ))}
                            </select>

                            <select
                              value={primaryApptContactType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                setPrimaryApptContactType(newType);
                                const person = customerAuthorizedPersons.find((p) => p.name === primaryApptContactPerson);
                                if (person) {
                                  setPrimaryApptContactValue(newType === 'SMS' ? (person.phone || '') : (person.email || ''));
                                } else {
                                  setPrimaryApptContactValue(newType === 'SMS' ? currentCustomer.phone : (currentCustomer.email || ''));
                                }
                              }}
                              className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                            >
                              <option value="SMS">SMS</option>
                              <option value="Email">Email</option>
                            </select>

                            <input
                              type="text"
                              value={primaryApptContactValue}
                              onChange={(e) => setPrimaryApptContactValue(e.target.value)}
                              placeholder={primaryApptContactType === 'SMS' ? '(888) 888-8888' : 'contact@example.com'}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => setShowPrimaryApptContact(false)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                              title="Remove Primary Appointment Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowPrimaryApptContact(true)}
                            className="text-[#be4646] font-semibold text-[11px] hover:underline cursor-pointer"
                          >
                            + Add Primary Appointment Contact
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Section 2: Appointment Notifications and Reminders */}
                    <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs">Appointment Notifications and Reminders</h4>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Scheduled</span>
                          <button
                            type="button"
                            onClick={() => setNotifyScheduled(!notifyScheduled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              notifyScheduled ? 'bg-[#2d82b7]' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              notifyScheduled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">1 Week Prior</span>
                          <button
                            type="button"
                            onClick={() => setNotify1Week(!notify1Week)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              notify1Week ? 'bg-[#2d82b7]' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              notify1Week ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">1 Day Prior</span>
                          <button
                            type="button"
                            onClick={() => setNotify1Day(!notify1Day)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              notify1Day ? 'bg-[#2d82b7]' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              notify1Day ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">En Route</span>
                          <button
                            type="button"
                            onClick={() => setNotifyEnRoute(!notifyEnRoute)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              notifyEnRoute ? 'bg-[#2d82b7]' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              notifyEnRoute ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Recipients List */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-700">Who would you like these notifications to go to?</label>
                        {recipientsList.map((rec) => (
                          <div key={rec.id} className="flex items-center gap-2">
                            <select
                              value={rec.name}
                              onChange={(e) => handleRecipientPersonChange(rec.id, e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                            >
                              <option value={currentCustomer.name}>{currentCustomer.name}</option>
                              {customerAuthorizedPersons.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}{p.relationship ? ` (${p.relationship})` : ''}
                                </option>
                              ))}
                            </select>

                            <select
                              value={rec.type}
                              onChange={(e) => handleRecipientTypeChange(rec.id, e.target.value)}
                              className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                            >
                              <option value="Email">Email</option>
                              <option value="SMS">SMS</option>
                            </select>

                            <input
                              type="text"
                              value={rec.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecipientsList((prev) =>
                                  prev.map((r) => (r.id === rec.id ? { ...r, value: val } : r))
                                );
                              }}
                              placeholder={rec.type === 'SMS' ? '(888) 888-8888' : 'recipient@example.com'}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
                            />

                            {recipientsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(rec.id)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                                title="Remove Recipient"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={handleAddRecipient}
                          className="text-[#be4646] font-semibold text-[11px] hover:underline cursor-pointer"
                        >
                          + Add Recipient
                        </button>
                      </div>
                    </div>
                  </div>
                ) : bookingSubTab === 'notes' ? (
                  /* SUB-TAB 2: CALLS & NOTES */
                  <div className="p-4 space-y-5 text-xs text-slate-700 font-sans">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <span>Job Calls & Notes</span>
                        <span className="text-slate-400 cursor-help" title="Notes associated with the selected job">ⓘ</span>
                      </div>
                      
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5 w-1/5">User</th>
                              <th className="p-2.5 w-1/4">Date/Time</th>
                              <th className="p-2.5">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {jobNotesList.map((item, index) => (
                              <tr key={item.id} className="bg-white">
                                <td className="p-2.5 font-semibold text-slate-800 align-top">{item.user}</td>
                                <td className="p-2.5 text-slate-600 align-top whitespace-nowrap">{item.dateTime}</td>
                                <td className="p-2.5 text-slate-800 align-top">
                                  {item.isEditing ? (
                                    <div className="space-y-1.5">
                                      <textarea
                                        rows={2}
                                        autoFocus
                                        value={item.noteText}
                                        onChange={(e) => {
                                          const text = e.target.value;
                                          setJobNotesList((prev) =>
                                            prev.map((n) => (n.id === item.id ? { ...n, noteText: text } : n))
                                          );
                                        }}
                                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setJobNotesList((prev) =>
                                              prev.map((n) => (n.id === item.id ? { ...n, isEditing: false } : n))
                                            );
                                          }}
                                          className="px-2.5 py-0.5 bg-[#2d82b7] text-white text-[11px] font-semibold rounded cursor-pointer hover:bg-[#256c99] transition-colors"
                                        >
                                          Save Note
                                        </button>
                                        {index !== 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setJobNotesList((prev) => prev.filter((n) => n.id !== item.id));
                                            }}
                                            className="px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded cursor-pointer transition-colors"
                                          >
                                            Remove Note
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => {
                                        setJobNotesList((prev) =>
                                          prev.map((n) => (n.id === item.id ? { ...n, isEditing: true } : n))
                                        );
                                      }}
                                      className="cursor-pointer hover:bg-slate-100/80 p-1 rounded transition-colors"
                                      title="Click to edit note"
                                    >
                                      {item.noteText || <span className="text-slate-400 italic">Click to edit note...</span>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            const formattedDate = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
                            let hr = d.getHours();
                            const min = String(d.getMinutes()).padStart(2, '0');
                            const ampm = hr >= 12 ? 'PM' : 'AM';
                            hr = hr % 12;
                            if (hr === 0) hr = 12;
                            const timeStr = `${String(hr).padStart(2, '0')}:${min} ${ampm}`;
                            const stampStr = `${formattedDate} ${timeStr}`;

                            const newNote: JobNoteItem = {
                              id: `note-${Date.now()}`,
                              user: 'Ryan Cole',
                              dateTime: stampStr,
                              noteText: '',
                              isEditing: true,
                            };
                            setJobNotesList((prev) => [...prev, newNote]);
                          }}
                          className="text-[#be4646] font-semibold text-xs hover:underline cursor-pointer"
                        >
                          + Add Note
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <span>Other Calls & Notes for this Location</span>
                        <span className="text-slate-400 cursor-help" title="Other calls or notes logged for this customer location">ⓘ</span>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5 w-1/5">User</th>
                              <th className="p-2.5 w-1/4">Date/Time</th>
                              <th className="p-2.5">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                            {otherLocationNotesList.length > 0 ? (
                              otherLocationNotesList.map((item) => (
                                <tr key={item.id} className="bg-white">
                                  <td className="p-2.5 font-semibold text-slate-800 align-top">{item.user}</td>
                                  <td className="p-2.5 text-slate-600 align-top whitespace-nowrap">{item.dateTime}</td>
                                  <td className="p-2.5 text-slate-800 align-top">{item.noteText}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="p-4 text-center text-slate-400 italic text-xs">
                                  No other calls or notes recorded for this location.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : bookingSubTab === 'balance' ? (
                  /* SUB-TAB 3: BALANCE */
                  <div className="p-4 space-y-4 text-xs text-slate-700 font-sans">
                    <div className="bg-[#f0f8fd] border border-sky-100/80 rounded-md px-4 py-3 text-xs font-semibold text-[#1f5c6b] shadow-2xs">
                      Customer Balance By Location: $0.00
                    </div>

                    <div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="border-b border-slate-200 font-bold text-slate-600">
                          <tr>
                            <th className="py-2 px-1 font-bold text-slate-700">Invoice Number</th>
                            <th className="py-2 px-1 font-bold text-slate-700">Issue Date</th>
                            <th className="py-2 px-1 font-bold text-slate-700">Due Date</th>
                            <th className="py-2 px-1 font-bold text-slate-700">Invoice Total</th>
                            <th className="py-2 px-1 font-bold text-slate-700">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 italic text-xs">
                              No open invoices found for this location.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : bookingSubTab === 'maintenance' ? (
                  /* SUB-TAB 4: MAINTENANCE */
                  <div className="p-4 space-y-3 text-xs text-slate-700 font-sans">
                    {mockCustomerMaintenancePlans.length > 0 ? (
                      mockCustomerMaintenancePlans.map((plan) => (
                        <div key={plan.id} className="bg-[#f7f7f7] border border-slate-200/80 rounded-lg p-3.5 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                              <span className="text-slate-800">★</span>
                              <span>{plan.name}</span>
                            </div>
                            {plan.noPaymentPlan && (
                              <span className="text-[10px] font-bold bg-[#fde8c2] text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded uppercase tracking-wide">
                                NO PAYMENT PLAN
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 items-center text-xs pt-1">
                            <div className="text-slate-500 italic text-[11px]">
                              Expires: {plan.expirationDate}
                            </div>
                            <div className="text-slate-700">
                              <span className="font-normal text-slate-600">Contract Price:</span> <span className="font-semibold text-slate-800">{plan.contractPrice}</span>
                            </div>
                            <div className="text-slate-700">
                              <span className="font-normal text-slate-600">Annual Price:</span> <span className="font-semibold text-slate-800">{plan.annualPrice}</span>
                            </div>
                            <div className="text-right font-semibold text-slate-800">
                              {plan.appliedAmount} Applied
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                        <p className="text-xs text-slate-700 font-medium">No maintenance plans found on record for this location.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* SUB-TAB 5: EQUIPMENT */
                  <div className="p-4 space-y-3 text-xs text-slate-700 font-sans">
                    {mockLocationEquipment.length === 0 ? (
                      <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                        <p className="text-xs text-slate-700 font-medium">No equipment found on record for this location.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                              <tr>
                                <th className="p-2.5">Name</th>
                                <th className="p-2.5">Install Date</th>
                                <th className="p-2.5">Mfr.</th>
                                <th className="p-2.5">Serial No.</th>
                                <th className="p-2.5">Model No.</th>
                                <th className="p-2.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                              {paginatedEquipment.map((eq) => (
                                <tr key={eq.id}>
                                  <td className="p-2.5 font-medium text-slate-800">{eq.name}</td>
                                  <td className="p-2.5 text-slate-600">{eq.installDate || ''}</td>
                                  <td
                                    onClick={() => handleCopyEquipmentValue(eq.mfg, `${eq.id}-mfg`)}
                                    className="p-2.5 text-slate-700 cursor-pointer "
                                    title="Click to copy Manufacturer"
                                  >
                                    <div className="inline-flex items-center gap-1.5">
                                      <span>{eq.mfg}</span>
                                      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                        {copiedEquipmentKey === `${eq.id}-mfg` && (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                  <td
                                    onClick={() => handleCopyEquipmentValue(eq.serialNo, `${eq.id}-serial`)}
                                    className="p-2.5 text-slate-700 text-[11px] cursor-pointer "
                                    title="Click to copy Serial Number"
                                  >
                                    <div className="inline-flex items-center gap-1.5">
                                      <span>{eq.serialNo}</span>
                                      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                        {copiedEquipmentKey === `${eq.id}-serial` && (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                  <td
                                    onClick={() => handleCopyEquipmentValue(eq.modelNo, `${eq.id}-model`)}
                                    className="p-2.5 text-slate-700 text-[11px] cursor-pointer "
                                    title="Click to copy Model Number"
                                  >
                                    <div className="inline-flex items-center gap-1.5">
                                      <span>{eq.modelNo}</span>
                                      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                        {copiedEquipmentKey === `${eq.id}-model` && (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-slate-600 font-medium">{eq.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Equipment Pagination Controls */}
                        {totalEquipmentPages > 1 && (
                          <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-600 border-t border-slate-100">
                            <div>
                              Showing {(equipmentPage - 1) * EQUIPMENT_PER_PAGE + 1} to {Math.min(equipmentPage * EQUIPMENT_PER_PAGE, mockLocationEquipment.length)} of {mockLocationEquipment.length} equipment
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={equipmentPage <= 1}
                                onClick={() => setEquipmentPage((p) => Math.max(1, p - 1))}
                                className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-medium">Page {equipmentPage} of {totalEquipmentPages}</span>
                              <button
                                type="button"
                                disabled={equipmentPage >= totalEquipmentPages}
                                onClick={() => setEquipmentPage((p) => Math.min(totalEquipmentPages, p + 1))}
                                className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  {!isNew && (
                    <button
                      type="button"
                      onClick={() => setShowCancelUnscheduleModal(true)}
                      className="px-4 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
                    >
                      Cancel/Unschedule
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  {isNew ? (bookingScheduleMode === 'request' ? 'Save Request' : 'Schedule') : 'Save'}
                </button>
              </div>
            </div>
            )}
      </div>

      {/* Secondary Modal 2: Quick Edit Customer Locations (Layered on top of Appointment Modal) */}
      {showQuickEditLocations && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs font-sans flex flex-col h-[560px] max-h-[85vh]">
            {/* Header with Close 'X' - Completely Stationary */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Quick Edit Customer Locations</h3>
                <span className="text-xs text-slate-500 font-medium">({filteredCustomerLocations.length} locations)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickEditLocations(false);
                  setLocationSearchQuery('');
                  setLocationPage(1);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Locations Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Selected Job Location */}
                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Currently Selected: <span className="font-semibold text-[#2d82b7]">{bookingLocation || 'None'}</span></span>
                </div>

                {/* Search bar */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => {
                        setLocationSearchQuery(e.target.value);
                        setLocationPage(1);
                      }}
                      placeholder="Search customer locations..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    />
                  </div>
                </div>

                {/* Paginated list */}
                <div className="space-y-2 min-h-[250px]">
                  {paginatedCustomerLocations.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic text-xs">
                      No locations match your search.
                    </div>
                  ) : (
                    paginatedCustomerLocations.map((loc: string) => {
                      const isDefaultLoc = loc === customerLocationsList[0];
                      const isSelected = bookingLocation === loc;
                      return (
                        <div
                          key={loc}
                          onClick={() => {
                            setBookingLocation(loc);
                            setShowQuickEditLocations(false);
                            setLocationSearchQuery('');
                            setLocationPage(1);
                          }}
                          className={`py-2.5 px-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'border-[#2d82b7] bg-sky-50 font-bold shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {isDefaultLoc && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0">
                                DEFAULT
                              </span>
                            )}
                            <span className="text-[#be4646] font-semibold truncate">{loc}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#2d82b7]" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalLocationPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-600 border-t border-slate-100 shrink-0">
                  <div>
                    Showing {(locationPage - 1) * LOCATIONS_PER_PAGE + 1} to {Math.min(locationPage * LOCATIONS_PER_PAGE, filteredCustomerLocations.length)} of {filteredCustomerLocations.length} locations
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={locationPage <= 1}
                      onClick={() => setLocationPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-medium">Page {locationPage} of {totalLocationPages}</span>
                    <button
                      type="button"
                      disabled={locationPage >= totalLocationPages}
                      onClick={() => setLocationPage((p) => Math.min(totalLocationPages, p + 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowQuickEditLocations(false);
                  setLocationSearchQuery('');
                  setLocationPage(1);
                }}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Modal: Unschedule / Cancel / Delete Modal (Exact Match to Screenshot 3 & Mobile App) */}
      {showCancelUnscheduleModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-slate-300 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header with Close 'X' */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Cancel / Unschedule</h3>
              <button
                type="button"
                onClick={() => setShowCancelUnscheduleModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Controls: Unschedule | Cancel | Delete */}
            <div className="pt-6 pb-2 px-6 flex justify-center">
              <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUnscheduleOption('Unschedule')}
                  className={`px-5 py-1.5 text-xs font-bold transition-colors cursor-pointer rounded-l ${
                    selectedUnscheduleOption === 'Unschedule'
                      ? 'bg-[#8b1e1e] text-white shadow-2xs'
                      : 'bg-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Unschedule
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnscheduleOption('Cancel')}
                  className={`px-5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    selectedUnscheduleOption === 'Cancel'
                      ? 'bg-[#8b1e1e] text-white shadow-2xs'
                      : 'bg-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnscheduleOption('Delete')}
                  className={`px-5 py-1.5 text-xs font-bold transition-colors cursor-pointer rounded-r ${
                    selectedUnscheduleOption === 'Delete'
                      ? 'bg-[#8b1e1e] text-white shadow-2xs'
                      : 'bg-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Content Callout Box */}
            <div className="px-6 py-4">
              <div className="bg-[#fef9ee] border border-[#fef08a] rounded p-4 text-center text-xs text-slate-700 leading-relaxed">
                {selectedUnscheduleOption === 'Unschedule' && (
                  <p>
                    This will take the appointment(s) and make a single service request, retaining the existing information.
                  </p>
                )}
                {selectedUnscheduleOption === 'Cancel' && (
                  <p>
                    This will set the status of the appointment(s) to &quot;cancelled.&quot; It will not be visible on the schedule, but will show as cancelled on the job.
                  </p>
                )}
                {selectedUnscheduleOption === 'Delete' && (
                  <p>
                    This will permanently delete the appointment(s).
                  </p>
                )}
              </div>

              {/* Cancel Option Extra Toggle */}
              {selectedUnscheduleOption === 'Cancel' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer mt-3 justify-center ">
                  <input
                    type="checkbox"
                    checked={cancelAllPastAppts}
                    onChange={(e) => setCancelAllPastAppts(e.target.checked)}
                    className="rounded border-slate-300 text-[#8b1e1e] focus:ring-[#8b1e1e]"
                  />
                  <span>Cancel all past appointments</span>
                </label>
              )}
            </div>

            {/* Footer with Dark Red Save Button */}
            <div className="px-6 pb-6 pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleExecuteUnscheduleCancelDelete}
                className="px-6 py-2 bg-[#8b1e1e] hover:bg-[#701616] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const AddAppointmentModal = UpdateAppointmentModal;
