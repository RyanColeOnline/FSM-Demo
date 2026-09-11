'use client';

function formatCleanLocationString(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') {
    let s = loc.trim();
    // Strip customer name prefix if present (e.g. "Customer Name - 123 Main St")
    s = s.replace(/^[^-]+?\s+-\s+/i, '');
    s = s.replace(/\bprimary location\b,?\s*/gi, '');
    s = s.replace(/^,\s*/, '');
    s = s.replace(/,\s*(\d+[A-Za-z]?)\s*,/i, ', Apt $1,');
    s = s.trim();
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length <= 2 && /^[A-Z]{2}\s+\d{5}$/i.test(parts[parts.length - 1])) {
      return '';
    }
    return s;
  }
  const street = (loc.street || loc.addr1 || '').trim();
  if (!street || street.toLowerCase() === 'primary location' || street.toLowerCase().includes('primary location') || street.toLowerCase() === 'no street provided') {
    return '';
  }
  let line2 = (loc.addressLine2 || loc.addr2 || loc.street2 || '').trim();
  if (line2 && /^\d+[A-Za-z]?$/.test(line2)) {
    line2 = `Apt ${line2}`;
  }
  const city = (loc.city || '').trim();
  const state = (loc.state || 'FL').trim();
  const zip = (loc.zipCode || loc.zip || '').trim();

  const streetPart = line2 && !street.toLowerCase().includes(line2.toLowerCase())
    ? `${street}, ${line2}`
    : street;
  const cszPart = `${city}${city && state ? ', ' : ''}${state} ${zip}`.trim();

  return [streetPart, cszPart].filter(Boolean).join(', ');
}


function splitAddressParts(rawAddress?: string, customerName?: string): {
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



import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  List, 
  MapPin, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Edit3, 
  GripVertical,
  Wrench,
  X,
  Check,
  Clock,
  User,
  MapPin as PinIcon,
  CheckCircle2,
  FileText,
  ExternalLink,
  Filter,
  UserPlus,
  Save,
  AlertTriangle,
  Bell,
  Trash2,
  ChevronDown,
  Search,
  Plus,
  Info
} from 'lucide-react';
import { DatePicker, MenuTrigger, Menu, MenuItem, MenuButton } from '@/components/ui';
import { EVENT_TYPES, EVENT_FREQUENCIES, APPOINTMENT_STATUSES } from '@/constants/globalChoices';
import {
  Calendar as AriaCalendar,
  CalendarGrid as AriaCalendarGrid,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarCell as AriaCalendarCell,
  Heading as AriaHeading,
  Button as AriaButton,
} from 'react-aria-components';
import { CalendarDate } from '@internationalized/date';
import { useSession } from '@/auth/sessionStore';
import { JobTypeRegistry } from '@/stores/jobTypeRegistry';
import { ALL_DISPATCH_GROUPS, getDispatchGroupDisplayName, normalizeDispatchGroupCategory } from '@/rbac/dispatchGroups';
import { useAppointments } from '@/hooks/useAppointments';
import { useJobs } from '@/hooks/useJobs';
import { useCustomers } from '@/hooks/useCustomers';
import { useCalls } from '@/hooks/useCalls';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers } from '@/hooks/useUsers';
import { useDispatchGroups } from '@/hooks/useDispatchGroups';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { 
  CanonicalAppointment, 
  CanonicalCustomer, 
  CanonicalCall, 
  CanonicalJob,
  CanonicalInvoice,
  CanonicalNote,
  CANONICAL_OFFICIAL_USERS, 
  CANONICAL_OFFICIAL_DISPATCH_GROUPS 
} from '@murphys/domain';
import { getTripTypeWebHex } from '@/domain/types/jobType';
import { 
  getEasternDateString, 
  formatEasternDateTime, 
  normalizeToEasternDateString,
  cleanUserDisplayName,
  extractTime12hFromIsoOrString,
  formatCalendarDateMdy
} from '@/domain';
import { AddCustomerModal } from '@/components/modals/AddCustomerModal';
import { HierarchicalJobTypeSelector } from '@/components/ui';
import { UpdateAppointmentModal, getTechsForJobType, formatCustomerDisplayName } from '@/components/modals/UpdateAppointmentModal';

export interface ScheduledJob {
  id: string;
  customerId?: string;
  jobNumber: string; // e.g. "Job 134100" or "#108889"
  customer: string; // e.g. "Leura Canary"
  phone?: string; // e.g. "(334) 220-1447"
  addressStreet: string; // Line 1: "196 Rue Martine"
  addressCityStateZip: string; // Line 2: "Miramar Beach, FL 32550"
  isFlagged?: boolean; // Flag icon status
  isCompleted?: boolean; // Completed / past appointment status
  isScheduled?: boolean;
  scheduleMode?: 'schedule' | 'request';
  isServiceRequest?: boolean;
  status?: 'Scheduled' | 'Missed' | 'In Progress' | 'Complete' | 'Incomplete' | 'Unscheduled' | any;
  confirmed?: 'Confirmed' | 'Not Confirmed';
  startTime: string; // e.g. "8:00am"
  endTime?: string; // e.g. "4:00pm"
  actualStartTime?: string; // e.g. "8:04am"
  durationHours: number; // e.g. 2.5
  actualDurationHours?: number; // e.g. 2.7
  color?: string; // Timeline view color
  colorHex?: string; // Canonical trip color hex
  dotColor: string; // Circle color (e.g. 'bg-[#be4646]', 'bg-amber-500', 'bg-emerald-500')
  jobType?: string; // e.g. "HVAC", "Appliance service"
  technicians?: string[]; // e.g. ["*Marcus Vance", "David Ross"]
  callNotes?: string; // e.g. "Install 3 ton carrier coastal system..."
  designationOverride?: string | null;
}

export interface JobNoteItem {
  id: string;
  user: string;
  dateTime: string;
  noteText: string;
  isEditing?: boolean;
}

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

export interface TechUser {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  dispatchGroup?: string;
  scheduledJobs: ScheduledJob[];
}

export interface ScheduleListItem {
  id: string;
  scheduledTimeRange: string;
  actualTimeRange: string;
  techName: string;
  eventType: string;
  customerName: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  confirmed: 'Confirmed' | 'Not Confirmed';
  tags?: string;
}

export interface MapStopMarker {
  id: string;
  techInitials: string;
  techName: string;
  color?: string;
  colorHex: string;
  jobType?: string;
  timeRange?: string;
  jobNumber: string;
  customer: string;
  address: string;
  latPercent: number; // For map positioning
  lngPercent: number; // For map positioning
  stopNumber: number;
  techId?: string;
}

/**
 * Accurately maps Emerald Coast addresses (Fort Walton Beach, Destin, Niceville, Miramar Beach, 30A)
 * to bounding percentages within the map iframe (30.3935, -86.4958, zoom 11).
 */
function getEmeraldCoastCoordinates(address: string, seed: string = ''): { latPercent: number; lngPercent: number } {
  const norm = (address || '').toLowerCase();
  
  // Deterministic subtle jitter (±1.5%) so multiple stops in the same community don't directly stack
  const hash = (seed + address).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const jitterLat = ((hash % 11) - 5) * 0.35;
  const jitterLng = (((hash >> 3) % 11) - 5) * 0.45;

  if (norm.includes('rosemary') || norm.includes('alys') || norm.includes('inlet') || norm.includes('32561')) {
    return { latPercent: Math.max(10, Math.min(90, 76 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 92 + jitterLng)) };
  }
  if (norm.includes('seaside') || norm.includes('seagrove') || norm.includes('watercolor') || norm.includes('grayton')) {
    return { latPercent: Math.max(10, Math.min(90, 68 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 84 + jitterLng)) };
  }
  if (norm.includes('30a') || norm.includes('santa rosa beach') || norm.includes('32559') || norm.includes('dune allen')) {
    return { latPercent: Math.max(10, Math.min(90, 62 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 76 + jitterLng)) };
  }
  if (norm.includes('miramar') || norm.includes('sandestin') || norm.includes('grand blvd') || norm.includes('32550')) {
    return { latPercent: Math.max(10, Math.min(90, 54 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 63 + jitterLng)) };
  }
  if (norm.includes('niceville') || norm.includes('bluewater') || norm.includes('valparaiso') || norm.includes('32578')) {
    return { latPercent: Math.max(10, Math.min(90, 19 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 48 + jitterLng)) };
  }
  if (norm.includes('shalimar') || norm.includes('32579') || norm.includes('eglin')) {
    return { latPercent: Math.max(10, Math.min(90, 32 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 27 + jitterLng)) };
  }
  if (norm.includes('destin') || norm.includes('32541') || norm.includes('harbor blvd') || norm.includes('legendary marina') || norm.includes('gulf terrace')) {
    return { latPercent: Math.max(10, Math.min(90, 50 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 43 + jitterLng)) };
  }
  if (norm.includes('fort walton') || norm.includes('walton beach') || norm.includes('fwb') || norm.includes('mary esther') || norm.includes('okaloosa') || norm.includes('32548')) {
    return { latPercent: Math.max(10, Math.min(90, 44 + jitterLat)), lngPercent: Math.max(10, Math.min(95, 18 + jitterLng)) };
  }

  // Fallback to central Destin area with jitter
  return { latPercent: 50 + jitterLat, lngPercent: 45 + jitterLng };
}

/**
 * Interval lane allocation algorithm to ensure overlapping appointment tiles stack
 * vertically with zero visual overlap, expanding the technician row height.
 */
function computeJobLanes(jobs: ScheduledJob[], timeDisplayMode: 'scheduled' | 'actual') {
  if (!jobs || jobs.length === 0) return { jobsWithLanes: [], laneCount: 1 };

  const parsed = jobs.map((job) => {
    const startStr = timeDisplayMode === 'actual' ? (job.actualStartTime || job.startTime) : job.startTime;
    const startHour = parseTimeToDecimalHours(startStr);
    const duration = timeDisplayMode === 'actual' ? (job.actualDurationHours || job.durationHours) : job.durationHours;
    const endHour = startHour + Math.max(0.5, duration || 2);
    return {
      job,
      startHour,
      endHour,
      duration,
    };
  });

  parsed.sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return b.endHour - a.endHour;
  });

  const laneEndTimes: number[] = [];
  const assignedJobs: (ScheduledJob & { laneIndex: number })[] = [];

  for (const item of parsed) {
    let placedLane = -1;
    for (let i = 0; i < laneEndTimes.length; i++) {
      if (laneEndTimes[i] <= item.startHour + 0.01) {
        placedLane = i;
        laneEndTimes[i] = item.endHour;
        break;
      }
    }
    if (placedLane === -1) {
      placedLane = laneEndTimes.length;
      laneEndTimes.push(item.endHour);
    }
    assignedJobs.push({
      ...item.job,
      laneIndex: placedLane,
    });
  }

  const laneCount = Math.max(1, laneEndTimes.length);
  return { jobsWithLanes: assignedJobs, laneCount };
}

export interface HoverDetailsData {
  id?: string;
  customerId?: string;
  dateTimeRangeStr: string;
  customerName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  jobNumberStr: string;
  technicians: string[];
  callNotes: string;
  posX: number;
  posY: number;
}

export interface ExpandedDayPos {
  dayNum: number;
  posX: number;
  posY: number;
}

export interface CustomerSearchRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

const mockAuthorizedPersons: AuthorizedPerson[] = [
  { id: 'auth-1', name: 'Ryan Cole', relationship: '', phone: '(850) 556-8402', email: 'ryancole464@gmail.com' },
  { id: 'auth-2', name: 'Sarah Cole', relationship: 'Spouse', phone: '(850) 556-8409', email: 'sarah.cole@example.com' },
  { id: 'auth-3', name: 'Mark Vance', relationship: 'Property Manager', phone: '(850) 424-9911', email: 'mark.vance@example.com' },
];

export interface NotificationRecipient {
  id: string;
  name: string;
  type: string;
  value: string;
}

// Phone Number Masking Helper: (888) 888-8888 format capped at 10 digits
function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function formatTimeTo12h(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
    return timeStr.toLowerCase();
  }

  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m}${ampm}`;
}

function parseTimeToDecimalHours(timeStr: string): number {
  if (!timeStr) return 8.0;
  const clean = timeStr.trim().toLowerCase();
  const isPM = clean.includes('pm');
  const isAM = clean.includes('am');
  const timeOnly = clean.replace(/[a-z]/g, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return 8.0;
  const m = parseInt(mStr || '0', 10) || 0;

  if (isPM && h < 12) {
    h += 12;
  } else if (isAM && h === 12) {
    h = 0;
  } else if (!isPM && !isAM) {
    // In our 7:00 AM - 7:00 PM schedule:
    // If h is between 1 and 6, interpret as PM (13:00 - 18:00)
    if (h >= 1 && h <= 6) {
      h += 12;
    }
  }
  return h + m / 60;
}

function formatDecimalHoursToTimeStr(decimalHours: number): string {
  const clamped = Math.max(7, Math.min(18.75, decimalHours));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatDecimalHoursTo12h(decimalHours: number): string {
  const clamped = Math.max(7, Math.min(18.75, decimalHours));
  let h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  const ampm = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

// Clean Data Model Tracing Helper Function
function buildHoverDetailsFromJob(
  job: ScheduledJob,
  dateStr: string,
  posX: number,
  posY: number
): HoverDetailsData {
  const start12h = formatTimeTo12h(job.startTime);
  const end12h = formatTimeTo12h(job.endTime || '16:00');
  const timeRange = `${start12h} - ${end12h}`;
  const typeSuffix = job.jobType ? `: ${job.jobType}` : '';
  const numOnly = job.jobNumber.replace(/[^0-9]/g, '') || '108889';
  const formattedJobNumber = job.jobNumber.includes(':') 
    ? job.jobNumber 
    : `Job: #${numOnly}${typeSuffix}`;

  return {
    id: job.id,
    customerId: job.customerId,
    dateTimeRangeStr: `${dateStr} ${timeRange}`,
    customerName: job.customer,
    addressLine1: job.addressStreet || '1420 Lakeview Drive',
    addressLine2: job.addressCityStateZip || 'Winter Park, FL 32789',
    phone: job.phone?.replace('(M):', '').trim() || '(407) 555-8121',
    jobNumberStr: formattedJobNumber,
    technicians: job.technicians && job.technicians.length > 0 ? job.technicians : ['Marcus Vance'],
    callNotes: job.callNotes || 'Scheduled appointment.',
    posX,
    posY,
  };
}

function normalizeTechName(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function getDeterministicTechRank(techName: string): number {
  const norm = normalizeTechName(techName);
  let rank = 1000;
  CANONICAL_OFFICIAL_DISPATCH_GROUPS.forEach((group, gIdx) => {
    group.members.forEach((m, mIdx) => {
      if (normalizeTechName(m) === norm) {
        rank = gIdx * 100 + mIdx;
      }
    });
  });
  return rank;
}

function sortTechsDeterministically(a: TechUser, b: TechUser): number {
  const rankA = getDeterministicTechRank(a.name);
  const rankB = getDeterministicTechRank(b.name);
  if (rankA !== rankB) return rankA - rankB;
  return a.name.localeCompare(b.name);
}

function getAppointmentTechs(appt: CanonicalAppointment | any): string[] {
  const list: string[] = [];
  const rawAssigned = cleanUserDisplayName(appt.assignedTech || appt.primaryTech || appt.technician || '');

  if (Array.isArray(appt.technicians) && appt.technicians.length > 0) {
    for (const t of appt.technicians) {
      if (typeof t === 'string' && t.trim()) {
        const cleanT = cleanUserDisplayName(t);
        const parts = cleanT.split(',').map((p: string) => p.trim()).filter(Boolean);
        list.push(...parts);
      }
    }
  }

  // If assignedTech is explicitly specified, ensure it is the primary tech.
  // If technicians had only an old/stale tech (e.g. David Ross) while assignedTech is Tyler Reed,
  // replace the stale single tech with assignedTech!
  if (rawAssigned && normalizeTechName(rawAssigned) !== 'unassigned') {
    if (list.length <= 1) {
      list.length = 0;
      list.push(rawAssigned);
    } else if (!list.some((existing) => normalizeTechName(existing) === normalizeTechName(rawAssigned))) {
      list.unshift(rawAssigned);
    }
  } else if (rawAssigned && list.length === 0) {
    list.push(rawAssigned);
  }

  const filtered = list.map(cleanUserDisplayName).filter((t) => {
    const norm = normalizeTechName(t);
    return norm && norm !== 'unassigned';
  });
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['Unassigned'];
}

function getCentralTimeParts(date: Date = new Date()): { hours: number; minutes: number; floatHours: number; displayStr: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let h = 0, m = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') m = parseInt(p.value, 10);
  }
  const displayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { hours: h, minutes: m, floatHours: h + m / 60, displayStr: displayFormatter.format(date) };
}

function parseAppointmentDate(appt: any): Date | null {
  if (!appt) return null;
  if (appt.appointmentDate && /^\d{4}-\d{2}-\d{2}$/.test(appt.appointmentDate)) {
    const [y, m, d] = appt.appointmentDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const raw = String(appt.dateTime || appt.appointmentDateTime || appt.createdDate || '').trim();
  const dateStr = raw.split('\n')[0].trim();
  const m = dateStr.match(/^0?(\d{1,2})[/-]0?(\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    return new Date(y, Number(m[1]) - 1, Number(m[2]));
  }
  const isoMatch = dateStr.match(/^(\d{4})[/-]0?(\d{1,2})[/-]0?(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parseAppointmentTimes(appt: any): { startTime: string; endTime: string; durationHours: number } {
  let startTime = appt.startTime || '';
  let endTime = appt.endTime || '';
  let duration = appt.durationHours || appt.expectedDurationHours || 1;

  const raw = String(appt.dateTime || appt.appointmentDateTime || '').trim();
  if (raw.includes('\n')) {
    const timeLine = raw.split('\n')[1]?.trim() || '';
    if (timeLine.includes('-')) {
      const [s, e] = timeLine.split('-').map((t: string) => t.trim());
      if (s && !startTime) startTime = s;
      if (e && !endTime) endTime = e;
    } else if (timeLine) {
      if (!startTime) startTime = timeLine;
    }
  } else if (!startTime && raw) {
    const extracted = extractTime12hFromIsoOrString(raw);
    if (extracted) {
      startTime = extracted;
    }
  }

  if (appt.hoursScheduled && typeof appt.hoursScheduled === 'string') {
    const parts = appt.hoursScheduled.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h)) {
      duration = Math.max(0.5, h + (isNaN(m) ? 0 : m / 60));
    }
  }

  if (!startTime) startTime = '8:00 AM';
  if (!endTime) {
    const startDec = parseTimeToDecimalHours(startTime);
    const endDec = startDec + duration;
    const endH = Math.floor(endDec);
    const endM = Math.round((endDec - endH) * 60);
    const displayH = endH % 12 || 12;
    const ampm = endH >= 12 ? 'PM' : 'AM';
    endTime = `${displayH}:${String(endM).padStart(2, '0')} ${ampm}`;
  }

  return { startTime, endTime, durationHours: duration };
}

function mapCanonicalAppointmentToScheduledJob(
  appt: CanonicalAppointment,
  customersList: CanonicalCustomer[]
): ScheduledJob {
  const cust = customersList.find((c) =>
    c.id === appt.customerId ||
    c.customerNumber === appt.customerId ||
    c.accountNumber === appt.customerId ||
    (c.name && appt.customerName && c.name.toLowerCase() === appt.customerName.toLowerCase())
  );
  const custObj = cust || {
    name: appt.customerName,
    customerType: (appt as any).customerType,
  };
  const custName = formatCustomerDisplayName(custObj as any) || appt.customerName || 'Customer';

  const custLine2 = cust?.address?.addressLine2 || (cust?.address as any)?.street2 || '';
  let fullCustAddr = '';
  if (cust?.address) {
    const st = cust.address.street || '';
    const fullSt = custLine2 && !st.includes(custLine2) ? `${st}, ${custLine2}` : st;
    fullCustAddr = [fullSt, cust.address.city, `${cust.address.state || 'FL'} ${cust.address.zipCode || ''}`.trim()].filter(Boolean).join(', ');
  }
  const rawLoc = fullCustAddr || appt.locationAddress || '';
  const { street: parsedSt, addressLine2: parsedLine2, cityStateZip: parsedCityStateZip } = splitAddressParts(rawLoc, custName);
  const street = [parsedSt, parsedLine2].filter(Boolean).join(', ') || '';
  const cityStateZip = parsedCityStateZip || [cust?.address?.city, cust?.address?.state || 'FL', cust?.address?.zipCode].filter(Boolean).join(', ') || 'Fort Walton Beach, FL 32548';

  const phone = (appt as any).phone || cust?.phone || cust?.mobilePhone || cust?.homePhone || '(850) 555-0100';

  const { startTime: parsedStartTime, endTime: parsedEndTime, durationHours: parsedDuration } = parseAppointmentTimes(appt);
  let startTimeStr = parsedStartTime;
  let endTimeStr = parsedEndTime;
  let duration = parsedDuration;

  let actualStartTimeStr = startTimeStr;
  let actualDuration = duration;

  if (appt.arrivedAt) {
    try {
      const arrDate = new Date(appt.arrivedAt);
      const arrH = arrDate.getHours();
      const arrM = arrDate.getMinutes();
      actualStartTimeStr = `${arrH}:${String(arrM).padStart(2, '0')}`;

      if (appt.completedAt) {
        const compDate = new Date(appt.completedAt);
        const diffMs = compDate.getTime() - arrDate.getTime();
        actualDuration = Math.max(0.25, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
      } else if (appt.actualDurationHours) {
        actualDuration = appt.actualDurationHours;
      }
    } catch {
      // fallback
    }
  } else if (appt.actualStartTime) {
    actualStartTimeStr = appt.actualStartTime;
    if (appt.actualDurationHours) {
      actualDuration = appt.actualDurationHours;
    }
  }

  const extractedTechs = getAppointmentTechs(appt);

  const isReq = appt.scheduleMode === 'request' ||
                appt.isServiceRequest === true ||
                (appt.status || '').toLowerCase() === 'unscheduled' ||
                appt.isScheduled === false;

  const tripHex = getTripTypeWebHex(appt.jobType);

  return {
    id: appt.id,
    customerId: appt.customerId || cust?.id || 'cust-1',
    jobNumber: `Job ${appt.jobNumber || 100000}`,
    customer: custName,
    phone,
    addressStreet: street,
    addressCityStateZip: cityStateZip,
    startTime: startTimeStr,
    endTime: endTimeStr,
    actualStartTime: actualStartTimeStr,
    durationHours: duration,
    actualDurationHours: actualDuration,
    status: (appt.status as any) || (isReq ? 'Unscheduled' : 'Scheduled'),
    isScheduled: !isReq,
    scheduleMode: isReq ? 'request' : 'schedule',
    isServiceRequest: isReq,
    isCompleted: appt.status === 'Completed',
    dotColor: tripHex,
    colorHex: tripHex,
    jobType: appt.jobType || 'Residential - Diagnostic',
    technicians: extractedTechs,
    callNotes: appt.serviceNotes || '',
    designationOverride: appt.designationOverride || undefined,
  };
}

const TECH_AVATAR_COLORS = [
  'bg-emerald-600', 'bg-[#70b53c]', 'bg-blue-600', 'bg-purple-600',
  'bg-amber-600', 'bg-cyan-600', 'bg-rose-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-orange-600', 'bg-[#2d82b7]', 'bg-lime-600'
];

const initialTechUsers: TechUser[] = CANONICAL_OFFICIAL_USERS.map((u, i) => ({
  id: u.id,
  name: cleanUserDisplayName(u.displayName || `${u.firstName} ${u.lastName}`.trim() || 'Tech'),
  avatarColor: TECH_AVATAR_COLORS[i % TECH_AVATAR_COLORS.length],
  initials: u.initials || 'TC',
  dispatchGroup: u.dispatchGroups?.[0] || 'Appliance Techs',
  scheduledJobs: [],
}));

// Time slots: 7am to 6pm (12 columns total: 7:00 AM to 7:00 PM)
const hourSlots = [
  '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'
];

export default function WexSchedulePage() {
  const { currentUser, permissions } = useSession();
  const { users: liveUsers } = useUsers();
  const { dispatchGroups: liveDispatchGroups } = useDispatchGroups();

  const allUsersList = useMemo(() => {
    return liveUsers && liveUsers.length > 0 ? liveUsers : CANONICAL_OFFICIAL_USERS;
  }, [liveUsers]);

  const allTechNamesList = useMemo(() => {
    return allUsersList.map((u) => cleanUserDisplayName(u.displayName || `${u.firstName} ${u.lastName}`.trim() || 'Tech'));
  }, [allUsersList]);

  const availableDispatchGroups = useMemo(() => {
    if (liveDispatchGroups && liveDispatchGroups.length > 0) {
      return liveDispatchGroups.map((g) => g.name);
    }
    return CANONICAL_OFFICIAL_DISPATCH_GROUPS.map((g) => g.name);
  }, [liveDispatchGroups]);

  // Top View State (Calendar, List, Map)
  const [topTab, setTopTab] = useState<'calendar' | 'list' | 'map'>('calendar');
  const [dispatchGroup, setDispatchGroup] = useState<string>('Appliance Techs');

  // Live Current Time State (Updates every 30 seconds)
  const [liveTime, setLiveTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Technician Filter State
  const [selectedTechNames, setSelectedTechNames] = useState<string[]>([]);
  const [showTechFilterPopover, setShowTechFilterPopover] = useState(false);
  
  // Scheduled vs Actual Time Filter State
  const [timeDisplayMode, setTimeDisplayMode] = useState<'scheduled' | 'actual'>('scheduled');

  // Work Queue State
  const [showWorkQueue, setShowWorkQueue] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [queueTab, setQueueTab] = useState<'all' | 'requests' | 'unassigned'>('all');
  
  // Timeline View State (daily, monthly)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Popover Position State for "+X more" day appointments card
  const [activeExpandedDayPos, setActiveExpandedDayPos] = useState<ExpandedDayPos | null>(null);

  // Modal State for Appointment Details
  const [selectedJobModal, setSelectedJobModal] = useState<ScheduledJob | null>(null);

  // Modal State for "Create New Appointment or Event"
  const [showCreateNewModal, setShowCreateNewModal] = useState(false);
  const [newModalTab, setNewModalTab] = useState<'appointment' | 'event'>('appointment');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Modal State for "Create New Customer"
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustFirstName, setNewCustFirstName] = useState('');
  const [newCustLastName, setNewCustLastName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('FL');
  const [newCustZip, setNewCustZip] = useState('');

  // Modal State for Quick Edit Customer Locations
  const [showQuickEditLocations, setShowQuickEditLocations] = useState(false);

  // Modal State for Full Customer Call / Appointment Booking (Log Call with Appointment is default)
  const [selectedCustomerBooking, setSelectedCustomerBooking] = useState<CustomerSearchRecord | null>(null);
  const [bookingLocation, setBookingLocation] = useState<string>('');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [bookingCallMode, setBookingCallMode] = useState<'call_only' | 'call_with_appt'>('call_with_appt');
  const [bookingSubTab, setBookingSubTab] = useState<'appointment' | 'notes' | 'balance' | 'maintenance' | 'equipment'>('appointment');
  const [bookingScheduleMode, setBookingScheduleMode] = useState<'schedule' | 'request'>('schedule');

  const getTodayDateStr = () => getEasternDateString(0);

  const [bookingDate, setBookingDate] = useState(() => getEasternDateString(0));
  const [bookingFrequency, setBookingFrequency] = useState('one time');
  const [bookingStartHour, setBookingStartHour] = useState('8');
  const [bookingStartMin, setBookingStartMin] = useState('00');
  const [bookingStartAmpm, setBookingStartAmpm] = useState<'AM' | 'PM'>('AM');
  const [bookingEndHour, setBookingEndHour] = useState('9');
  const [bookingEndMin, setBookingEndMin] = useState('00');
  const [bookingEndAmpm, setBookingEndAmpm] = useState<'AM' | 'PM'>('AM');

  // Primary Tech Empty By Default & Assign Later State
  const [bookingPrimaryTech, setBookingPrimaryTech] = useState('');
  const [bookingAssignLater, setBookingAssignLater] = useState(false);

  const [bookingAdditionalTech, setBookingAdditionalTech] = useState('');
  const [bookingSelectedJob, setBookingSelectedJob] = useState('New Job');
  const [bookingJobType, setBookingJobType] = useState('');

  // Formatted Phone Input State
  const [bookingPhoneNumber, setBookingPhoneNumber] = useState('');

  // Primary Appointment Contact Inline Form State
  const [showPrimaryApptContact, setShowPrimaryApptContact] = useState(false);
  const [primaryApptContactPerson, setPrimaryApptContactPerson] = useState('Ryan Cole');
  const [primaryApptContactType, setPrimaryApptContactType] = useState('SMS');
  const [primaryApptContactValue, setPrimaryApptContactValue] = useState('(850) 556-8402');

  // Appointment Status and Confirmation States (Update Appointment Window)
  const [bookingApptStatus, setBookingApptStatus] = useState<'Scheduled' | 'Missed' | 'In Progress' | 'Complete' | 'Incomplete'>('Scheduled');
  const [bookingApptConfirmed, setBookingApptConfirmed] = useState<'Not Confirmed' | 'Confirmed'>('Not Confirmed');

  // Appointment Notices Popover State
  const [showNoticesPopover, setShowNoticesPopover] = useState(false);

  // Date Picker Popover State
  const [showDatePickerPopover, setShowDatePickerPopover] = useState(false);
  const headerDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerDatePickerRef.current &&
        !headerDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePickerPopover(false);
      }
    }
    if (showDatePickerPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePickerPopover]);

  // Job Calls & Notes List State (User, Date/Time, Note)
  const [jobNotesList, setJobNotesList] = useState<JobNoteItem[]>([]);

  // Other Calls & Notes for this Location State
  const [otherLocationNotesList, setOtherLocationNotesList] = useState<JobNoteItem[]>([]);

  // Customer Location Installed Equipment List
  const [mockLocationEquipment, setMockLocationEquipment] = useState<CustomerEquipment[]>([]);

  // Customer Maintenance Plans State
  const [mockCustomerMaintenancePlans, setMockCustomerMaintenancePlans] = useState<CustomerMaintenancePlan[]>([]);

  const parseJobTimeStr = (timeStr: string) => {
    if (!timeStr) return { hour: '8', min: '00', ampm: 'AM' };
    let ampm = 'AM';
    let cleanStr = timeStr.trim().toLowerCase();

    if (cleanStr.includes('pm')) {
      ampm = 'PM';
      cleanStr = cleanStr.replace('pm', '').trim();
    } else if (cleanStr.includes('am')) {
      ampm = 'AM';
      cleanStr = cleanStr.replace('am', '').trim();
    }

    const parts = cleanStr.split(':');
    let h = parseInt(parts[0], 10) || 8;
    const m = parts[1] ? parts[1].slice(0, 2) : '00';

    if (h >= 12) {
      if (h > 12) h -= 12;
      ampm = 'PM';
    } else if (h === 0) {
      h = 12;
      ampm = 'AM';
    }

    return { hour: String(h), min: m, ampm };
  };

  // Clipboard Feedback Indicator State for Equipment
  const [copiedEquipmentKey, setCopiedEquipmentKey] = useState<string | null>(null);

  const handleCopyEquipmentValue = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEquipmentKey(key);
    setTimeout(() => setCopiedEquipmentKey(null), 2000);
  };

  const handleOpenEditServiceRequest = (item?: any) => {
    let customerObj: any = null;
    if (item?.customerId) {
      customerObj = customers.find((c) => c.id === item.customerId || c.accountNumber === item.customerId);
    }
    if (!customerObj && item?.customerName) {
      customerObj = customers.find((c) => c.name.toLowerCase() === item.customerName.toLowerCase());
    }
    if (!customerObj) {
      customerObj = {
        id: item?.customerId || `cust-${item?.id || 'new'}`,
        name: item?.customerName || 'Customer',
        phone: item?.phone || '',
        email: item?.email || '',
        address: item?.locationAddress || item?.addressLine1 || '',
      };
    }

    setSelectedCustomerBooking(customerObj);
    setBookingCallMode('call_with_appt');
    setBookingSubTab('appointment');
    setBookingScheduleMode('request');
    setBookingJobType(item?.jobType || 'Residential - Diagnostic');
    setReqMinTechLevel(String(item?.minSkillLevel || '1'));
    const durParts = String(item?.expectedLength || '1:00').split(':');
    setReqDurationHour(durParts[0] || '1');
    setReqDurationMin(durParts[1]?.replace(/[^\d]/g, '') || '00');
    setEditingJobId(item?.id || `sr-${Date.now()}`);
    const srJobNum = String(item?.jobNumber || '').replace(/^#|^Job\s*/i, '').trim() || String(item?.id || '').replace(/^(job|appt|sr)-/i, '').trim();
    setBookingSelectedJob(srJobNum ? `#${srJobNum}` : '#New');
    if (item?.locationAddress) {
      setBookingLocation(item.locationAddress);
    }
    setShowCreateNewModal(false);
  };

  const handleOpenEditAppointment = (job: ScheduledJob) => {
    setEditingJobId(job.id);
    setBookingCallMode('call_with_appt');
    setBookingSubTab('appointment');
    setBookingScheduleMode((job as any).isServiceRequest || (job as any).scheduleMode === 'request' || (job.status as any) === 'Unscheduled' ? 'request' : 'schedule');

    const startParsed = parseJobTimeStr(job.startTime);
    const endParsed = parseJobTimeStr(job.endTime || '09:00');

    setBookingStartHour(startParsed.hour);
    setBookingStartMin(startParsed.min);
    setBookingStartAmpm(startParsed.ampm as 'AM' | 'PM');

    setBookingEndHour(endParsed.hour);
    setBookingEndMin(endParsed.min);
    setBookingEndAmpm(endParsed.ampm as 'AM' | 'PM');

    const tech0 = job.technicians?.[0] || '';
    const cleanTech = tech0.toLowerCase() === 'unassigned' ? '' : tech0;
    setBookingPrimaryTech(cleanTech);
    setBookingAdditionalTech(job.technicians?.[1] || '');
    setBookingCallNotes(job.callNotes || '');
    setBookingPhoneNumber(job.phone || '(850) 556-8402');
    setBookingJobType(job.jobType || '');
    setBookingApptStatus(job.status || (job.isCompleted ? 'Complete' : 'Scheduled'));
    setBookingApptConfirmed(job.confirmed || 'Not Confirmed');

    const cleanJobDigits = String(job.jobNumber || '').replace(/^#|^Job\s*/i, '').trim() || String(job.id || '').replace(/^(job|appt|sr)-/i, '').trim();
    setBookingSelectedJob(`#${cleanJobDigits}`);

    // Resolve true customer ID
    let resolvedCustomerId = job.customerId;
    if (!resolvedCustomerId || resolvedCustomerId.startsWith('job-') || resolvedCustomerId.startsWith('sr-') || resolvedCustomerId.startsWith('appt-')) {
      const match = customers.find(
        (c) => c.name.toLowerCase() === job.customer.toLowerCase() ||
               c.id === job.customerId ||
               c.accountNumber === job.customer
      );
      resolvedCustomerId = match ? match.id : (job.customerId || `cust-${job.id}`);
    }

    const rawLoc = (job as any).locationAddress || `${job.addressStreet || '1420 Lakeview Drive'}, ${job.addressCityStateZip || 'Winter Park, FL 32789'}`;
    const cleanAddr = formatCleanLocationString(rawLoc);
    setBookingLocation(cleanAddr);

    setSelectedCustomerBooking({
      id: resolvedCustomerId,
      name: job.customer,
      phone: job.phone || '(407) 555-8121',
      email: 'eleanor.vance@example.com',
      address: cleanAddr,
    });
    setBookingNewCallContact(job.customer);

    // Populate Job Calls & Notes with the note left during appointment creation & any job notes
    const loadedNotes: JobNoteItem[] = [];
    const apptCreationNote = job.callNotes || (job as any).appointmentNote || (job as any).serviceNotes || '';
    if (apptCreationNote && apptCreationNote.trim()) {
      loadedNotes.push({
        id: `note-appt-${job.id}`,
        user: job.technicians?.[0] || 'Ryan Cole',
        dateTime: (job as any).appointmentDate ? `${(job as any).appointmentDate} ${job.startTime || '08:00 AM'}` : '8/27/2026 08:00 AM',
        noteText: apptCreationNote.trim(),
        isEditing: false,
      });
    }

    // Add any callsAndNotes or existing notes
    if (Array.isArray((job as any).callsAndNotes)) {
      (job as any).callsAndNotes.forEach((cn: any, idx: number) => {
        const txt = typeof cn === 'string' ? cn : (cn.notes || cn.note || cn.content || '');
        if (txt && !loadedNotes.some((n) => n.noteText === txt)) {
          loadedNotes.push({
            id: cn.id || `cn-${idx}`,
            user: cn.user || cn.authorName || 'Staff',
            dateTime: cn.dateTime || cn.createdAt || 'Previous Note',
            noteText: txt,
            isEditing: false,
          });
        }
      });
    }

    setJobNotesList(loadedNotes);
  };

  // Interactive WEX Date / Time Picker Popover State
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [newCallDateTimeStr, setNewCallDateTimeStr] = useState('8/10/2026 08:00 am');
  const [newCallDayNum, setNewCallDayNum] = useState(10);
  const [newCallHourInput, setNewCallHourInput] = useState('08');
  const [newCallMinInput, setNewCallMinInput] = useState('00');
  const [newCallAmpmInput, setNewCallAmpmInput] = useState('AM');

  // Service Request Specific States (Screenshot Exact Fields)
  const [reqDurationHour, setReqDurationHour] = useState('1 hour');
  const [reqDurationMin, setReqDurationMin] = useState('00 min');
  const [reqMinTechLevel, setReqMinTechLevel] = useState('Level 1');

  const [bookingCallNotes, setBookingCallNotes] = useState('');
  const [bookingNewCallContact, setBookingNewCallContact] = useState('');
  const [bookingCallTypeOnly, setBookingCallTypeOnly] = useState<'Inbound' | 'Outbound'>('Inbound');
  const [bookingCallActivityTypeOnly, setBookingCallActivityTypeOnly] = useState<string>('Call');
  const [bookingCallLocationOnly, setBookingCallLocationOnly] = useState<string>('');
  const [bookingNewCallType, setBookingNewCallType] = useState<'Inbound' | 'Outbound'>('Inbound');

  // Individual Toggles for Notification Options (Only 'En route' is toggled on by default)
  const [notifyScheduled, setNotifyScheduled] = useState(false);
  const [notify1Week, setNotify1Week] = useState(false);
  const [notify1Day, setNotify1Day] = useState(false);
  const [notifyEnRoute, setNotifyEnRoute] = useState(true);

  // Dynamic Recipients List
  const [recipientsList, setRecipientsList] = useState<NotificationRecipient[]>([
    { id: 'rec-1', name: 'Ryan Cole', type: 'Email', value: 'ryancole464@gmail.com' }
  ]);

  // Other Event Form States
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Meeting');
  const [eventColor, setEventColor] = useState('#C91F37');
  const [eventPlace, setEventPlace] = useState('');
  const [eventDate, setEventDate] = useState('2026-08-10');
  const [eventFrequency, setEventFrequency] = useState('one time');
  const [startTime, setStartTime] = useState('6:00 pm');
  const [endTime, setEndTime] = useState('8:00 pm');
  const [selectedEventUser, setSelectedEventUser] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // 1.5s Hover Details Popover State & Grace Timer
  const [hoverDetails, setHoverDetails] = useState<HoverDetailsData | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverGraceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Database Hooks
  const { databaseMode, client } = useDatabaseMode();
  const { appointments, saveAppointment: saveLiveAppointment } = useAppointments();
  const { customers } = useCustomers();
  const { jobs, saveJob: saveLiveJob } = useJobs();
  const { calls, saveCall: saveLiveCall } = useCalls();
  const queryClient = useQueryClient();

  const activeSelectedCustomer = customers.find(
    (c) => (selectedCustomerBooking?.id && (c.id === selectedCustomerBooking.id || c.accountNumber === selectedCustomerBooking.id)) ||
           (selectedCustomerBooking?.name && c.name.toLowerCase() === selectedCustomerBooking.name.toLowerCase())
  );
  const activeCustomerAuthPersons = (activeSelectedCustomer?.authorizedPersons || (selectedCustomerBooking as any)?.authorizedPersons || []) as Array<{ id: string; name?: string; firstName?: string; lastName?: string; positionLabel?: string; relationship?: string; phone?: string; email?: string }>;

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

  const [modalCustomerInvoices, setModalCustomerInvoices] = useState<CanonicalInvoice[]>([]);
  const [modalCustomerCalls, setModalCustomerCalls] = useState<CanonicalCall[]>([]);
  const [modalCustomerNotes, setModalCustomerNotes] = useState<CanonicalNote[]>([]);

  // Fetch live Equipment, Maintenance Plans, Invoices, Calls & Notes when selectedCustomerBooking changes
  useEffect(() => {
    let isMounted = true;
    async function loadCustomerDetails() {
      if (!selectedCustomerBooking?.id) {
        setMockLocationEquipment([]);
        setMockCustomerMaintenancePlans([]);
        setModalCustomerInvoices([]);
        setModalCustomerCalls([]);
        setModalCustomerNotes([]);
        return;
      }

      try {
        const custId = selectedCustomerBooking.id;
        const [eqList, mpList, invList, callsList, notesList] = await Promise.all([
          client.fetchEquipment(custId, undefined, databaseMode),
          client.fetchMaintenancePlans(custId, databaseMode),
          client.fetchInvoices(custId, databaseMode),
          client.fetchCalls(databaseMode),
          client.fetchNotes(databaseMode),
        ]);

        if (isMounted) {
          setMockLocationEquipment(eqList.map((e: any) => ({
            id: e.id,
            name: e.name || e.equipmentType || e.systemType || 'Equipment',
            installDate: formatInstallDate(e.installDate || e.installedOn),
            mfg: e.manufacturer || e.mfg || '',
            serialNo: e.serialNumber || e.serialNo || '',
            modelNo: e.modelNumber || e.modelNo || '',
            status: e.status || (e.isArchived ? 'Inactive' : 'active'),
            locationAddress: e.locationAddress || e.location || '',
          })));

          setMockCustomerMaintenancePlans(mpList.map((mp) => ({
            id: mp.id,
            name: mp.name,
            noPaymentPlan: !mp.billingFrequency || mp.billingFrequency === 'Annual',
            expirationDate: mp.expiresDate || '',
            contractPrice: `$${(mp.contractTotal || mp.annualPrice || 0).toFixed(2)}`,
            annualPrice: `$${(mp.annualPrice || 0).toFixed(2)}`,
            appliedAmount: `$0.00`,
            locationAddress: (mp as any).locationAddress || '',
          })));

          setModalCustomerInvoices(invList || []);
          setModalCustomerCalls((callsList || []).filter((c) => (c.customerId && c.customerId === custId) || (c.customerName && c.customerName.toLowerCase() === selectedCustomerBooking.name.toLowerCase())));
          setModalCustomerNotes((notesList || []).filter((n: any) => (n.customerId && n.customerId === custId) || (n.authorName && n.authorName.toLowerCase() === selectedCustomerBooking.name.toLowerCase()) || (n.author && n.author.toLowerCase() === selectedCustomerBooking.name.toLowerCase())));
        }
      } catch (err) {
        console.error('Error fetching live customer details for appointment modal:', err);
      }
    }

    loadCustomerDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedCustomerBooking?.id, databaseMode, client]);

  // Live and Mock Work Queue Data Derivation
  const liveServiceRequests = useMemo(() => {
    return appointments.filter((appt) => {
      const statusLower = (appt.status || '').toLowerCase();
      return (
        appt.type === 'service_request' ||
        statusLower === 'unscheduled' ||
        appt.isScheduled === false
      );
    });
  }, [appointments]);

  const liveUnassignedAppts = useMemo(() => {
    return appointments.filter((appt) => {
      const statusLower = (appt.status || '').toLowerCase();
      const isScheduledWithDate = appt.isScheduled !== false && Boolean(appt.dateTime) && statusLower !== 'unscheduled';
      const isUnassignedTech = !appt.assignedTechId && !appt.assignedTech;
      return isScheduledWithDate && isUnassignedTech;
    });
  }, [appointments]);

  const activeServiceRequests = useMemo(() => {
    return liveServiceRequests.map((appt) => {
      const cust = customers.find((c) => c.id === appt.customerId || c.accountNumber === appt.customerId);
      const custName = cust?.name || appt.customerName || 'Customer';
      const line2 = cust?.address?.addressLine2 || (cust?.address as any)?.street2 || '';
      let addrFromCust = '';
      if (cust?.address) {
        const st = cust.address.street || '';
        const fullSt = line2 && !st.includes(line2) ? `${st}, ${line2}` : st;
        addrFromCust = [fullSt, cust.address.city, `${cust.address.state || 'FL'} ${cust.address.zipCode || ''}`.trim()]
          .filter(Boolean)
          .join(', ');
      }
      const rawLoc = appt.locationAddress || addrFromCust || '';
      const { street: parsedSt, addressLine2: parsedLine2, cityStateZip: parsedCityStateZip } = splitAddressParts(rawLoc, custName);
      const fallbackCityStateZip = [cust?.address?.city, cust?.address?.state || 'FL', cust?.address?.zipCode].filter(Boolean).join(', ');
      const finalCityStateZip = parsedCityStateZip || fallbackCityStateZip || 'Fort Walton Beach, FL 32548';

      return {
        id: appt.id,
        jobNumber: appt.jobNumber || 100000,
        customerName: custName,
        customerId: appt.customerId || cust?.id || '',
        jobType: appt.jobType || 'Residential - Diagnostic',
        minSkillLevel: appt.minSkillLevel || 1,
        expectedLength: `${appt.expectedDurationHours || appt.durationHours || 1}:00 hrs`,
        addressLine1: parsedSt,
        addressLine2: parsedLine2,
        cityStateZip: finalCityStateZip,
        rawAppt: appt,
      };
    });
  }, [liveServiceRequests, customers]);

  const activeUnassignedAppts = useMemo(() => {
    return liveUnassignedAppts.map((appt) => {
      const cust = customers.find((c) => c.id === appt.customerId || c.accountNumber === appt.customerId);
      const custName = cust?.name || appt.customerName || 'Customer';
      const line2 = cust?.address?.addressLine2 || (cust?.address as any)?.street2 || '';
      let addrFromCust = '';
      if (cust?.address) {
        const st = cust.address.street || '';
        const fullSt = line2 && !st.includes(line2) ? `${st}, ${line2}` : st;
        addrFromCust = [fullSt, cust.address.city, `${cust.address.state || 'FL'} ${cust.address.zipCode || ''}`.trim()]
          .filter(Boolean)
          .join(', ');
      }
      const rawLoc = appt.locationAddress || addrFromCust || '';
      const { street: parsedSt, addressLine2: parsedLine2, cityStateZip: parsedCityStateZip } = splitAddressParts(rawLoc, custName);
      const fallbackCityStateZip = [cust?.address?.city, cust?.address?.state || 'FL', cust?.address?.zipCode].filter(Boolean).join(', ');
      const finalCityStateZip = parsedCityStateZip || fallbackCityStateZip || 'Fort Walton Beach, FL 32548';

      return {
        id: appt.id,
        jobNumber: appt.jobNumber || 100000,
        customerName: custName,
        customerId: appt.customerId || cust?.id || '',
        jobType: appt.jobType || 'Residential - Diagnostic',
        minSkillLevel: appt.minSkillLevel || 1,
        expectedLength: `${appt.expectedDurationHours || appt.durationHours || 1}:00 hrs`,
        addressLine1: parsedSt,
        addressLine2: parsedLine2,
        cityStateZip: finalCityStateZip,
        rawAppt: appt,
      };
    });
  }, [liveUnassignedAppts, customers]);

  const allQueueItems = useMemo(() => {
    if (queueTab === 'requests') return activeServiceRequests;
    if (queueTab === 'unassigned') return activeUnassignedAppts;
    return [...activeServiceRequests, ...activeUnassignedAppts];
  }, [queueTab, activeServiceRequests, activeUnassignedAppts]);

  // Dynamic Recipient Handlers for Authorized Persons & Channel Toggle (Email / SMS)
  const handleRecipientTypeChange = (id: string, newType: string) => {
    setRecipientsList((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const authP = activeCustomerAuthPersons.find((p) => (p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()) === r.name);
        let newValue = '';
        if (authP) {
          newValue = newType === 'SMS' ? (authP.phone || '') : (authP.email || '');
        } else if (selectedCustomerBooking) {
          newValue = newType === 'SMS' ? (selectedCustomerBooking.phone || '') : (selectedCustomerBooking.email || '');
        }
        return { ...r, type: newType, value: newValue };
      })
    );
  };

  const handleRecipientPersonChange = (id: string, newName: string) => {
    setRecipientsList((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const authP = activeCustomerAuthPersons.find((p) => (p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()) === newName);
        let newValue = '';
        if (authP) {
          newValue = r.type === 'SMS' ? (authP.phone || '') : (authP.email || '');
        } else if (selectedCustomerBooking) {
          newValue = r.type === 'SMS' ? (selectedCustomerBooking.phone || '') : (selectedCustomerBooking.email || '');
        }
        return { ...r, name: newName, value: newValue };
      })
    );
  };

  // Date State (Live Date)
  const [currentDateObj, setCurrentDateObj] = useState<Date>(new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state for switching technician rows
  const [techUsers, setTechUsers] = useState<TechUser[]>(initialTechUsers);
  const [draggedTechId, setDraggedTechId] = useState<string | null>(null);
  const [dragOverTechId, setDragOverTechId] = useState<string | null>(null);

  // Dynamic Technician & Appointment Synchronization
  useEffect(() => {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();
    const day = currentDateObj.getDate();

    const dayAppts = appointments.filter((appt) => {
      if (
        appt.type === 'service_request' ||
        appt.scheduleMode === 'request' ||
        appt.isServiceRequest === true ||
        (appt.status || '').toLowerCase() === 'unscheduled' ||
        appt.isScheduled === false
      ) {
        return false;
      }
      const d = parseAppointmentDate(appt);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    const standardTechs: TechUser[] = allUsersList.map((u) => {
      const name = u.displayName || `${u.firstName} ${u.lastName}`.trim() || 'Tech';
      const normUName = normalizeTechName(name);
      
      let group = '';
      if (liveDispatchGroups && liveDispatchGroups.length > 0) {
        const matchDg = liveDispatchGroups.find((dg) => dg.members.some((m) => normalizeTechName(m) === normUName));
        if (matchDg) group = matchDg.name;
      }
      if (!group && u.dispatchGroups?.[0]) {
        group = u.dispatchGroups[0];
      }
      if (!group) {
        const matchDg = CANONICAL_OFFICIAL_DISPATCH_GROUPS.find((dg) => dg.members.some((m) => normalizeTechName(m) === normUName));
        if (matchDg) group = matchDg.name;
      }
      if (!group) group = 'HVAC Techs';

      const techAppts = dayAppts.filter((a) => {
        const assigned = getAppointmentTechs(a);
        return assigned.some((t) => normalizeTechName(t) === normUName);
      });
      const mappedJobs = techAppts.map((a) => mapCanonicalAppointmentToScheduledJob(a, customers));
      const rank = getDeterministicTechRank(name);

      return {
        id: u.id,
        name,
        initials: u.initials || 'TC',
        avatarColor: TECH_AVATAR_COLORS[rank % TECH_AVATAR_COLORS.length],
        dispatchGroup: group,
        scheduledJobs: mappedJobs,
      };
    });

    const generatedTechs = [...standardTechs];

    setTechUsers((prev) => {
      if (prev.length > 0) {
        const orderMap = new Map(prev.map((t, idx) => [t.id, idx]));
        generatedTechs.sort((a, b) => {
          const aIdx = orderMap.get(a.id);
          const bIdx = orderMap.get(b.id);
          if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
          if (aIdx !== undefined) return -1;
          if (bIdx !== undefined) return 1;
          return sortTechsDeterministically(a, b);
        });
      } else {
        generatedTechs.sort(sortTechsDeterministically);
      }
      const prevSerialized = JSON.stringify(prev);
      const nextSerialized = JSON.stringify(generatedTechs);
      if (prevSerialized === nextSerialized) return prev;
      return generatedTechs;
    });
  }, [allUsersList, appointments, customers, currentDateObj, liveDispatchGroups]);

  // Dynamic Month Appointments Map derived from real Firestore appointments in sandbox/live mode
  const monthlyJobsByDay = useMemo(() => {
    const map: Record<number, ScheduledJob[]> = {};
    const targetYear = currentDateObj.getFullYear();
    const targetMonth = currentDateObj.getMonth();

    for (const appt of appointments) {
      if (
        appt.type === 'service_request' ||
        appt.scheduleMode === 'request' ||
        appt.isServiceRequest === true ||
        (appt.status || '').toLowerCase() === 'unscheduled' ||
        appt.isScheduled === false
      ) {
        continue;
      }
      const d = parseAppointmentDate(appt);
      if (!d) continue;
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(mapCanonicalAppointmentToScheduledJob(appt, customers));
      }
    }
    return map;
  }, [appointments, currentDateObj, customers, databaseMode]);

  const matchesDispatchGroup = (
    userGroups: string[] | undefined,
    fallbackGroup: string | undefined,
    selectedGroup: string,
    techName?: string
  ): boolean => {
    if (!selectedGroup || selectedGroup === 'All Techs') return true;
    const target = selectedGroup.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Check liveDispatchGroups membership
    if (techName && liveDispatchGroups && liveDispatchGroups.length > 0) {
      const matchingGroupDoc = liveDispatchGroups.find(
        (dg) => dg.name.toLowerCase().replace(/[^a-z0-9]/g, '') === target
      );
      if (matchingGroupDoc && Array.isArray(matchingGroupDoc.members)) {
        const normTech = normalizeTechName(techName);
        return matchingGroupDoc.members.some((m) => normalizeTechName(m) === normTech);
      }
    }

    // 2. Check canonical dispatch groups fallback
    if (techName) {
      const canonGroup = CANONICAL_OFFICIAL_DISPATCH_GROUPS.find(
        (dg) => dg.name.toLowerCase().replace(/[^a-z0-9]/g, '') === target
      );
      if (canonGroup && Array.isArray(canonGroup.members)) {
        const normTech = normalizeTechName(techName);
        if (canonGroup.members.some((m) => normalizeTechName(m) === normTech)) {
          return true;
        }
      }
    }

    // 3. Check user's assigned dispatch groups
    const groupsToCheck = userGroups && userGroups.length > 0 ? userGroups : (fallbackGroup ? [fallbackGroup] : []);
    if (groupsToCheck.length === 0) return false;
    return groupsToCheck.some((g) => {
      const normG = g.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normG) return false;
      if (normG === target) return true;
      if (normG.includes(target) || target.includes(normG)) return true;
      if (normG.startsWith(target) || target.startsWith(normG)) return true;
      return false;
    });
  };

  const activeGroupTechNames = useMemo(() => {
    return techUsers
      .filter((t) => {
        if (dispatchGroup === 'All Techs') return true;
        const userObj = allUsersList.find((u) => normalizeTechName(u.displayName || `${u.firstName} ${u.lastName}`) === normalizeTechName(t.name));
        return matchesDispatchGroup(userObj?.dispatchGroups, t.dispatchGroup, dispatchGroup, t.name);
      })
      .sort(sortTechsDeterministically)
      .map((t) => t.name);
  }, [techUsers, dispatchGroup, allUsersList, liveDispatchGroups]);

  useEffect(() => {
    setSelectedTechNames(activeGroupTechNames);
  }, [activeGroupTechNames]);

  const displayedTechUsers = useMemo(() => {
    return techUsers.filter((t) => {
      if (dispatchGroup !== 'All Techs') {
        const userObj = allUsersList.find((u) => normalizeTechName(u.displayName || `${u.firstName} ${u.lastName}`) === normalizeTechName(t.name));
        if (!matchesDispatchGroup(userObj?.dispatchGroups, t.dispatchGroup, dispatchGroup, t.name)) return false;
      }
      return selectedTechNames.includes(t.name);
    });
  }, [techUsers, dispatchGroup, selectedTechNames, allUsersList, liveDispatchGroups]);

  // Appointment Drag & Drop State
  const [draggedAppointment, setDraggedAppointment] = useState<{
    sourceTechId: string;
    job: ScheduledJob;
    grabOffsetPx?: number;
  } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    techId: string;
    snappedStartTime: string;
    snappedStartHour: number;
    posXPercent: number;
  } | null>(null);

  const [dragMovedFeedback, setDragMovedFeedback] = useState<{
    jobId: string;
    message: string;
  } | null>(null);

  // Dynamic Recipient Add / Remove Handlers
  const handleAddRecipient = () => {
    const nextPerson = mockAuthorizedPersons[recipientsList.length % mockAuthorizedPersons.length];
    setRecipientsList([
      ...recipientsList,
      { id: `rec-${Date.now()}`, name: nextPerson.name, type: 'Email', value: nextPerson.email }
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    if (recipientsList.length > 1) {
      setRecipientsList(recipientsList.filter((r) => r.id !== id));
    }
  };

  // Outside click listener for popover cards
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.day-popover-container')) {
        setActiveExpandedDayPos(null);
      }
      if (!target.closest('.tech-filter-container')) {
        setShowTechFilterPopover(false);
      }
      if (!target.closest('.datetime-picker-container')) {
        setShowDateTimePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Hover 1.5s Delay Handlers with Mouse Travel Grace Period
  const handleTileMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>, 
    job: ScheduledJob
  ) => {
    if (draggedAppointment) {
      setHoverDetails(null);
      return;
    }
    if (hoverGraceTimerRef.current) {
      clearTimeout(hoverGraceTimerRef.current);
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const posX = Math.min(window.innerWidth - 340, Math.max(10, rect.left - 20));
    const posY = Math.max(10, rect.top - 240);

    const activeMonthYearStr = currentDateObj.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' });
    const formattedDateStr = `${activeMonthYearStr.split('/')[0]}/${String(currentDateObj.getDate()).padStart(2, '0')}/${currentDateObj.getFullYear()}`;

    hoverTimerRef.current = setTimeout(() => {
      setHoverDetails(buildHoverDetailsFromJob(job, formattedDateStr, posX, posY));
    }, 1500); // Exact 1.5 Seconds Hover Delay
  };

  const handleTileMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    // 200ms Grace Period allowing cursor to travel onto the hover card
    hoverGraceTimerRef.current = setTimeout(() => {
      setHoverDetails(null);
    }, 200);
  };

  // Dynamic Date Navigation Handlers
  const handlePrevDate = () => {
    setActiveExpandedDayPos(null);
    setHoverDetails(null);
    setCurrentDateObj((prev) => {
      if (viewMode === 'monthly') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      }
    });
  };

  const handleNextDate = () => {
    setActiveExpandedDayPos(null);
    setHoverDetails(null);
    setCurrentDateObj((prev) => {
      if (viewMode === 'monthly') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      }
    });
  };

  const handleToday = () => {
    setActiveExpandedDayPos(null);
    setHoverDetails(null);
    setCurrentDateObj(new Date());
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split('-').map(Number);
      setActiveExpandedDayPos(null);
      setHoverDetails(null);
      setCurrentDateObj(new Date(year, month - 1, day));
    }
  };

  // Drag and Drop Row Reordering Handlers (Technician Rows)
  const handleTechDragStart = (e: React.DragEvent, techId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'tech_row', techId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTechId(techId);
  };

  const handleTechDragEnd = () => {
    setDraggedTechId(null);
    setDragOverTechId(null);
  };

  const handleTechRowDragOver = (e: React.DragEvent, targetTechId: string) => {
    if (draggedTechId && draggedTechId !== targetTechId) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverTechId !== targetTechId) {
        setDragOverTechId(targetTechId);
      }
    }
  };

  const handleTechRowDragLeave = (targetTechId: string) => {
    if (dragOverTechId === targetTechId) {
      setDragOverTechId(null);
    }
  };

  const handleTechRowDrop = (e: React.DragEvent, targetTechId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTechId || draggedTechId === targetTechId) {
      setDraggedTechId(null);
      setDragOverTechId(null);
      return;
    }

    const fromIndex = techUsers.findIndex((t) => t.id === draggedTechId);
    const toIndex = techUsers.findIndex((t) => t.id === targetTechId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...techUsers];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setTechUsers(updated);
    }

    setDraggedTechId(null);
    setDragOverTechId(null);
  };

  // Appointment Tile Drag & Drop Handlers
  const handleAppointmentDragStart = (e: React.DragEvent, sourceTechId: string, job: ScheduledJob) => {
    e.stopPropagation();
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    if (hoverGraceTimerRef.current) {
      clearTimeout(hoverGraceTimerRef.current);
    }
    setHoverDetails(null);

    const tileElem = e.currentTarget as HTMLElement;
    const tileRect = tileElem.getBoundingClientRect();
    const grabOffsetPx = Math.max(0, e.clientX - tileRect.left);

    setDraggedAppointment({ sourceTechId, job, grabOffsetPx });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'appointment', sourceTechId, jobId: job.id, grabOffsetPx }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAppointmentDragEnd = () => {
    setDraggedAppointment(null);
    setDragOverTarget(null);
  };

  const handleTimelineDragOver = (e: React.DragEvent<HTMLDivElement>, techId: string) => {
    if (draggedTechId) {
      handleTechRowDragOver(e, techId);
      return;
    }
    if (!draggedAppointment) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffsetPx = draggedAppointment.grabOffsetPx || 0;
    const tileLeftX = Math.max(0, Math.min(rect.width, e.clientX - rect.left - grabOffsetPx));
    const percent = tileLeftX / rect.width;
    const rawHours = 7 + percent * 12;
    const duration = draggedAppointment.job.durationHours || 2;

    const snappedHours = Math.round(rawHours * 4) / 4;
    const clampedHours = Math.max(7, Math.min(19 - duration, snappedHours));
    const snappedStartPercent = ((clampedHours - 7) / 12) * 100;
    const snappedTime12h = formatDecimalHoursTo12h(clampedHours);

    if (
      !dragOverTarget ||
      dragOverTarget.techId !== techId ||
      dragOverTarget.snappedStartHour !== clampedHours
    ) {
      setDragOverTarget({
        techId,
        snappedStartTime: snappedTime12h,
        snappedStartHour: clampedHours,
        posXPercent: snappedStartPercent,
      });
    }
  };

  const handleTimelineDragLeave = (e: React.DragEvent<HTMLDivElement>, techId: string) => {
    if (draggedTechId) {
      handleTechRowDragLeave(techId);
      return;
    }
  };

  const handleTimelineDrop = (e: React.DragEvent<HTMLDivElement>, targetTechId: string) => {
    if (draggedTechId) {
      handleTechRowDrop(e, targetTechId);
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    if (!draggedAppointment) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const grabOffsetPx = draggedAppointment.grabOffsetPx || 0;
    // Calculate the exact left-edge X coordinate of the dropped tile
    const tileLeftX = Math.max(0, Math.min(rect.width, e.clientX - rect.left - grabOffsetPx));
    const percent = tileLeftX / rect.width;
    const rawHours = 7 + percent * 12;
    const duration = draggedAppointment.job.durationHours || 2;

    // Snap cleanly to nearest 15 minutes (:00, :15, :30, :45)
    const snappedHours = Math.round(rawHours * 4) / 4;
    const clampedHours = Math.max(7, Math.min(19 - duration, snappedHours));

    const newStartTime = formatDecimalHoursToTimeStr(clampedHours);
    const newEndTime = formatDecimalHoursToTimeStr(clampedHours + duration);
    const newStartTime12h = formatDecimalHoursTo12h(clampedHours);

    const sourceTechId = draggedAppointment.sourceTechId;
    const movedJob = { ...draggedAppointment.job };

    // Find target tech
    const targetTech = techUsers.find((t) => t.id === targetTechId);
    const targetTechName = cleanUserDisplayName(targetTech?.name || 'Technician');

    movedJob.startTime = newStartTime;
    movedJob.endTime = newEndTime;
    movedJob.actualStartTime = newStartTime;
    movedJob.technicians = [targetTechName];

    if (databaseMode === 'live' || databaseMode === 'sandbox') {
      const liveAppt = appointments.find((a) => a.id === movedJob.id);
      if (liveAppt) {
        const h = Math.floor(clampedHours);
        const m = Math.round((clampedHours - h) * 60);
        const updatedDate = new Date(currentDateObj);
        updatedDate.setHours(h, m, 0, 0);

        const apptDateStr = `${updatedDate.getFullYear()}-${String(updatedDate.getMonth() + 1).padStart(2, '0')}-${String(updatedDate.getDate()).padStart(2, '0')}`;

        const updatedAppt: CanonicalAppointment = {
          ...liveAppt,
          dateTime: updatedDate.toISOString(),
          durationHours: duration,
          assignedTech: targetTechName,
          technicians: [targetTechName],
          appointmentDate: apptDateStr,
          startTime: newStartTime,
          endTime: newEndTime,
        };
        saveLiveAppointment(updatedAppt);

        const matchingJob = jobs.find(
          (j) => j.id === (liveAppt.jobId || liveAppt.id) || (j.appointments && (j.appointments as any).some((a: any) => (typeof a === 'string' ? a : a.id) === liveAppt.id))
        );
        if (matchingJob) {
          saveLiveJob({
            ...matchingJob,
            assignedTech: targetTechName,
          });
        }
      }
    }

    setTechUsers((prevTechs) => {
      return prevTechs.map((tech) => {
        if (tech.id === targetTechId) {
          return {
            ...tech,
            scheduledJobs: [...tech.scheduledJobs.filter((j) => j.id !== movedJob.id), movedJob],
          };
        } else {
          return {
            ...tech,
            scheduledJobs: tech.scheduledJobs.filter((j) => j.id !== movedJob.id),
          };
        }
      });
    });

    setDraggedAppointment(null);
    setDragOverTarget(null);

    setDragMovedFeedback({
      jobId: movedJob.id,
      message: `Moved ${movedJob.customer} to ${targetTechName} at ${newStartTime12h}`,
    });
    setTimeout(() => {
      setDragMovedFeedback(null);
    }, 3000);

    setDraggedAppointment(null);
    setDragOverTarget(null);
  };

  const isJobMatchingTechFilter = (job: ScheduledJob) => {
    if (selectedTechNames.length === 0) return false;
    if (selectedTechNames.length === activeGroupTechNames.length) return true;
    if (!job.technicians || job.technicians.length === 0) return true;
    const selectedNorms = selectedTechNames.map((n) => normalizeTechName(n));
    return job.technicians.some((t) => {
      const tNorm = normalizeTechName(t.replace('*', ''));
      return selectedNorms.includes(tNorm);
    });
  };

  // Filtered customer search matching list (Strictly live customers in live and sandbox modes)
  const allCustomerSearchRecords: CustomerSearchRecord[] = React.useMemo(() => {
    const liveRecords: CustomerSearchRecord[] = customers.map((c) => {
      const addr = (c.address && c.address.street && c.address.street.toLowerCase() !== 'primary location' && c.address.street.toLowerCase() !== 'no street provided')
        ? `${c.address.street}${c.address.addressLine2 ? `, ${c.address.addressLine2}` : ''}, ${c.address.city}, ${c.address.state} ${c.address.zipCode}`
        : (Array.isArray(c.locations) && c.locations[0] && c.locations[0].street
            ? `${c.locations[0].street}${(c.locations[0] as any).addressLine2 ? `, ${(c.locations[0] as any).addressLine2}` : ''}, ${c.locations[0].city}, ${c.locations[0].state} ${c.locations[0].zipCode}`
            : '');
      return {
        id: c.id,
        name: c.name,
        phone: c.phone ? `Mobile: ${c.phone}` : '',
        mobile: c.mobilePhone || c.phone || '',
        email: c.email || '',
        address: addr || '',
      };
    });
    return liveRecords;
  }, [customers, databaseMode]);

  const [asyncCustomerResults, setAsyncCustomerResults] = useState<CustomerSearchRecord[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const q = customerSearchQuery.trim();
    if (!q) {
      setAsyncCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await client.fetchCustomersPaginated({ mode: databaseMode, searchQuery: q, pageSize: 25 });
        if (!isCancelled && res?.customers) {
          const mapped: CustomerSearchRecord[] = res.customers.map((c: any) => {
            const addr = (c.address && c.address.street && c.address.street.toLowerCase() !== 'primary location' && c.address.street.toLowerCase() !== 'no street provided')
              ? `${c.address.street}${c.address.addressLine2 ? `, ${c.address.addressLine2}` : ''}, ${c.address.city}, ${c.address.state} ${c.address.zipCode}`
              : (Array.isArray(c.locations) && c.locations[0] && c.locations[0].street
                  ? `${c.locations[0].street}${c.locations[0].addressLine2 ? `, ${c.locations[0].addressLine2}` : ''}, ${c.locations[0].city}, ${c.locations[0].state} ${c.locations[0].zipCode}`
                  : '');
            return {
              id: c.id,
              name: c.name,
              phone: c.phone ? `Mobile: ${c.phone}` : '',
              mobile: c.mobilePhone || c.phone || '',
              email: c.email || '',
              address: addr || '',
            };
          });
          setAsyncCustomerResults(mapped);
        }
      } catch (e) {}
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearchQuery, client, databaseMode]);

  const matchingCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const map = new Map<string, CustomerSearchRecord>();
    // Add async server results first
    for (const item of asyncCustomerResults) {
      map.set(item.id, item);
    }
    // Add in-memory matches
    for (const c of allCustomerSearchRecords) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      ) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
    }
    return Array.from(map.values());
  }, [customerSearchQuery, asyncCustomerResults, allCustomerSearchRecords]);

  // Dynamic Monthly Live Calendar Calculation
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeekInMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

  // Real today date check
  const todayDateObj = new Date();

  // Accurately Scaled Live Float Hours in Central Time (7.0 AM to 19.0 PM = 12 total hours)
  const centralTime = getCentralTimeParts(liveTime);
  const currentFloatHours = centralTime.floatHours;
  const isWithinDailyWindow = currentFloatHours >= 7 && currentFloatHours <= 19;
  const timeLinePercent = Math.min(100, Math.max(0, ((currentFloatHours - 7) / 12) * 100));

  // Generate real calendar cells for the active month
  const calendarCells: Array<{ isCurrentMonth: boolean; dayNum: number | null; colIndex: number }> = [];
  for (let i = 0; i < firstDayOfWeekInMonth; i++) {
    calendarCells.push({ isCurrentMonth: false, dayNum: null, colIndex: i % 7 });
  }
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const totalIndex = calendarCells.length;
    calendarCells.push({ isCurrentMonth: true, dayNum: d, colIndex: totalIndex % 7 });
  }
  while (calendarCells.length % 7 !== 0) {
    const totalIndex = calendarCells.length;
    calendarCells.push({ isCurrentMonth: false, dayNum: null, colIndex: totalIndex % 7 });
  }

  const numRows = Math.ceil(calendarCells.length / 7);

  // Dynamic Formatted Date String (Fixed positioning across Daily, Monthly)
  const getFormattedDateStr = () => {
    if (viewMode === 'monthly') {
      return currentDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      return currentDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formattedDateStr = getFormattedDateStr();

  const centeredListDateStr = currentDateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isoDateStr = getEasternDateString(0, currentDateObj);

  // Update DateTime string whenever user selects day / time in popover
  const updateNewCallDateTime = (day: number, hr: string, min: string, ampm: string) => {
    setNewCallDayNum(day);
    setNewCallHourInput(hr);
    setNewCallMinInput(min);
    setNewCallAmpmInput(ampm);
    setNewCallDateTimeStr(`08/${String(day).padStart(2, '0')}/2026 ${hr}:${min} ${ampm.toLowerCase()}`);
  };

  // Live Schedule List Items computed directly from techUsers & canonical appointments
  const liveScheduleListItems = useMemo(() => {
    const items: Array<{
      id: string;
      jobNumber: string;
      scheduledTimeRange: string;
      actualTimeRange: string;
      startTimeStr: string;
      techName: string;
      eventType: string;
      colorHex: string;
      customerName: string;
      status: string;
      confirmed: string;
      address: string;
      rawJob: ScheduledJob;
    }> = [];

    const activeTechs = techUsers.filter((tech) => selectedTechNames.includes(tech.name));

    for (const tech of activeTechs) {
      for (const job of tech.scheduledJobs || []) {
        const scheduledTimeRange = `${formatTimeTo12h(job.startTime)} - ${formatTimeTo12h(job.endTime || '09:00')}`;
        const actualTimeRange = (job.actualStartTime && job.actualDurationHours)
          ? `${formatTimeTo12h(job.actualStartTime)} - ${formatTimeTo12h(formatDecimalHoursToTimeStr(parseTimeToDecimalHours(job.actualStartTime) + (job.actualDurationHours || 2)))}`
          : scheduledTimeRange;
        const numOnly = (job.jobNumber || '').replace(/[^0-9]/g, '').slice(0, 6) || (job.id.replace(/[^0-9]/g, '') || '134100');

        items.push({
          id: job.id,
          jobNumber: numOnly,
          scheduledTimeRange,
          actualTimeRange,
          startTimeStr: job.startTime,
          techName: (job.technicians && job.technicians[0]) || tech.name,
          eventType: job.jobType || 'Service',
          colorHex: job.colorHex || getTripTypeWebHex(job.jobType) || '#10b981',
          customerName: job.customer,
          status: job.status || (job.isCompleted ? 'Completed' : 'Scheduled'),
          confirmed: job.confirmed || 'Not Confirmed',
          address: `${job.addressStreet || ''}, ${job.addressCityStateZip || ''}`.replace(/^, /, '').trim() || 'Fort Walton Beach, FL',
          rawJob: job,
        });
      }
    }

    return items.sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr));
  }, [techUsers, selectedTechNames]);

  // Live Map Markers & Routes computed dynamically with real Emerald Coast coordinates and numbered stops
  const { liveMapMarkers, techRoutes } = useMemo(() => {
    const markers: MapStopMarker[] = [];
    const routes: Array<{
      techId: string;
      techName: string;
      colorHex: string;
      stops: Array<{ job: ScheduledJob; latPercent: number; lngPercent: number; stopNumber: number }>;
    }> = [];

    const activeTechs = techUsers.filter((tech) => selectedTechNames.includes(tech.name));

    for (const tech of activeTechs) {
      const sortedJobs = [...(tech.scheduledJobs || [])].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      );

      const techStops: Array<{ job: ScheduledJob; latPercent: number; lngPercent: number; stopNumber: number }> = [];
      let techBaseColor = '#be4646';

      sortedJobs.forEach((job, idx) => {
        const stopNumber = idx + 1;
        const fullAddr = `${job.addressStreet || ''}, ${job.addressCityStateZip || ''}`.replace(/^, /, '').trim() || 'Fort Walton Beach, FL';
        const { latPercent, lngPercent } = getEmeraldCoastCoordinates(fullAddr, job.id);
        const techName = (job.technicians && job.technicians[0]) || tech.name;
        const initials = techName.split(' ').map((n: string) => n[0]).join('').slice(0, 4).toUpperCase();
        const colorHex = job.colorHex || getTripTypeWebHex(job.jobType) || '#10b981';
        if (idx === 0) techBaseColor = colorHex;

        const markerObj: MapStopMarker = {
          id: job.id,
          techInitials: initials,
          techName: techName,
          colorHex: colorHex,
          jobType: job.jobType,
          timeRange: `${formatTimeTo12h(job.startTime)} - ${formatTimeTo12h(job.endTime || '09:00')}`,
          jobNumber: job.jobNumber,
          customer: job.customer,
          address: fullAddr,
          latPercent,
          lngPercent,
          stopNumber,
          techId: tech.id,
        };

        markers.push(markerObj);
        techStops.push({
          job,
          latPercent,
          lngPercent,
          stopNumber,
        });
      });

      if (techStops.length > 0) {
        routes.push({
          techId: tech.id,
          techName: tech.name,
          colorHex: techBaseColor,
          stops: techStops,
        });
      }
    }

    return { liveMapMarkers: markers, techRoutes: routes };
  }, [techUsers, selectedTechNames]);

  return (
    <div className="w-full flex flex-col gap-3 text-slate-800 pb-8 text-xs font-sans">
      {/* ================= 1. Top Schedule View Bar ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-xs relative">
        {/* Left Side View Tabs (Calendar, List, Map) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTopTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer ${
              topTab === 'calendar'
                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-600" />
            <span>Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setTopTab('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer ${
              topTab === 'list'
                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-3.5 h-3.5 text-slate-600" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={() => setTopTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer ${
              topTab === 'map'
                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            <span>Map</span>
          </button>
        </div>

        {/* Center Slider Toggle: Scheduled / Actual Time (Fixed Absolute Center, Hidden in List View) */}
        {topTab !== 'list' && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs ">
            <button
              type="button"
              onClick={() => setTimeDisplayMode('scheduled')}
              className={`w-32 py-1 font-semibold text-center rounded-md transition-all duration-150 cursor-pointer ${
                timeDisplayMode === 'scheduled'
                  ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scheduled Time
            </button>
            <button
              type="button"
              onClick={() => setTimeDisplayMode('actual')}
              className={`w-32 py-1 font-semibold text-center rounded-md transition-all duration-150 cursor-pointer ${
                timeDisplayMode === 'actual'
                  ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Actual Time
            </button>
          </div>
        )}

        {/* Right Side Control: Dispatch Group Dropdown & Filter Icon Button */}
        <div className="flex items-center gap-2">
          <MenuTrigger>
            <MenuButton
              variant="ghost"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1 rounded border border-slate-300 text-xs transition-colors cursor-pointer"
              aria-label="Select Dispatch Group"
            >
              <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="font-semibold text-slate-700">Dispatch Group:</span>
              <span className="font-bold text-slate-900">{dispatchGroup}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
            </MenuButton>
            <Menu placement="bottom end" popoverClassName="min-w-[170px]">
              {availableDispatchGroups.map((gName) => (
                <MenuItem key={gName} onAction={() => setDispatchGroup(gName)}>
                  <span>{gName}</span>
                  {dispatchGroup === gName && <Check className="w-3.5 h-3.5 text-[#3f6b35] ml-auto" />}
                </MenuItem>
              ))}
              <MenuItem onAction={() => setDispatchGroup('All Techs')}>
                <span>All Techs</span>
                {dispatchGroup === 'All Techs' && <Check className="w-3.5 h-3.5 text-[#3f6b35] ml-auto" />}
              </MenuItem>
            </Menu>
          </MenuTrigger>

          {/* Filter Icon Button (No Text Label, Icon Only) */}
          {viewMode !== 'daily' && (
            <div className="relative tech-filter-container">
              <button
                type="button"
                onClick={() => setShowTechFilterPopover(!showTechFilterPopover)}
                className={`p-1.5 rounded border transition-colors cursor-pointer relative flex items-center justify-center ${
                  selectedTechNames.length < activeGroupTechNames.length
                    ? 'bg-[#be4646] text-white border-[#be4646] font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Filter Technicians"
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedTechNames.length < activeGroupTechNames.length && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#be4646] rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Technician Filter Popover Window */}
              {showTechFilterPopover && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-300 w-56 p-3 text-xs text-slate-800 space-y-2 animate-in fade-in zoom-in-95 duration-100 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-bold text-slate-800">
                    <span>Filter Technicians</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTechNames(activeGroupTechNames)}
                      className="text-[10px] text-[#be4646] hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>

                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {activeGroupTechNames.map((techName) => {
                      const isChecked = selectedTechNames.includes(techName);
                      return (
                        <label 
                          key={techName} 
                          className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedTechNames(selectedTechNames.filter((t) => t !== techName));
                              } else {
                                setSelectedTechNames([...selectedTechNames, techName]);
                              }
                            }}
                            className="rounded h-3.5 w-3.5 accent-[#be4646] cursor-pointer"
                          />
                          <span className="font-semibold text-slate-700 text-xs">{techName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. CONTENT AREA BY VIEW TAB ================= */}
      {topTab === 'list' ? (
        /* ======================================================================== */
        /* LIST VIEW (No Work Queue, No Sub-Toolbar - Full-Width List & Pagination)  */
        /* ======================================================================== */
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6 shadow-xs w-full">
          <div className="text-center border-b border-slate-200 pb-4">
            <h3 className="text-2xl font-semibold text-slate-600 font-sans tracking-tight">
              {centeredListDateStr}
            </h3>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <th className="p-3 whitespace-nowrap">Time</th>
                    <th className="p-3 whitespace-nowrap">User/Technician</th>
                    <th className="p-3 whitespace-nowrap">Event/Job Type</th>
                    <th className="p-3 whitespace-nowrap">Customer</th>
                    <th className="p-3 whitespace-nowrap">Appt. Status</th>
                    <th className="p-3 whitespace-nowrap">Appt. Confirmed</th>
                    <th className="p-3 whitespace-nowrap">Location</th>
                    <th className="p-3 whitespace-nowrap">Job #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                  {liveScheduleListItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        No appointments scheduled for this date.
                      </td>
                    </tr>
                  ) : (
                    liveScheduleListItems.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-medium whitespace-nowrap">
                          <span className="text-slate-900 font-semibold">
                            {item.scheduledTimeRange}
                          </span>
                        </td>
                        <td 
                          className="p-3 font-semibold text-[#be4646] hover:underline cursor-pointer whitespace-nowrap"
                          onClick={() => handleOpenEditAppointment(item.rawJob)}
                        >
                          {item.techName}
                        </td>
                        <td className="p-3 font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span className="font-medium">{item.eventType}</span>
                          </div>
                        </td>
                        <td 
                          className="p-3 font-semibold text-[#be4646] hover:underline cursor-pointer whitespace-nowrap"
                          onClick={() => handleOpenEditAppointment(item.rawJob)}
                        >
                          {item.customerName || <span className="text-slate-400 font-normal italic">--</span>}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.status ? (
                            <span className="text-slate-700 font-medium px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {item.status}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.confirmed ? (
                            <span className={`font-semibold ${
                              item.confirmed === 'Confirmed' ? 'text-emerald-700 font-bold' : 'text-slate-500'
                            }`}>
                              {item.confirmed}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-normal truncate max-w-xs" title={item.address}>
                          {item.address || <span className="text-slate-400 italic">--</span>}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                          <Link 
                            href={`/jobs/${item.jobNumber || item.id.replace(/^appt-/, '')}`}
                            className="text-[#be4646] hover:text-[#a63a3a] hover:underline font-semibold"
                          >
                            {item.jobNumber}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button type="button" className="px-3 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 font-medium cursor-pointer">
              First
            </button>
            <button type="button" className="px-3 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 font-medium cursor-pointer">
              Previous
            </button>
            <button type="button" className="px-3 py-1 bg-[#be4646] text-white rounded font-bold shadow-2xs">
              1
            </button>
            <button type="button" className="px-3 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 font-medium cursor-pointer">
              Next
            </button>
            <button type="button" className="px-3 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 font-medium cursor-pointer">
              Last
            </button>
          </div>
        </div>
      ) : (
        /* ======================================================================== */
        /* CALENDAR & MAP VIEWS (Dedicated Fixed Left Work Queue Header Area)       */
        /* ======================================================================== */
        <div className="space-y-3 w-full">
          {/* Main 2-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-3 items-start w-full">
            {/* Left Column: Fixed Work Queue Sidebar (Top-aligned with Schedule Toolbar) */}
            {showWorkQueue && (
              <div className="shrink-0">
                <div className="w-full lg:w-80 transition-all duration-200 ease-out origin-left">
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2 shadow-xs">
                    {/* Integrated Work Queue Card Header */}
                    <div className="flex items-center justify-between px-0.5 pb-1 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-800">Work Queue</span>
                      <button
                        type="button"
                        onClick={() => setShowWorkQueue(false)}
                        className="text-[11px] font-semibold text-[#be4646] hover:underline cursor-pointer"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1 border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setQueueTab('all')}
                      className={`h-11 px-1 py-1 text-[11px] font-semibold text-center leading-tight rounded transition-colors flex flex-col justify-center items-center cursor-pointer ${
                        queueTab === 'all'
                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>Show All ({activeServiceRequests.length + activeUnassignedAppts.length})</span>
                    </button>
                    <button
                      onClick={() => setQueueTab('requests')}
                      className={`h-11 px-1 py-1 text-[11px] font-semibold text-center leading-tight rounded transition-colors flex flex-col justify-center items-center cursor-pointer ${
                        queueTab === 'requests'
                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>Service</span>
                      <span>Requests ({activeServiceRequests.length})</span>
                    </button>
                    <button
                      onClick={() => setQueueTab('unassigned')}
                      className={`h-11 px-1 py-1 text-[11px] font-semibold text-center leading-tight rounded transition-colors flex flex-col justify-center items-center cursor-pointer ${
                        queueTab === 'unassigned'
                          ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>Unassigned</span>
                      <span>Appts ({activeUnassignedAppts.length})</span>
                    </button>
                  </div>

                  {allQueueItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-300 space-y-1 mt-1">
                      <div className="font-semibold text-slate-700 text-xs">
                        {queueTab === 'requests'
                          ? 'No Service Requests'
                          : queueTab === 'unassigned'
                          ? 'No Unassigned Appts'
                          : 'Work Queue Empty'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {queueTab === 'requests'
                          ? 'There are no pending service requests.'
                          : queueTab === 'unassigned'
                          ? 'There are no unassigned appointments for this date.'
                          : 'No service requests or unassigned appointments in the queue.'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-0.5">
                      {allQueueItems.map((item) => (
                        <div key={item.id} className="border border-slate-300 rounded-md overflow-hidden shadow-2xs mt-1">
                          <div
                            style={{ backgroundColor: getTripTypeWebHex(item.jobType) }}
                            className="text-white px-2.5 py-1 font-bold text-xs flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{item.jobType}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEditServiceRequest(item)}
                              className="p-0.5 hover:bg-white/20 rounded transition-colors cursor-pointer"
                              title="Edit Service Request"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>

                          <div className="bg-white px-2.5 py-2 space-y-0.5 text-xs text-slate-700 font-sans">
                            <div className="flex items-center justify-between text-xs font-bold pb-0.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditServiceRequest(item)}
                                className="text-[#be4646] hover:underline font-bold text-left cursor-pointer"
                              >
                                Job: {item.jobNumber}
                              </button>
                              <Link
                                href={`/customers/${item.customerId || encodeURIComponent(item.customerName)}`}
                                className="text-[#be4646] hover:underline font-bold text-right cursor-pointer truncate max-w-[140px]"
                              >
                                {item.customerName}
                              </Link>
                            </div>

                            <div className="flex items-start justify-between text-[11px] text-slate-600 font-normal gap-2 leading-tight">
                              <div className="flex flex-col shrink-0 text-left space-y-0.5">
                                <span>Min. Skill Level: {item.minSkillLevel}</span>
                                <span>Expected Length: {item.expectedLength}</span>
                              </div>
                              <div className="flex flex-col text-right text-slate-700 font-normal break-words flex-1 space-y-0.5">
                                <span>{item.addressLine1}</span>
                                {item.addressLine2 ? <span>{item.addressLine2}</span> : null}
                                <span>{item.cityStateZip}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

            {/* Right Column: Schedule Sub-Toolbar & Main View (Calendar / Map) */}
            <div className="flex-1 space-y-3 w-full transition-all duration-200 ease-out">
              {/* Schedule Module Sub-Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs relative z-30">
                <div className="flex items-center gap-2">
                  {!showWorkQueue && (
                    <button
                      type="button"
                      onClick={() => setShowWorkQueue(true)}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded shadow-2xs text-[#be4646] hover:text-[#a63a3a] cursor-pointer flex items-center justify-center transition-colors shrink-0"
                      title="Show Work Queue"
                    >
                      <ChevronRight className="w-4 h-4 text-[#be4646]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery('');
                      setSelectedCustomerBooking(null);
                      setEditingJobId(null);
                      setShowCreateNewModal(true);
                    }}
                    className="px-2.5 py-1 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-2xs cursor-pointer transition-colors"
                  >
                    New
                  </button>
                </div>

                {/* Absolutely Centered Date Heading - Clickable to toggle Date Picker Popover */}
                <div ref={headerDatePickerRef} className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div
                    onClick={() => setShowDatePickerPopover(!showDatePickerPopover)}
                    className="font-bold text-base text-slate-900 tracking-tight text-center cursor-pointer hover:text-[#2d82b7] transition-colors whitespace-nowrap flex items-center gap-1.5 "
                    title="Click to pick date"
                  >
                    <span>{formattedDateStr}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showDatePickerPopover ? 'rotate-180 text-[#2d82b7]' : ''}`} />
                  </div>

                  {/* Date Picker Popover Window - React Aria Calendar */}
                  {showDatePickerPopover && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100] bg-white rounded-lg shadow-xl border border-slate-200 p-3.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <AriaCalendar
                        value={new CalendarDate(
                          currentDateObj.getFullYear(),
                          currentDateObj.getMonth() + 1,
                          currentDateObj.getDate()
                        )}
                        onChange={(d) => {
                          if (d) {
                            const newD = new Date(d.year, d.month - 1, d.day);
                            setCurrentDateObj(newD);
                            setShowDatePickerPopover(false);
                          }
                        }}
                        className="w-64 "
                      >
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
                    </div>
                  )}
                </div>

                {topTab !== 'map' && (
                  <div className="flex items-center gap-2 relative ml-auto transition-all duration-200">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={isoDateStr}
                      onChange={handleDateInputChange}
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                    />

                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer select-none"
                    >
                      Today
                    </button>

                    <div className="flex items-center gap-1 select-none">
                      <button
                        type="button"
                        onClick={handlePrevDate}
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer select-none"
                        title="Previous date/month"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-700 pointer-events-none" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextDate}
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer select-none"
                        title="Next date/month"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700 pointer-events-none" />
                      </button>
                    </div>

                    <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-300 select-none">
                      <button
                        onClick={() => setViewMode('daily')}
                        className={`px-2 py-0.5 text-xs font-semibold rounded cursor-pointer select-none ${
                          viewMode === 'daily' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-2 py-0.5 text-xs font-semibold rounded cursor-pointer select-none ${
                          viewMode === 'monthly' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* VIEW 1: CALENDAR TIMELINE OR LIVE VIEWPORT-FITTING MONTHLY GRID VIEW */}
              {topTab === 'calendar' ? (
                viewMode === 'monthly' ? (
                  /* ======================================================================== */
                  /* LIVE VIEWPORT-FITTING MONTHLY VIEW (No Blue Day Box Fill, Blue Label Box) */
                  /* ======================================================================== */
                  <div 
                    id="monthly-calendar-container"
                    className="bg-white rounded-lg border border-slate-200 shadow-xs w-full h-[calc(100vh-220px)] max-h-[690px] flex flex-col relative"
                  >
                    {/* EXPANDED DAY FLOATING POPOVER CARD - POSITIONED DIRECTLY NEXT TO CLICKED DAY */}
                    {activeExpandedDayPos !== null && (
                      <div 
                        style={{
                          top: `${activeExpandedDayPos.posY}px`,
                          left: `${activeExpandedDayPos.posX}px`,
                        }}
                        className="day-popover-container absolute z-50 bg-white rounded-xl shadow-2xl border border-slate-300 w-72 p-3 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-150 font-sans"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {currentDateObj.toLocaleDateString('en-US', { month: 'long' })} {activeExpandedDayPos.dayNum}, {currentDateObj.getFullYear()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveExpandedDayPos(null)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {(monthlyJobsByDay[activeExpandedDayPos.dayNum] || [])
                            .filter(isJobMatchingTechFilter)
                            .map((item) => (
                              <div
                                key={item.id}
                                onMouseEnter={(e) => handleTileMouseEnter(e, item)}
                                onMouseLeave={handleTileMouseLeave}
                                onClick={() => {
                                  handleOpenEditAppointment(item);
                                  setActiveExpandedDayPos(null);
                                }}
                                className={`p-1.5 rounded-md border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors text-xs ${
                                  item.isCompleted ? 'bg-slate-200/90 text-slate-600' : 'bg-white text-slate-800 hover:bg-slate-50'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: getTripTypeWebHex(item.jobType) || item.colorHex }} />
                                {item.isFlagged && (
                                  <Flag className="w-3 h-3 fill-slate-800 text-slate-800 shrink-0" />
                                )}
                                <span className="font-medium truncate">
                                  {item.startTime} {item.customer}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Day of Week Header Row - White Background */}
                    <div className="grid grid-cols-7 bg-white border-b border-slate-200 text-center font-bold text-slate-700 text-xs py-1.5 shrink-0">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    {/* Accurate Dynamic Month Calendar Grid */}
                    <div 
                      className="grid grid-cols-7 flex-1 bg-white text-xs divide-x divide-y divide-slate-200 h-full overflow-hidden"
                      style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
                    >
                      {calendarCells.map((cell, idx) => {
                        if (!cell.isCurrentMonth || cell.dayNum === null) {
                          // Grey background for days belonging to other months with NO info displayed
                          return (
                            <div 
                              key={idx} 
                              className="p-1.5 bg-[#f1f5f9] flex flex-col justify-between h-full overflow-hidden "
                            />
                          );
                        }

                        // Retrieve day ScheduledJob model array & filter by active technician selection
                        const allDayJobs = monthlyJobsByDay[cell.dayNum] || [];
                        const dayJobs = allDayJobs.filter(isJobMatchingTechFilter);

                        const isTodayCell = cell.dayNum === todayDateObj.getDate() && currentMonth === todayDateObj.getMonth() && currentYear === todayDateObj.getFullYear();
                        const hasOverflow = dayJobs.length > 4;
                        const visibleJobs = hasOverflow ? dayJobs.slice(0, 3) : dayJobs.slice(0, 4);
                        const overflowCount = dayJobs.length - 3;

                        return (
                          <div 
                            key={idx} 
                            className="p-1 flex flex-col justify-between h-full bg-white relative overflow-hidden"
                          >
                            {/* Day Number (Clicking jumps to Daily View for this date) */}
                            <div 
                              onClick={() => {
                                if (cell.dayNum) {
                                  setCurrentDateObj(new Date(currentYear, currentMonth, cell.dayNum));
                                  setViewMode('daily');
                                }
                              }}
                              className="text-right font-semibold text-xs text-slate-600 mb-0.5 shrink-0 flex items-center justify-end cursor-pointer hover:text-[#2d82b7]"
                            >
                              {isTodayCell ? (
                                <span className="bg-[#2d82b7] text-white font-bold px-1.5 py-0.2 rounded text-[11px] shadow-2xs">
                                  {cell.dayNum}
                                </span>
                              ) : (
                                <span>{cell.dayNum}</span>
                              )}
                            </div>

                            {/* Event Badges (Trip type colored dot leftmost) */}
                            <div className="space-y-0.5 overflow-hidden flex-1">
                              {visibleJobs.map((job) => (
                                <div
                                  key={job.id}
                                  onMouseEnter={(e) => handleTileMouseEnter(e, job)}
                                  onMouseLeave={handleTileMouseLeave}
                                  onClick={() => handleOpenEditAppointment(job)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border border-slate-300 font-medium truncate leading-tight flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                                    job.isCompleted
                                      ? 'bg-slate-200/90 text-slate-600 border-slate-300' // Darker grey fill for completed appointments
                                      : 'bg-white hover:bg-slate-50 text-slate-800' // Transparent/white fill with grey outline
                                  }`}
                                >
                                  {/* 1. Trip Type Colored Dot Badge */}
                                  <div className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: getTripTypeWebHex(job.jobType) || job.colorHex }} />

                                  {/* 2. Flag icon if applicable (after circle, before text) */}
                                  {job.isFlagged && (
                                    <Flag className="w-3 h-3 fill-slate-800 text-slate-800 shrink-0" />
                                  )}

                                  {/* 3. Text string (Medium Font Weight) */}
                                  <span className="truncate font-medium">{job.startTime} {job.customer}</span>
                                </div>
                              ))}
                            </div>

                            {/* Red Overflow Indicator (+X more) */}
                            {hasOverflow && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeExpandedDayPos?.dayNum === cell.dayNum) {
                                    setActiveExpandedDayPos(null);
                                  } else {
                                    const cellRect = e.currentTarget.closest('div')?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect();
                                    const calContainer = document.getElementById('monthly-calendar-container');
                                    const calRect = calContainer?.getBoundingClientRect() || { left: 0, top: 0 };
                                    
                                    // Position popover directly next to clicked day cell
                                    let posX = cellRect.left - calRect.left - 290;
                                    if (cell.colIndex <= 3 || posX < 10) {
                                      posX = cellRect.right - calRect.left + 10;
                                    }
                                    const posY = Math.max(10, cellRect.top - calRect.top - 10);
                                    if (cell.dayNum) {
                                      setActiveExpandedDayPos({ dayNum: cell.dayNum, posX, posY });
                                    }
                                  }
                                }}
                                className="text-[10px] font-bold text-[#be4646] hover:underline cursor-pointer pt-0.5 text-left shrink-0"
                              >
                                +{overflowCount} more
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* DAILY / WEEKLY CALENDAR TIMELINE VIEW */
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs w-full">
                    <div className="overflow-x-auto relative">
                      <div className="min-w-[1200px] relative">
                        {/* Timeline Header Row */}
                        <div className="flex border-b border-slate-200 bg-slate-50">
                          <div className="w-36 p-2 font-bold text-slate-700 border-r border-slate-200 shrink-0 bg-slate-100 flex items-center">
                            <span>Users</span>
                          </div>

                          <div 
                            className="flex-1 text-left font-bold text-[11px] text-slate-600 divide-x divide-slate-200"
                            style={{ display: 'grid', gridTemplateColumns: `repeat(${hourSlots.length}, minmax(80px, 1fr))` }}
                          >
                            {hourSlots.map((slot) => (
                              <div key={slot} className="py-2 pl-2.5 bg-slate-50 relative group text-left">
                                <span>{slot}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Live Red Current Time Line (Precisely scaled across 12-hour timeline from 7:00 AM to 7:00 PM) */}
                        {isWithinDailyWindow && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none transition-all duration-500 shadow-xs"
                            style={{ left: `calc(144px + ((100% - 144px) * (${timeLinePercent} / 100)))` }}
                            title={`Current Live Time (${centralTime.displayStr} CT)`}
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-[3px] -mt-1 shadow-2xs" />
                          </div>
                        )}

                        {/* Draggable Tech User Rows - Filtered by Technician Filter Selection */}
                        <div className="divide-y divide-slate-200">
                          {displayedTechUsers.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">
                              No technicians to display for &quot;{dispatchGroup}&quot;.
                            </div>
                          ) : (
                            displayedTechUsers.map((tech) => {
                              const isBeingDragged = draggedTechId === tech.id;
                              const isDragTarget = dragOverTechId === tech.id;
                              const { jobsWithLanes, laneCount } = computeJobLanes(tech.scheduledJobs, timeDisplayMode);
                              const rowMinHeightPx = Math.max(56, 8 + laneCount * 50);
                              
                              return (
                                <div 
                                  key={tech.id} 
                                  onDragOver={(e) => handleTechRowDragOver(e, tech.id)}
                                  onDragLeave={() => handleTechRowDragLeave(tech.id)}
                                  onDrop={(e) => handleTechRowDrop(e, tech.id)}
                                  style={{ minHeight: `${rowMinHeightPx}px` }}
                                  className={`flex transition-all duration-150 relative ${
                                    isBeingDragged 
                                      ? 'opacity-30 bg-slate-100 scale-[0.995]' 
                                      : isDragTarget 
                                      ? 'bg-blue-50/70 ring-2 ring-[#2d82b7] ring-inset z-10' 
                                      : 'hover:bg-slate-50/50 bg-white'
                                  }`}
                                >
                                  <div 
                                    draggable
                                    onDragStart={(e) => handleTechDragStart(e, tech.id)}
                                    onDragEnd={handleTechDragEnd}
                                    className={`w-36 p-2 border-r border-slate-200 shrink-0 flex items-center justify-between group transition-colors cursor-grab active:cursor-grabbing select-none self-stretch ${
                                      isDragTarget ? 'bg-blue-100/50' : 'bg-white hover:bg-slate-50'
                                    }`}
                                    title="Grab to switch / reorder technician row"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <div 
                                        className="text-slate-400 group-hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>

                                      <span className="font-semibold text-slate-800 text-xs break-words leading-tight flex-1" title={tech.name}>
                                        {tech.name}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Droppable Technician Timeline Slot */}
                                  <div 
                                    className="flex-1 relative bg-white divide-x divide-slate-200"
                                    style={{ display: 'grid', gridTemplateColumns: `repeat(${hourSlots.length}, minmax(80px, 1fr))` }}
                                    onDragOver={(e) => handleTimelineDragOver(e, tech.id)}
                                    onDragLeave={(e) => handleTimelineDragLeave(e, tech.id)}
                                    onDrop={(e) => handleTimelineDrop(e, tech.id)}
                                  >
                                    {hourSlots.map((slot, i) => (
                                      <div key={i} className="h-full relative flex border-r border-slate-200 pointer-events-none">
                                        <div className="w-1/2 h-full border-r border-dashed border-slate-200/80" />
                                        <div className="w-1/2 h-full" />
                                      </div>
                                    ))}

                                    {/* Real-time Grid Auto-Snap Indicator Preview Box */}
                                    {dragOverTarget?.techId === tech.id && draggedAppointment && (
                                      <div
                                        style={{
                                          left: `${Math.max(0, dragOverTarget.posXPercent)}%`,
                                          width: `${((draggedAppointment.job.durationHours || 2) / 12) * 100}%`,
                                          top: '4px',
                                          bottom: '4px',
                                        }}
                                        className="absolute rounded border-2 border-dashed border-[#2d82b7] bg-[#2d82b7]/20 z-20 pointer-events-none flex items-center justify-between px-2 shadow-xs transition-none"
                                      >
                                        <span className="text-[10px] font-bold text-[#1e5d83] bg-white/95 px-1.5 py-0.5 rounded shadow-2xs">
                                          {dragOverTarget.snappedStartTime}
                                        </span>
                                      </div>
                                    )}

                                    {/* Draggable Appointment Tiles */}
                                    {jobsWithLanes.map((job) => {
                                      const isBeingDragged = draggedAppointment?.job.id === job.id;
                                      const startHourStr = timeDisplayMode === 'actual' ? (job.actualStartTime || job.startTime) : job.startTime;
                                      const decimalHours = parseTimeToDecimalHours(startHourStr);
                                      const duration = timeDisplayMode === 'actual' ? (job.actualDurationHours || job.durationHours) : job.durationHours;

                                      const startOffset = decimalHours - 7;
                                      const startPercent = (startOffset / 12) * 100;
                                      const widthPercent = (duration / 12) * 100;
                                      const tileTopPx = 4 + job.laneIndex * 50;

                                      return (
                                        <div
                                          key={job.id}
                                          draggable
                                          onMouseDown={() => {
                                            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                                            if (hoverGraceTimerRef.current) clearTimeout(hoverGraceTimerRef.current);
                                            setHoverDetails(null);
                                          }}
                                          onDragStart={(e) => handleAppointmentDragStart(e, tech.id, job)}
                                          onDragEnd={handleAppointmentDragEnd}
                                          onMouseEnter={(e) => {
                                            if (!draggedAppointment) handleTileMouseEnter(e, job);
                                          }}
                                          onMouseLeave={handleTileMouseLeave}
                                          onClick={() => handleOpenEditAppointment(job)}
                                          style={{
                                            left: `${Math.max(0, startPercent)}%`,
                                            width: `${widthPercent}%`,
                                            top: `${tileTopPx}px`,
                                            height: '46px',
                                            backgroundColor: !job.isCompleted ? (getTripTypeWebHex(job.jobType) || job.colorHex) : undefined,
                                            borderColor: !job.isCompleted ? (getTripTypeWebHex(job.jobType) || job.colorHex) : undefined,
                                          }}
                                          title="Drag to reassign appointment or click to edit"
                                          className={`absolute rounded px-1.5 py-0.5 border shadow-xs flex flex-col justify-center gap-0 z-10 cursor-grab active:cursor-grabbing overflow-hidden leading-tight hover:brightness-95 ${
                                            isBeingDragged
                                              ? 'opacity-25 border-dashed border-2 border-slate-500'
                                              : job.isCompleted
                                              ? 'bg-slate-200/90 text-slate-700 border-slate-300'
                                              : 'text-white'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                                            {job.isFlagged && (
                                              <Flag className={`w-3 h-3 shrink-0 drop-shadow-xs ${job.isCompleted ? 'fill-slate-700 text-slate-700' : 'fill-white text-white'}`} />
                                            )}
                                            <span className="truncate">{job.customer}</span>
                                          </div>

                                          <div className="text-[10px] font-normal opacity-90 truncate leading-tight flex items-center justify-between">
                                            <span className="truncate">{job.addressStreet}</span>
                                            <span className="text-[9px] font-medium opacity-80 shrink-0 ml-1">
                                              {formatTimeTo12h(timeDisplayMode === 'actual' ? (job.actualStartTime || job.startTime) : job.startTime)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* VIEW 3: ACTUAL GOOGLE MAPS VIEW WITH EMERALD COAST ROUTES */
                <div className="bg-[#f8fafc] rounded-lg border border-slate-200 overflow-hidden shadow-xs relative w-full h-[650px]">
                  <iframe
                    title="Google Maps Coverage Area"
                    src="https://maps.google.com/maps?q=30.3935,-86.4958&z=11&output=embed"
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                  />

                  {/* SVG Route Lines Connecting Stops Per Technician */}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                    <defs>
                      {techRoutes.map((route) => (
                        <marker
                          key={`arrow-${route.techId}`}
                          id={`arrow-${route.techId}`}
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 1 L 8 5 L 0 9 z" fill={route.colorHex} />
                        </marker>
                      ))}
                    </defs>
                    {techRoutes.map((route) => {
                      if (route.stops.length < 2) return null;
                      const pointsStr = route.stops.map((s) => `${s.lngPercent},${s.latPercent}`).join(' ');
                      return (
                        <g key={`route-${route.techId}`}>
                          {/* Background Glow/Outline */}
                          <polyline
                            points={pointsStr}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-90"
                          />
                          {/* Colored Route Line */}
                          <polyline
                            points={pointsStr}
                            fill="none"
                            stroke={route.colorHex}
                            strokeWidth="2.4"
                            strokeDasharray="4 2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerEnd={`url(#arrow-${route.techId})`}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Emerald Coast Technician Routes Legend */}
                  <div className="absolute top-3 right-3 z-40 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg shadow-md p-2.5 max-w-xs text-xs space-y-1.5 pointer-events-auto">
                    <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between pb-1 border-b border-slate-100">
                      <span>Emerald Coast Routes</span>
                      <span className="text-[10px] text-slate-500 font-normal">{liveMapMarkers.length} stops</span>
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {techRoutes.map((tr) => (
                        <div key={tr.techId} className="flex flex-col gap-0.5 text-[11px]">
                          <div className="flex items-center justify-between font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tr.colorHex }} />
                              <span className="text-slate-800">{tr.techName}</span>
                            </div>
                            <span className="text-slate-500 text-[10px]">{tr.stops.length} stop{tr.stops.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="pl-4 text-[10px] text-slate-500 truncate">
                            {tr.stops.map((s) => `${s.stopNumber}. ${s.job.addressCityStateZip?.split(',')[0] || s.job.addressStreet || 'Stop'}`).join(' → ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stop Markers */}
                  {liveMapMarkers.map((marker) => {
                    const isSelected = selectedMarkerId === marker.id;

                    return (
                      <div
                        key={marker.id}
                        style={{
                          top: `${marker.latPercent}%`,
                          left: `${marker.lngPercent}%`,
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-40 group cursor-pointer"
                        onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            style={{ backgroundColor: marker.colorHex }}
                            className="relative w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xl transform transition-transform hover:scale-110"
                          >
                            {marker.techInitials}
                            {/* Numbered Stop Badge */}
                            <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white border border-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                              {marker.stopNumber}
                            </span>
                          </div>
                          <div
                            style={{ backgroundColor: marker.colorHex }}
                            className="w-2.5 h-2.5 transform rotate-45 -mt-1 shadow-md border border-white"
                          />
                        </div>

                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white rounded-lg shadow-2xl border border-slate-200 p-2.5 w-60 text-[11px] z-50 animate-in fade-in zoom-in-95 duration-100">
                          <div className="font-bold border-b border-slate-100 pb-1 flex justify-between items-center" style={{ color: marker.colorHex }}>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">Stop {marker.stopNumber}</span>
                              <Link href={`/jobs/${marker.jobNumber || marker.id.replace(/^appt-/, '')}`} className="flex items-center gap-1 hover:underline">
                                <span>{marker.jobNumber}</span>
                              </Link>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">{marker.techName}</span>
                          </div>
                          <div className="font-bold text-slate-900 mt-1">{marker.customer}</div>
                          <div className="text-slate-600 text-[10px] font-medium">{marker.jobType} • {marker.timeRange}</div>
                          <div className="text-slate-500 text-[10px] truncate">{marker.address}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. WEX 1.5-SECOND HOVER DETAILS POPOVER CARD ================= */}
      {hoverDetails && (
        <div 
          style={{
            position: 'fixed',
            left: `${hoverDetails.posX}px`,
            top: `${hoverDetails.posY}px`,
          }}
          onMouseEnter={() => {
            if (hoverGraceTimerRef.current) clearTimeout(hoverGraceTimerRef.current);
          }}
          onMouseLeave={() => setHoverDetails(null)}
          className="z-50 bg-white rounded-lg shadow-2xl border border-slate-300 w-80 p-3.5 text-xs text-slate-700 font-sans animate-in fade-in zoom-in-95 duration-150 space-y-2 pointer-events-auto cursor-default"
        >
          {/* Date & Time Header */}
          <div className="font-bold text-slate-900 text-xs">
            {hoverDetails.dateTimeRangeStr}
          </div>

          {/* Customer Name */}
          <div className="font-bold text-[#be4646] text-xs">
            <Link href={`/customers/${hoverDetails.customerId || 'cust-1'}`} className="hover:underline">
              {hoverDetails.customerName}
            </Link>
          </div>

          {/* Location Address */}
          <div className="text-slate-600 space-y-0.5 leading-snug">
            <div>{hoverDetails.addressLine1}</div>
            <div>{hoverDetails.addressLine2}</div>
          </div>

          {/* Phone */}
          <div className="text-slate-500 font-medium">
            {hoverDetails.phone}
          </div>

          {/* Job Number */}
          <div className="font-bold text-[#be4646]">
            <Link href={`/jobs/${hoverDetails.jobNumberStr?.replace(/[^0-9]/g, '') || hoverDetails.id?.replace(/^appt-/, '') || 'job-1'}`} className="hover:underline">
              {hoverDetails.jobNumberStr}
            </Link>
          </div>

          {/* Technicians */}
          <div className="space-y-0.5 text-slate-700">
            <div className="font-medium text-slate-500">Technicians:</div>
            {hoverDetails.technicians.map((tech, i) => (
              <div key={i} className="font-semibold text-slate-800 pl-1">{tech}</div>
            ))}
          </div>

          {/* Call Notes */}
          {hoverDetails.callNotes && (
            <div className="pt-1 border-t border-slate-200 text-slate-600 italic">
              &ldquo;{hoverDetails.callNotes}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* ================= 4. VIEW / EDIT APPOINTMENT MODAL ================= */}
      {selectedJobModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#be4646]">
                  {selectedJobModal.jobNumber}
                </span>
                {selectedJobModal.isFlagged && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[11px] flex items-center gap-1">
                    <Flag className="w-3 h-3 fill-red-700" />
                    Flagged
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <User className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Customer</div>
                  <Link
                    href={`/customers/${selectedJobModal.customerId || 'cust-1'}`}
                    className="font-bold text-[#be4646] text-sm hover:underline"
                  >
                    {selectedJobModal.customer}
                  </Link>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <PinIcon className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Location Address</div>
                  <div className="font-semibold text-slate-800">{selectedJobModal.addressStreet}</div>
                  <div className="text-slate-600">{selectedJobModal.addressCityStateZip}</div>
                </div>
              </div>

              {/* Time & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <Clock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Scheduled Time</div>
                    <div className="font-bold text-slate-800">{selectedJobModal.startTime}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Duration</div>
                    <div className="font-bold text-slate-800">{selectedJobModal.durationHours} hrs</div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Appointment Status:</span>
                <span className={`px-2.5 py-1 font-bold rounded text-xs ${
                  selectedJobModal.isCompleted ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedJobModal.isCompleted ? 'Completed' : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedJobModal(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/jobs/${selectedJobModal.jobNumber?.replace(/[^0-9]/g, '') || selectedJobModal.id?.replace(/^appt-/, '')}`}
                className="px-4 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Open Job Details</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. CREATE NEW APPOINTMENT OR EVENT MODAL ================= */}
      {showCreateNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans">
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Create New Appointment or Event
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateNewModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Equal-Width Tabs Row (1:1 Ratio) */}
            <div className="flex justify-center border-b border-slate-200 bg-slate-50/60 py-2.5">
              <div className="grid grid-cols-2 w-[380px] bg-slate-200/80 p-1 rounded-lg border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setNewModalTab('appointment')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    newModalTab === 'appointment'
                      ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Customer Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setNewModalTab('event')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center cursor-pointer ${
                    newModalTab === 'event'
                      ? 'bg-[#2d82b7] text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Other Event
                </button>
              </div>
            </div>

            {/* Tab 1 Body: Customer Appointment with WEX Style Live Matching Results */}
            {newModalTab === 'appointment' ? (
              <div className="p-5 space-y-3">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="px-3.5 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md shadow-2xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
                      title="Create New Customer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* WEX Matching Customer Results Container */}
                  {matchingCustomers.length > 0 && (
                    <div className="mt-1 bg-white rounded-md border border-slate-300 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-200 z-20">
                      {matchingCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            // Completely reset all appointment creation states
                            setEditingJobId(null);
                            setBookingCallMode('call_with_appt');
                            setBookingSubTab('appointment');
                            setBookingScheduleMode('schedule');
                            setBookingSelectedJob('New Job');
                            setBookingJobType('');
                            setBookingStartHour('08');
                            setBookingStartMin('00');
                            setBookingStartAmpm('AM');
                            setBookingEndHour('09');
                            setBookingEndMin('00');
                            setBookingEndAmpm('AM');
                            setBookingPrimaryTech('');
                            setBookingAdditionalTech('');
                            setBookingCallNotes('');
                            setJobNotesList([]);
                            setOtherLocationNotesList([]);
                            setBookingPhoneNumber(cust.phone || '(850) 556-8402');
                            setBookingApptStatus('Scheduled');
                            setBookingApptConfirmed('Not Confirmed');
                            setBookingNewCallContact(cust.name);
                            const cleanAddr = formatCleanLocationString(cust.address);
                            setBookingLocation(cleanAddr);
                            setSelectedCustomerBooking({
                              ...cust,
                              address: cleanAddr,
                            });
                            setShowCreateNewModal(false);
                            setCustomerSearchQuery('');
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors space-y-0.5"
                        >
                          <div className="font-semibold text-slate-800 text-xs">
                            {cust.name}
                          </div>
                          <div className="flex items-start justify-between gap-3 text-[11px] text-slate-500 pt-0.5">
                            <span className="italic shrink-0">{cust.phone}</span>
                            <span className="text-right text-slate-600 font-medium break-words">{cust.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Tab 2 Body: Other Event */
              <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {/* Row 1: Event Name & Event Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Event Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Event Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Color & Place/Area */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 border border-slate-300 rounded px-2 py-1 bg-white">
                      <input
                        type="color"
                        value={eventColor}
                        onChange={(e) => setEventColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={eventColor}
                        onChange={(e) => setEventColor(e.target.value)}
                        className="w-full text-xs bg-transparent focus:outline-none "
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Place/Area
                    </label>
                    <input
                      type="text"
                      value={eventPlace}
                      onChange={(e) => setEventPlace(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    />
                  </div>
                </div>

                {/* Row 3: First Event Date & Frequency (No Show Advanced label) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      First Event Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      size="sm"
                      value={eventDate}
                      onChange={(d) => setEventDate(d)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={eventFrequency}
                      onChange={(e) => setEventFrequency(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      {EVENT_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Time Start to End */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Time
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      <option value="6:00 am">6:00 am</option>
                      <option value="8:00 am">8:00 am</option>
                      <option value="10:00 am">10:00 am</option>
                      <option value="12:00 pm">12:00 pm</option>
                      <option value="2:00 pm">2:00 pm</option>
                      <option value="4:00 pm">4:00 pm</option>
                      <option value="6:00 pm">6:00 pm</option>
                    </select>
                    <span className="text-slate-500 text-xs font-medium">to</span>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                    >
                      <option value="8:00 am">8:00 am</option>
                      <option value="10:00 am">10:00 am</option>
                      <option value="12:00 pm">12:00 pm</option>
                      <option value="2:00 pm">2:00 pm</option>
                      <option value="4:00 pm">4:00 pm</option>
                      <option value="6:00 pm">6:00 pm</option>
                      <option value="8:00 pm">8:00 pm</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: Users (Technicians) - Single Select Dropdown (No info icon) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Users <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEventUser}
                    onChange={(e) => setSelectedEventUser(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                  >
                    <option value="">Select User / Technician...</option>
                    {allTechNamesList.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Row 6: Clean Plain Description Textarea */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                  />
                </div>

                {/* Footer Submit */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Event scheduled!');
                      setShowCreateNewModal(false);
                    }}
                    className="px-5 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 6. CREATE NEW CUSTOMER POPUP MODAL ================= */}
      <AddCustomerModal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        onCustomerCreated={(newCust) => {
          const locStr = newCust.address
            ? [newCust.address.street, newCust.address.city, newCust.address.state].filter(Boolean).join(', ')
            : '';
          setSelectedCustomerBooking({
            id: newCust.id,
            name: newCust.name,
            address: locStr,
            phone: newCust.phone || newCust.mobilePhone || '',
          });
          setShowCreateNewModal(false);
        }}
      />

      {/* ================= 7. FULL CUSTOMER CALL / APPOINTMENT BOOKING MODAL ================= */}
      {selectedCustomerBooking && (
        <UpdateAppointmentModal
          isOpen={Boolean(selectedCustomerBooking)}
          onClose={() => {
            setSelectedCustomerBooking(null);
            setEditingJobId(null);
            setShowCreateNewModal(false);
          }}
          customer={{
            id: selectedCustomerBooking.id || 'cust-1',
            name: selectedCustomerBooking.name,
            phone: selectedCustomerBooking.phone || '',
            email: selectedCustomerBooking.email || '',
            address: selectedCustomerBooking.address || '',
            locations: (selectedCustomerBooking as any).locations || (customers.find((c: any) => c.id === selectedCustomerBooking.id)?.locations as any),
            balance: (selectedCustomerBooking as any).balance || '$0.00',
          }}
          editingJobId={editingJobId}
          initialValues={{
            id: editingJobId || undefined,
            jobNumber: bookingSelectedJob,
            jobType: bookingJobType,
            startTime: `${bookingStartHour}:${bookingStartMin} ${bookingStartAmpm}`,
            endTime: `${bookingEndHour}:${bookingEndMin} ${bookingEndAmpm}`,
            appointmentDate: bookingDate,
            frequency: bookingFrequency,
            primaryTech: bookingPrimaryTech,
            additionalTech: bookingAdditionalTech,
            assignLater: bookingAssignLater,
            appointmentStatus: bookingApptStatus,
            appointmentConfirmation: bookingApptConfirmed,
            callNotes: bookingCallNotes,
            scheduleMode: bookingScheduleMode,
            locationAddress: bookingLocation || selectedCustomerBooking.address,
          }}
          onSave={async () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['calls'] });
            setSelectedCustomerBooking(null);
            setEditingJobId(null);
          }}
        />
      )}

      {/* Drag & Drop Reassignment Feedback Toast */}
      {dragMovedFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{dragMovedFeedback.message}</span>
          <button
            type="button"
            onClick={() => setDragMovedFeedback(null)}
            className="ml-2 text-slate-400 hover:text-white leading-none text-base cursor-pointer p-0.5"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}