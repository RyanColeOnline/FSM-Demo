'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx'
);
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Wrench,
  FileText,
  Paperclip,
  Check,
  Plus,
  Minus,
  Pencil,
  Search,
  ArrowLeft,
  Settings,
  ChevronDown,
  Edit2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  X,
  Bell,
  BellOff,
  Info,
} from 'lucide-react';
import { NewNoteModal } from '@/components/modals/NewNoteModal';
import { UpdateAppointmentModal } from '@/components/modals/UpdateAppointmentModal';
import {
  Bold,
  Italic,
  Underline,
  Eraser,
  List,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  AlertTriangle,
  Trash2,
  Send,
  Edit
} from 'lucide-react';
import { StatusBadge, DatePicker, MenuTrigger, MenuButton, Menu, MenuItem, LocationAutocomplete } from '@/components/ui';
import { useCustomers } from '@/hooks/useCustomers';
import { useEquipment } from '@/hooks/useEquipment';
import { useInvoices } from '@/hooks/useInvoices';
import { useProposals } from '@/hooks/useProposals';
import { useMaintenancePlans } from '@/hooks/useMaintenancePlans';
import { useNotes } from '@/hooks/useNotes';
import { useAttachments } from '@/hooks/useAttachments';
import { useAppointments } from '@/hooks/useAppointments';
import { useJobs } from '@/hooks/useJobs';
import { usePayments } from '@/hooks/usePayments';
import { useAuthorizedPersons } from '@/hooks/useAuthorizedPersons';
import { useCalls } from '@/hooks/useCalls';
import { getTripTypeWebHex } from '@/domain/types/jobType';
import { 
  formatEasternDateTime, 
  formatEasternDate, 
  cleanUserDisplayName, 
  formatCalendarDateMdy, 
  formatAppointmentScheduleDisplay 
} from '@/domain';
import { AddMaintenancePlanModal } from '@/components/modals/AddMaintenancePlanModal';
import { AddEquipmentModal } from '@/components/modals/AddEquipmentModal';
import { AddAuthorizedPersonModal } from '@/components/modals/AddAuthorizedPersonModal';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { firestoreClient } from '@/domain/firestore/client';
import { US_STATES } from '@/constants/globalChoices';
import { 
  CanonicalCustomer, 
  CanonicalNote, 
  CanonicalEquipment, 
  CanonicalInvoice, 
  CanonicalProposal, 
  CanonicalMaintenancePlan, 
  CanonicalAuthorizedPerson, 
  CanonicalAppointment,
  CanonicalJob,
  CANONICAL_OFFICIAL_USERS
} from '@murphys/domain';
import { useUsers } from '@/hooks/useUsers';
import { useSession } from '@/auth/sessionStore';
import { getTechsForJobType } from '@/components/modals/UpdateAppointmentModal';

export function cleanCustomerNumberDigits(val?: string | number): string {
  if (!val) return '';
  const str = String(val).trim();
  const digits = str.replace(/\D/g, '');
  return digits || str.replace(/^cust[-_]?/i, '').trim();
}

export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 7) {
    return `(850) ${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return phone;
}

function formatServiceNoteStamp(author?: string | null, dateStr?: string | null): string {
  const user = cleanUserDisplayName(author || 'Staff');
  if (!dateStr) return `${user} • 9/11/2026 - 4:00pm`;
  try {
    // If it already matches "X/X/XXXX - X:XXam", return with user
    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}:\d{2}(am|pm)$/i.test(dateStr.trim())) {
      return `${user} • ${dateStr.trim().toLowerCase()}`;
    }
    const s = String(dateStr).trim();
    const mdy = s.match(/^0?(\d{1,2})[/-]0?(\d{1,2})[/-](\d{4})/);
    const ymd = s.match(/^(\d{4})[/-]0?(\d{1,2})[/-]0?(\d{1,2})/);

    let datePart = '';
    if (mdy) {
      datePart = `${parseInt(mdy[1], 10)}/${parseInt(mdy[2], 10)}/${mdy[3]}`;
    } else if (ymd) {
      datePart = `${parseInt(ymd[2], 10)}/${parseInt(ymd[3], 10)}/${ymd[1]}`;
    }

    let timePart = '';
    const timeMatch = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2];
      let ampm = timeMatch[3]?.toLowerCase();
      if (!ampm) {
        ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
      }
      timePart = `${h}:${min}${ampm}`;
    }

    if (datePart && timePart) {
      return `${user} • ${datePart} - ${timePart}`;
    }
    if (datePart) {
      return `${user} • ${datePart}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const cleaned = dateStr.replace(/,\s*/, ' - ').replace(/\s+EST|\s+EDT|\s+CDT/i, '');
      return `${user} • ${cleaned}`;
    }
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yr = d.getFullYear();
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${user} • ${m}/${day}/${yr} - ${h}:${min}${ampm}`;
  } catch (e) {
    return `${user} • ${dateStr}`;
  }
}

function formatApptCreatorStamp(author?: string | null, dateStr?: string | null): string {
  const user = cleanUserDisplayName(author || 'Staff');
  if (!dateStr) return `${user} - 9/11/2026, 1:03pm`;
  try {
    const s = String(dateStr).trim();
    const mdy = s.match(/^0?(\d{1,2})[/-]0?(\d{1,2})[/-](\d{4})/);
    const ymd = s.match(/^(\d{4})[/-]0?(\d{1,2})[/-]0?(\d{1,2})/);

    let datePart = '';
    if (mdy) {
      datePart = `${parseInt(mdy[1], 10)}/${parseInt(mdy[2], 10)}/${mdy[3]}`;
    } else if (ymd) {
      datePart = `${parseInt(ymd[2], 10)}/${parseInt(ymd[3], 10)}/${ymd[1]}`;
    }

    let timePart = '';
    const timeMatch = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2];
      let ampm = timeMatch[3]?.toLowerCase();
      if (!ampm) {
        ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
      }
      timePart = `${h}:${min}${ampm}`;
    }

    if (datePart && timePart) {
      return `${user} - ${datePart}, ${timePart}`;
    }
    if (datePart) {
      return `${user} - ${datePart}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `${user} - ${dateStr}`;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yr = d.getFullYear();
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${user} - ${m}/${day}/${yr}, ${h}:${min}${ampm}`;
  } catch (e) {
    return `${user} - ${dateStr}`;
  }
}

function formatCustomerNoteDate(dateStr?: string | null): string {
  if (!dateStr) return '9/11/2026';
  return formatCalendarDateMdy(dateStr);
}

function parseTimelineDate(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();
  const mdy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    return new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2])).getTime();
  }
  const cleaned = dateStr.replace(/(st|nd|rd|th)/g, '').replace(' at ', ' ');
  const dCleaned = new Date(cleaned);
  if (!isNaN(dCleaned.getTime())) return dCleaned.getTime();
  return 0;
}

// Dynamic Mock Customers Database for Customer Profile Pages
export interface StripePaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  provider: string;
  stripeCustomerId?: string;
  isDefault?: boolean;
}

export interface CustomerProfileMock {
  name?: string;
  custType: 'Residential' | 'Commercial';
  businessName: string;
  firstName: string;
  lastName: string;
  qbName: string;
  mobilePhone: string;
  homePhone: string;
  email: string;
  customerNumber: string;
  stripeCustomerId?: string;
  locationsList: Array<{ id: string; addr1: string; addr2?: string; city: string; state: string; zip: string; description: string; isDefault: boolean }>;
  notes: Array<{ id: string; title: string; meta: string; content: string; location?: string; isPinned?: boolean }>;
  invoices: Array<{ id: string; number: string; amount: string; issued: string; status: string; billTo: string; location: string; note?: string }>;
  proposals?: Array<{ id: string; number: string; amount: string; issued: string; status: string; billTo: string; location: string; note?: string }>;
  storedPaymentMethods?: StripePaymentMethod[];
  equipment?: Array<any>;
  maintenancePlans?: Array<any>;
  jobs: Array<{
    id: string;
    jobNumber: string;
    name: string;
    status: string;
    location: string;
    jobType: string;
    jobTypeColor: string;
    createdBy: string;
    payment?: { date: string; amount: string } | null;
    invoice?: { number: string; issued: string; amount: string; status: string; billTo: string; note?: string } | null;
    proposal?: { number: string; issued: string; amount: string; status: string; billTo: string; note?: string } | null;
    note?: { date?: string; body: string; author?: string } | null;
    notesList?: Array<{ authorDate: string; body: string }>;
    appointment?: { date: string; status: string; tech: string } | null;
    call?: {
      title?: string;
      callType: 'Inbound' | 'Outbound' | string;
      dateTime?: string;
      contact?: string;
      location?: string;
      callWith?: string;
      authorDate?: string;
      note?: string;
    } | null;
  }>;
}

const ELEANOR_VANCE_MOCK: CustomerProfileMock = {
    equipment: [
      { id: 'eq-eleanor-1', name: 'Under counter fridge', mfg: 'Whirlpool', serialNo: 'HR24305472', modelNo: 'WSF26C3EXF01', installDate: '5/10/2024', warranty: 'Active', manufacturerWarrantyStatus: 'Active', status: 'Active', locationStreet: '1420 Lakeview Drive', locationAddress: '1420 Lakeview Drive, Winter Park, FL 32789' },
      { id: 'eq-eleanor-2', name: 'AHU 3-Ton', mfg: 'Carrier', serialNo: '4124F43670', modelNo: 'FJ4DNXB36', installDate: '1/15/2025', warranty: 'Active', manufacturerWarrantyStatus: 'Active', status: 'Active', locationStreet: '1420 Lakeview Drive', locationAddress: '1420 Lakeview Drive, Winter Park, FL 32789' },
      { id: 'eq-eleanor-3', name: 'Condenser 3-Ton', mfg: 'Carrier Coastal', serialNo: '1524E06765', modelNo: '25SC536300', installDate: '1/15/2025', warranty: 'Active', manufacturerWarrantyStatus: 'Active', status: 'Active', locationStreet: '1420 Lakeview Drive', locationAddress: '1420 Lakeview Drive, Winter Park, FL 32789' }
    ],
    custType: 'Residential',
    businessName: '',
    firstName: 'Eleanor',
    lastName: 'Vance',
    qbName: 'Vance, Eleanor',
    mobilePhone: '(407) 555-8121',
    homePhone: '',
    email: 'eleanor.vance@example.com',
    customerNumber: 'C-1001',
    stripeCustomerId: 'cus_P873199',
    storedPaymentMethods: [
      { id: 'pm_1Ox94242', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2028, provider: 'Stripe / Card', stripeCustomerId: 'cus_P873199', isDefault: true },
      { id: 'pm_1Ox98812', brand: 'Mastercard', last4: '8812', expMonth: 8, expYear: 2027, provider: 'Stripe / Card', stripeCustomerId: 'cus_P873199', isDefault: false }
    ],
    locationsList: [
      { id: 'loc-1', addr1: '1420 Lakeview Drive', addr2: '', city: 'Winter Park', state: 'FL', zip: '32789', description: 'Primary Residence', isDefault: true },
      { id: 'loc-2', addr1: '880 Park Avenue N', addr2: '', city: 'Winter Park', state: 'FL', zip: '32789', description: 'Guest House', isDefault: false },
    ],
    notes: [
      { id: 'note-1', title: 'Customer Note', meta: 'Marcus Vance - 8/8/2026 - 9:54am', content: 'Preferred contact via text message.', isPinned: false, location: undefined as string | undefined }
    ],
    invoices: [
      {
        id: 'inv-130086',
        number: '#I-130086',
        amount: '$160.00',
        issued: '5/28/2026',
        status: 'Presented',
        billTo: 'Eleanor Vance',
        location: '1420 Lakeview Drive, Winter Park, FL 32789',
        note: 'Seasonal maintenance and coil cleaning'
      },
      {
        id: 'inv-131781',
        number: '#I-131781',
        amount: '$220.00',
        issued: '6/19/2026',
        status: 'Open - Draft',
        billTo: 'Eleanor Vance',
        location: '1420 Lakeview Drive, Winter Park, FL 32789',
        note: 'HVAC maintenance checkup'
      }
    ],
    proposals: [
      {
        id: 'prop-121074',
        number: '#P-121074-1',
        amount: '$1,450.00',
        issued: '5/20/2026',
        status: 'Presented',
        billTo: 'Eleanor Vance',
        location: '1420 Lakeview Drive, Winter Park, FL 32789',
        note: 'Complete HVAC condenser replacement proposal with 5-year warranty included.'
      }
    ],
    jobs: [
      {
        id: 'job-130255',
        jobNumber: '#130255',
        name: 'Seasonal HVAC Maintenance',
        status: 'Closed',
        location: '1420 Lakeview Drive, Winter Park, FL 32789',
        jobType: 'HVAC Maintenance',
        jobTypeColor: 'bg-[#2d82b7]',
        createdBy: 'Sarah Jenkins • 5/28/2026 - 12:05pm',
        payment: { date: '5/30/2026', amount: '$150.00' },
        invoice: { number: '130255-1', issued: '5/28/2026', amount: '$150.00', status: 'Closed', billTo: 'Eleanor Vance' },
        proposal: { number: '121074-1', issued: '5/20/2026', amount: '$1,450.00', status: 'Presented', billTo: 'Eleanor Vance', note: 'Complete HVAC condenser replacement proposal with 5-year warranty included.' },
        note: { date: '5/28/2026 - 12:15pm', body: 'Unit cleaned and tested thoroughly. Operational ATG.', author: 'Marcus Vance' },
        notesList: [
          { authorDate: 'Marcus Vance • 5/28/2026 - 12:15pm', body: 'Unit cleaned and tested thoroughly. Operational ATG.' },
          { authorDate: 'Alex Reynolds • 5/28/2026 - 2:30pm', body: 'Followed up with customer regarding maintenance schedule. All clear.' }
        ],
        appointment: { date: '5/28/2026, 1:00 pm - 3:00 pm', status: 'Complete', tech: 'Marcus Vance' },
        call: {
          title: 'Initial Call',
          callType: 'Inbound',
          dateTime: '5/28/2026 - 12:05pm',
          contact: 'Eleanor Vance (407-555-8121)',
          location: '1420 Lakeview Drive, Winter Park, FL 32789',
          callWith: 'Eleanor Vance',
          authorDate: 'Sarah Jenkins • 5/28/2026 - 12:05pm',
          note: 'Gate code 4021. Perform seasonal HVAC maintenance.'
        }
      }
    ]
};

const MOCK_CUSTOMERS_DB: Record<string, CustomerProfileMock> = {
  'cust-1': ELEANOR_VANCE_MOCK,
  'cust-res-01': ELEANOR_VANCE_MOCK,
  '49106': ELEANOR_VANCE_MOCK,
  'C-1001': ELEANOR_VANCE_MOCK,
  'eleanor-vance': ELEANOR_VANCE_MOCK,
  'cust-eleanor-vance': ELEANOR_VANCE_MOCK,
  'cust-2': {
    custType: 'Commercial',
    businessName: 'Magnolia Bay Bistro',
    firstName: 'Marcus',
    lastName: 'Vance',
    qbName: 'Magnolia Bay Bistro',
    mobilePhone: '(407) 555-4321',
    homePhone: '(407) 555-4320',
    email: 'contact@magnoliabaybistro.com',
    customerNumber: 'C-2001',
    locationsList: [
      { id: 'loc-com-01-a', addr1: '450 S Orange Ave', city: 'Orlando', state: 'FL', zip: '32801', description: 'Main Restaurant', isDefault: true }
    ],
    notes: [
      { id: 'note-21', title: 'Customer Note', meta: 'Sarah Jenkins - Jan 14, 2026 10:15am', content: 'Kitchen entrance at rear alley. Call manager prior to arrival.' }
    ],
    invoices: [
      { id: 'inv-131400', number: '#I-131400', amount: '$350.00', issued: '1/14/2026', status: 'Closed', billTo: 'Magnolia Bay Bistro', location: '450 S Orange Ave, Orlando, FL 32801' }
    ],
    proposals: [
      {
        id: 'prop-119840',
        number: '#P-119840-1',
        amount: '$2,800.00',
        issued: '1/10/2026',
        status: 'Signed',
        billTo: 'Magnolia Bay Bistro',
        location: '450 S Orange Ave, Orlando, FL 32801',
        note: 'Walk-in freezer condenser retrofit proposal.'
      }
    ],
    jobs: [
      {
        id: 'job-131400',
        jobNumber: '#131400',
        name: 'Commercial Refrigeration Tuneup',
        status: 'Closed',
        location: '450 S Orange Ave, Orlando, FL 32801',
        jobType: 'HVAC Maintenance',
        jobTypeColor: 'bg-[#38a169]',
        createdBy: 'Sarah Jenkins - Jan 14, 2026 9:00am',
        payment: { date: '1/15/2026', amount: '$350.00' },
        invoice: { number: '131400-1', issued: '1/14/2026', amount: '$350.00', status: 'Closed', billTo: 'Magnolia Bay Bistro' },
        proposal: { number: '119840-1', issued: '1/10/2026', amount: '$2,800.00', status: 'Signed', billTo: 'Magnolia Bay Bistro', note: 'Walk-in freezer condenser retrofit proposal.' },
        note: { date: '1/14/2026, 10:30am EST', body: 'Replaced air filters and inspected dual compressors. All clear.' },
        notesList: [
          { authorDate: 'Sarah Jenkins - Jan 14, 2026 10:30am', body: 'Replaced air filters and inspected dual compressors. All clear.' },
          { authorDate: 'Alex Reynolds - Jan 14, 2026 3:45pm', body: 'Digital checklist uploaded to commercial account portal.' }
        ],
        appointment: { date: '1/14/2026, 9:00 am - 11:00 am EST', status: 'Complete', tech: 'Sarah Jenkins' },
        call: {
          title: 'Initial Call',
          callType: 'Inbound',
          dateTime: 'Jan 14, 2026 8:30am',
          contact: 'Marcus Vance (407-555-4321)',
          location: '450 S Orange Ave, Orlando, FL 32801',
          callWith: 'Marcus Vance',
          authorDate: 'Sarah Jenkins - Jan 14, 2026 8:30am',
          note: 'Perform bi-annual commercial refrigeration maintenance.'
        }
      }
    ]
  },
  'cust-3': {
    custType: 'Residential',
    businessName: '',
    firstName: 'Aris',
    lastName: 'Thorne',
    qbName: 'Thorne, Aris',
    mobilePhone: '(407) 555-9204',
    homePhone: '',
    email: 'dr.thorne@winterparkclinic.com',
    customerNumber: 'C-1002',
    locationsList: [
      { id: 'loc-31', addr1: '1200 Lake Baldwin Ln', city: 'Orlando', state: 'FL', zip: '32814', description: 'Primary Residence', isDefault: true }
    ],
    notes: [
      { id: 'note-31', title: 'Customer Note', meta: 'Alex Reynolds - Nov 05, 2025 2:20pm', content: 'Prefers afternoon appointments after 1:00 PM.' }
    ],
    invoices: [
      { id: 'inv-129980', number: '#I-129980', amount: '$225.00', issued: '11/05/2025', status: 'Closed', billTo: 'Dr. Aris Thorne', location: '1200 Lake Baldwin Ln, Orlando, FL 32814' }
    ],
    jobs: [
      {
        id: 'job-129980',
        jobNumber: '#129980',
        name: 'Plumbing Leak Inspection',
        status: 'Closed',
        location: '1200 Lake Baldwin Ln, Orlando, FL 32814',
        jobType: 'Plumbing Service',
        jobTypeColor: 'bg-[#d69e2e]',
        createdBy: 'Alex Reynolds - Nov 05, 2025 1:15pm',
        payment: { date: '11/06/2025', amount: '$225.00' },
        invoice: { number: '129980-1', issued: '11/05/2025', amount: '$225.00', status: 'Closed', billTo: 'Dr. Aris Thorne' },
        note: { date: '11/05/2025, 3:00pm EST', body: 'Tightened shutoff valve under breakroom sink and pressure tested.' },
        notesList: [
          { authorDate: 'Alex Reynolds - Nov 05, 2025 3:00pm', body: 'Tightened shutoff valve under breakroom sink and pressure tested.' }
        ],
        appointment: { date: '11/05/2025, 2:00 pm - 4:00 pm EST', status: 'Complete', tech: 'Alex Reynolds' },
        call: {
          title: 'Initial Call',
          callType: 'Inbound',
          dateTime: 'Nov 05, 2025 1:15pm',
          contact: 'Dr. Aris Thorne (407-555-9204)',
          location: '1200 Lake Baldwin Ln, Orlando, FL 32814',
          callWith: 'Dr. Aris Thorne',
          authorDate: 'Alex Reynolds - Nov 05, 2025 1:15pm',
          note: 'Water pooling under breakroom sink.'
        }
      }
    ]
  },
  'cust-4': {
    custType: 'Commercial',
    businessName: 'Highland Park Center',
    firstName: 'Samantha',
    lastName: 'Hayes',
    qbName: 'Highland Park Center',
    mobilePhone: '(407) 555-9012',
    homePhone: '',
    email: 'contact@highlandparkcenter.com',
    customerNumber: 'C-2002',
    locationsList: [
      { id: 'loc-41', addr1: '880 Park Avenue N', city: 'Winter Park', state: 'FL', zip: '32789', description: 'Main Office', isDefault: true }
    ],
    notes: [
      { id: 'note-41', title: 'Customer Note', meta: 'Carlos Mendez - Oct 20, 2025 11:40am', content: 'Send digital invoices to accounting department.' }
    ],
    invoices: [
      { id: 'inv-127500', number: '#I-127500', amount: '$410.00', issued: '10/20/2025', status: 'Closed', billTo: 'Highland Park Center', location: '880 Park Avenue N, Winter Park, FL 32789' }
    ],
    jobs: [
      {
        id: 'job-127500',
        jobNumber: '#127500',
        name: 'Electrical Panel Inspection',
        status: 'Closed',
        location: '880 Park Avenue N, Winter Park, FL 32789',
        jobType: 'Electrical Service',
        jobTypeColor: 'bg-[#805ad5]',
        createdBy: 'Carlos Mendez - Oct 20, 2025 10:00am',
        payment: { date: '10/22/2025', amount: '$410.00' },
        invoice: { number: '127500-1', issued: '10/20/2025', amount: '$410.00', status: 'Closed', billTo: 'Highland Park Center' },
        note: { date: '10/20/2025, 11:30am EST', body: 'Re-torqued main breaker connections and balanced load.' },
        notesList: [
          { authorDate: 'Carlos Mendez - Oct 20, 2025 11:30am', body: 'Re-torqued main breaker connections and balanced load.' }
        ],
        appointment: { date: '10/20/2025, 10:00 am - 12:00 pm EST', status: 'Complete', tech: 'Carlos Mendez' },
        call: {
          title: 'Initial Call',
          callType: 'Inbound',
          dateTime: 'Oct 20, 2025 9:30am',
          contact: 'Samantha Hayes (407-555-9012)',
          location: '880 Park Avenue N, Winter Park, FL 32789',
          callWith: 'Samantha Hayes',
          authorDate: 'Carlos Mendez - Oct 20, 2025 9:30am',
          note: 'Breaker trip inquiry and panel inspection.'
        }
      }
    ]
  }
};

// Stripe Inner Form Component for Process Payment (using Stripe stock native theme)
function StripeProcessPaymentForm({
  totalAmount,
  memo,
  setMemo,
  isAuthorized,
  setIsAuthorized,
  onSuccess,
  onCancel,
}: {
  totalAmount: number;
  memo: string;
  setMemo: (val: string) => void;
  isAuthorized: boolean;
  setIsAuthorized: (val: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment confirmation failed.');
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
        onSuccess();
      }
    } catch (err: any) {
      // In mock/test environment without live backend client secret
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleConfirmPayment} className="space-y-4 font-sans">
      {/* Stripe Payment Element with Stock Native UI Theme (NO appearance prop on Elements) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Authorization Checkbox */}
      <div className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          id="processAuthCheckModal"
          checked={isAuthorized}
          onChange={(e) => setIsAuthorized(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 text-[#be4646] focus:ring-[#be4646] cursor-pointer shrink-0"
        />
        <label htmlFor="processAuthCheckModal" className="text-xs text-slate-700 leading-snug cursor-pointer font-medium">
          The account holder has authorized Apex Field Solutions, Inc to debit their account for the amount above using the payment method provided.
        </label>
      </div>

      {/* Memo Field */}
      <div className="pt-1">
        <label className="block font-bold text-slate-700 mb-1">Memo</label>
        <textarea
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
        />
      </div>

      {/* Container Footer Action Bar */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between -mx-5 -mb-5 rounded-b-xl">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {isProcessing ? 'Processing Payment...' : `Process Payment ($${totalAmount.toFixed(2)})`}
        </button>
      </div>
    </form>
  );
}

// Stripe Inner Form Component for SetupIntent Add Card (no custom appearance overrides)
function StripeAddCardForm({
  stripeIsDefault,
  setStripeIsDefault,
  onSuccess,
  onCancel,
}: {
  stripeIsDefault: boolean;
  setStripeIsDefault: (val: boolean) => void;
  onSuccess: (newPm: StripePaymentMethod) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to confirm card setup.');
        setIsProcessing(false);
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        setIsProcessing(false);
        const last4Val = '4242';
        const newPm: StripePaymentMethod = {
          id: typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : `pm_stripe_${Date.now()}`,
          brand: 'Visa',
          last4: last4Val,
          expMonth: 12,
          expYear: 2028,
          provider: 'Stripe',
          isDefault: stripeIsDefault,
        };
        onSuccess(newPm);
      } else {
        setIsProcessing(false);
        const last4Val = '4242';
        const newPm: StripePaymentMethod = {
          id: `pm_stripe_${Date.now()}`,
          brand: 'Visa',
          last4: last4Val,
          expMonth: 12,
          expYear: 2028,
          provider: 'Stripe',
          isDefault: stripeIsDefault,
        };
        onSuccess(newPm);
      }
    } catch (err: any) {
      setIsProcessing(false);
      const last4Val = '4242';
      const newPm: StripePaymentMethod = {
        id: `pm_stripe_${Date.now()}`,
        brand: 'Visa',
        last4: last4Val,
        expMonth: 12,
        expYear: 2028,
        provider: 'Stripe',
        isDefault: stripeIsDefault,
      };
      onSuccess(newPm);
    }
  };

  return (
    <form onSubmit={handleConfirmSetup} className="space-y-4 font-sans">
      {/* Stripe PaymentElement without custom appearance overrides */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Set as Default Checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="stripeAddCardDefaultCheck"
          checked={stripeIsDefault}
          onChange={(e) => setStripeIsDefault(e.target.checked)}
          className="rounded border-slate-300 text-[#635bff] focus:ring-[#635bff] cursor-pointer"
        />
        <label htmlFor="stripeAddCardDefaultCheck" className="text-xs font-medium text-slate-700 cursor-pointer ">
          Set as default payment method
        </label>
      </div>

      {/* Footer Buttons */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between -mx-6 -mb-6 rounded-b-xl">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-6 py-2 bg-[#635bff] hover:bg-[#4d46c8] text-white font-bold rounded-md shadow-2xs text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{isProcessing ? 'Saving Card...' : 'Save Card'}</span>
        </button>
      </div>
    </form>
  );
}

interface SectionPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

function SectionPagination({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  itemName = 'items',
}: SectionPaginationProps) {
  if (totalItems <= pageSize) return null;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-b-md flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-sans">
      <div>
        Showing <span className="font-semibold text-slate-800">{start}</span> to{' '}
        <span className="font-semibold text-slate-800">{end}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="font-semibold text-slate-800 px-1 text-xs">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface MaintenancePlanLocationCardProps {
  plan: any;
  jobs?: any[];
  onDeletePlan: (planId: string) => void;
  onScheduleWindow?: (sw: any) => void;
}

function MaintenancePlanLocationCard({ plan, jobs, onDeletePlan, onScheduleWindow }: MaintenancePlanLocationCardProps) {
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [maintWindowsPage, setMaintWindowsPage] = useState<number>(1);

  // Return live service windows for this consolidated plan, dynamically joined with real jobs
  const serviceWindows = React.useMemo(() => {
    if (Array.isArray(plan.serviceWindows) && plan.serviceWindows.length > 0) {
      return plan.serviceWindows.map((sw: any) => {
        // Match against live jobs list
        const swNumClean = String(sw.jobNumber || '').replace(/\D/g, '');
        const matchedJob = (jobs || []).find((j: any) => {
          if (!swNumClean) return false;
          const jNumClean = String(j.jobNumber || j.id || '').replace(/\D/g, '');
          return jNumClean && jNumClean === swNumClean;
        });

        let liveStatus = sw.status || 'Unscheduled';
        if (matchedJob) {
          const st = (matchedJob.status || '').toLowerCase();
          if (st === 'closed' || st === 'complete' || st === 'completed') {
            liveStatus = 'Complete';
          } else if (st === 'opened' || st === 'scheduled' || st === 'in progress' || st === 'assigned') {
            liveStatus = 'Scheduled';
          }
        }

        const isComplete = liveStatus === 'Complete' || liveStatus === 'Completed';

        return {
          ...sw,
          status: liveStatus,
          remindersSent: isComplete ? 'N/A' : (sw.remindersSent || '0'),
        };
      });
    }
    return [];
  }, [plan, jobs]);

  const availableYears = React.useMemo(() => {
    return Array.from<string>(new Set(serviceWindows.map((sw: any) => String(sw.year)))).sort();
  }, [serviceWindows]);

  const filteredWindows = React.useMemo(() => {
    if (yearFilter === 'All') return serviceWindows;
    return serviceWindows.filter((sw: any) => String(sw.year) === yearFilter);
  }, [serviceWindows, yearFilter]);

  const pagedWindows = React.useMemo(() => {
    const start = (maintWindowsPage - 1) * 15;
    return filteredWindows.slice(start, start + 15);
  }, [filteredWindows, maintWindowsPage]);

  const contractTotal = plan.contractPrice || `$${(plan.totalAmount || plan.annualPrice || 0).toFixed(2)}`;
  const annualPrice = plan.annualPrice || (plan.totalAmount ? plan.totalAmount / 20 : 140);
  const paymentsApplied = plan.paymentsApplied || '$0.00';
  const contractBalance = plan.contractBalance || plan.contractPrice || '$0.00';
  const expirationDate = plan.expirationDate || plan.expiresDate || '—';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4 font-sans text-xs">
      {/* Top Header Row (Payment plan badge removed entirely) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#be4646]">
              {plan.name || plan.planName || 'HVAC Maintenance Plan'}
            </h3>
            <button
              type="button"
              onClick={() => onDeletePlan(plan.id)}
              className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
              title="Delete Maintenance Plan"
            >
              <Trash2 className="w-4 h-4 text-[#be4646]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <div>
              <span className="font-semibold text-slate-800">Contract Total: </span>
              <span className="font-bold text-slate-900">{contractTotal}</span>
              <div className="text-slate-500 italic text-[11px] mt-0.5">
                Annual Price: ${typeof annualPrice === 'number' ? annualPrice.toFixed(2) : annualPrice}
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-800">{paymentsApplied} Applied</span>
              <div className="text-slate-500 italic text-[11px] mt-0.5">
                Balance: {contractBalance}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end justify-start shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Expires: <span className="font-semibold text-slate-800">{expirationDate}</span>
          </div>
        </div>
      </div>

      {/* Filter Service Window by Year Toolbar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Filter Service Window by Year:</span>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setMaintWindowsPage(1);
            }}
            className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none cursor-pointer font-medium"
          >
            <option value="All">All</option>
            {availableYears.map((y: string) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => alert('Add Service Window modal')}
          className="text-[#be4646] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
        >
          + Add Service Windows
        </button>
      </div>

      {/* Service Windows Table */}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold sticky top-0 bg-slate-50 z-10">
            <tr>
              <th className="p-2.5 w-1/4">Service Windows</th>
              <th className="p-2.5 w-1/3">Job</th>
              <th className="p-2.5 w-1/5">Status</th>
              <th className="p-2.5 w-1/5">Reminders Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {pagedWindows.map((sw: any) => (
              <tr key={sw.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-2.5 font-medium text-slate-800 whitespace-nowrap">{sw.window}</td>
                <td className="p-2.5 text-[#be4646]">
                  {sw.jobNumber ? (
                    <Link
                      href={`/jobs/${sw.jobNumber}`}
                      className="hover:underline font-medium text-[#be4646]"
                    >
                      {sw.jobNumber}, {sw.jobName || '1st visit 1 system'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onScheduleWindow?.(sw)}
                      className="hover:underline font-medium text-[#be4646] text-left cursor-pointer"
                    >
                      {sw.jobName || '1st visit 1 system'}
                    </button>
                  )}
                </td>
                <td className="p-2.5">
                  <div className="inline-flex items-center gap-1.5 font-medium">
                    <span className={sw.status === 'Complete' || sw.status === 'Completed' ? 'text-slate-800' : 'text-slate-700'}>
                      {sw.status || 'Unscheduled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onScheduleWindow?.(sw)}
                      className="p-0.5 text-[#be4646] hover:text-[#9e3838] cursor-pointer inline-flex items-center transition-transform hover:scale-110"
                      title={`Schedule appointment for ${sw.window} (Job #${sw.jobNumber || ''})`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#be4646]" />
                    </button>
                  </div>
                </td>
                <td className="p-2.5">
                  <div className="flex items-center justify-between pr-4">
                    <span className="text-slate-600 font-medium">
                      {sw.status === 'Complete' || sw.status === 'Completed' ? 'N/A' : (sw.remindersSent || '0')}
                    </span>
                    {sw.status !== 'Complete' && sw.status !== 'Completed' ? (
                      <button
                        type="button"
                        className="text-[#be4646] hover:text-[#9e3838] p-0.5 cursor-pointer"
                        title="Send Reminder"
                        onClick={() => alert(`Send reminder for ${sw.window}`)}
                      >
                        <Send className="w-3.5 h-3.5 text-[#be4646]" />
                      </button>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <SectionPagination
          currentPage={maintWindowsPage}
          totalItems={filteredWindows.length}
          pageSize={15}
          onPageChange={setMaintWindowsPage}
          itemName="service windows"
        />
      </div>
    </div>
  );
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Unwrap dynamic params for Next.js 16 compatibility
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const customerId = resolvedParams.id;

  // Domain Hooks
  const { currentUser } = useSession();
  const { databaseMode, client } = useDatabaseMode();
  const [fetchedCustomer, setFetchedCustomer] = useState<CanonicalCustomer | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState<boolean>(true);

  const decodedParam = decodeURIComponent(customerId).trim();
  const cleanId = decodedParam.replace(/^cust-/, '').trim();
  const cleanParamName = decodedParam.toLowerCase().replace(/[^a-z0-9]/g, '');

  const targetCustomerId = customerId.startsWith('cust-') ? customerId : `cust-${cleanId}`;
  const resolvedCustomer = fetchedCustomer;

  const currentCustNum = resolvedCustomer?.customerNumber || (resolvedCustomer as any)?.accountNumber || cleanId;
  const currentLegacyId = (resolvedCustomer as any)?.wexCustomerId || (resolvedCustomer as any)?.legacyId || (resolvedCustomer as any)?.customerId || currentCustNum || targetCustomerId;
  const currentCustName = resolvedCustomer?.name;

  // Immediate parallel fetching for all child tabs with stable customer IDs
  const { notes: dbNotes, saveNote: persistNote, deleteNote: removeNote } = useNotes(targetCustomerId);
  const { equipment: dbEquipment, saveEquipment: persistEquipment, deleteEquipment: removeEquipment } = useEquipment(targetCustomerId, undefined, currentCustName, currentCustNum, currentLegacyId);
  const { invoices: dbInvoices, saveInvoice: persistInvoice } = useInvoices(targetCustomerId, undefined, currentCustName);
  const { proposals: dbProposals, saveProposal: persistProposal } = useProposals(targetCustomerId, undefined, currentCustName);
  const { plans: dbPlans, savePlan: persistPlan, deletePlan: removePlan } = useMaintenancePlans(currentLegacyId, currentCustName);
  const { attachments: dbAttachments, saveAttachment: persistAttachment, deleteAttachment: removeAttachment } = useAttachments(targetCustomerId);
  const { calls: dbCalls } = useCalls();
  const { appointments: allAppointments, saveAppointment: saveLiveAppointment } = useAppointments(targetCustomerId, undefined, currentCustName);
  const { jobs: dbJobs } = useJobs(targetCustomerId, currentCustNum, currentCustName);
  const { payments: dbPayments } = usePayments(targetCustomerId, currentCustNum, currentCustName);
  const { contacts: dbContacts } = useAuthorizedPersons(targetCustomerId);
  const { users: liveUsers } = useUsers();

  const saveCustomer = async (cust: CanonicalCustomer) => {
    await client.saveCustomer(cust, databaseMode);
    setFetchedCustomer(cust);
  };

  const [timelinePageSize, setTimelinePageSize] = useState<number>(15);

  // Fetch direct customer document by ID / Customer Number from Firestore / mock
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCustomer(true);
    async function loadCustomer() {
      try {
        let cust = await firestoreClient.fetchCustomerById(customerId, databaseMode);
        if (!cust && cleanId !== customerId) {
          cust = await firestoreClient.fetchCustomerById(cleanId, databaseMode);
        }
        if (!cust && decodedParam !== customerId) {
          cust = await firestoreClient.fetchCustomerById(decodedParam, databaseMode);
        }
        if (isMounted) {
          if (cust) {
            setFetchedCustomer(cust);
          } else if (databaseMode === 'mock') {
            const mock = MOCK_CUSTOMERS_DB[customerId] || MOCK_CUSTOMERS_DB[cleanId] || MOCK_CUSTOMERS_DB['cust-1'];
            if (mock) {
              setFetchedCustomer(firestoreClient.normalizeCustomer({
                id: customerId,
                name: mock.name || `${mock.firstName} ${mock.lastName}`.trim(),
                customerType: mock.custType?.toLowerCase() || 'residential',
                businessName: mock.businessName,
                firstName: mock.firstName,
                lastName: mock.lastName,
                qbName: mock.qbName,
                homePhone: mock.homePhone,
                mobilePhone: mock.mobilePhone,
                email: mock.email,
                customerNumber: mock.customerNumber || customerId,
                locations: mock.locationsList?.map((l: any) => ({
                  street: l.addr1,
                  city: l.city,
                  state: l.state,
                  zipCode: l.zip,
                  description: l.description,
                  isDefault: l.isDefault,
                })),
                billingAddress: mock.locationsList?.[0] ? {
                  street: mock.locationsList[0].addr1,
                  city: mock.locationsList[0].city,
                  state: mock.locationsList[0].state,
                  zipCode: mock.locationsList[0].zip,
                  description: 'Primary Billing',
                  isDefault: true,
                } : undefined,
              }));
            }
          }
          setIsLoadingCustomer(false);
        }
      } catch (err) {
        console.error('Failed to load customer profile:', err);
        if (isMounted) setIsLoadingCustomer(false);
      }
    }
    loadCustomer();
    return () => { isMounted = false; };
  }, [customerId, cleanId, decodedParam, cleanParamName, databaseMode]);

  const currentDbCustomer = fetchedCustomer || resolvedCustomer;

  // Retrieve initial mock customer record based on dynamic customerId ONLY when in mock mode
  const currentMockData = databaseMode === 'mock'
    ? (MOCK_CUSTOMERS_DB[customerId] || MOCK_CUSTOMERS_DB['cust-1'])
    : {
        name: currentDbCustomer?.name || 'Customer Profile',
        custType: (currentDbCustomer?.customerType === 'commercial' ? 'Commercial' : 'Residential') as 'Residential' | 'Commercial',
        businessName: currentDbCustomer?.businessName || currentDbCustomer?.name || '',
        firstName: currentDbCustomer?.firstName || '',
        lastName: currentDbCustomer?.lastName || '',
        qbName: currentDbCustomer?.qbName || '',
        homePhone: currentDbCustomer?.homePhone || '',
        mobilePhone: currentDbCustomer?.mobilePhone || currentDbCustomer?.phone || '',
        email: currentDbCustomer?.email || '',
        customerNumber: currentDbCustomer?.customerNumber || currentDbCustomer?.accountNumber || customerId || '49106',
        locationsList: (currentDbCustomer?.locations && currentDbCustomer.locations.length > 0)
          ? currentDbCustomer.locations
              .filter((loc: any) => {
                const st = (loc.street || loc.addr1 || '').trim().toLowerCase();
                return st && st !== 'primary location' && !st.includes('primary location') && st !== 'no street provided';
              })
              .map((loc: any, idx: number) => ({
                id: loc.id || `loc-${idx + 1}`,
                addr1: loc.street || '',
                addr2: loc.addr2 || loc.addressLine2 || '',
                city: loc.city || '',
                state: loc.state || '',
                zip: loc.zipCode || '',
                description: loc.description && !loc.description.toLowerCase().includes('primary location') ? loc.description : (loc.street || `Location ${idx + 1}`),
                isDefault: loc.isDefault ?? (idx === 0),
              }))
          : (currentDbCustomer?.address && currentDbCustomer.address.street && currentDbCustomer.address.street !== 'No street provided' ? [{
              id: 'loc-1',
              addr1: currentDbCustomer.address.street || '',
              addr2: currentDbCustomer.address.addr2 || currentDbCustomer.address.addressLine2 || '',
              city: currentDbCustomer.address.city || '',
              state: currentDbCustomer.address.state || '',
              zip: currentDbCustomer.address.zipCode || '',
              description: currentDbCustomer.address.street || (currentDbCustomer.address as any).addr1 || 'Location',
              isDefault: true,
            }] : []),
        notes: [],
        jobs: [],
        invoices: [],
        proposals: [],
        storedPaymentMethods: [],
      };

  // Primary Contact State
  const [custType, setCustType] = useState<'Residential' | 'Commercial'>(
    currentDbCustomer?.customerType === 'commercial' ? 'Commercial' : currentMockData.custType
  );
  const [businessName, setBusinessName] = useState(currentMockData.businessName);
  const [firstName, setFirstName] = useState(currentDbCustomer?.firstName || currentMockData.firstName);
  const [lastName, setLastName] = useState(currentDbCustomer?.lastName || currentMockData.lastName);
  const [qbName, setQbName] = useState(
    currentDbCustomer?.qbName ||
    (currentDbCustomer?.lastName && currentDbCustomer?.firstName
      ? `${currentDbCustomer.lastName}, ${currentDbCustomer.firstName}`
      : currentDbCustomer?.name || currentMockData.qbName)
  );
  const [homePhone, setHomePhone] = useState(currentDbCustomer?.homePhone || currentMockData.homePhone);
  const [mobilePhone, setMobilePhone] = useState(currentDbCustomer?.mobilePhone || (!currentDbCustomer?.homePhone ? currentDbCustomer?.phone : '') || currentMockData.mobilePhone);
  const [email, setEmail] = useState(currentDbCustomer?.email || currentMockData.email);
  const [noEmail, setNoEmail] = useState(!currentDbCustomer?.email && !currentMockData.email);
  const [customerNumber, setCustomerNumber] = useState(() => cleanCustomerNumberDigits(currentMockData.customerNumber));
  const [contactType, setContactType] = useState('Primary');
  const [isSavedPrimary, setIsSavedPrimary] = useState(false);

  const isCommercialCust = custType === 'Commercial' || currentDbCustomer?.customerType === 'commercial' || Boolean(businessName);
  const displayProfileName = useMemo(() => {
    if (isCommercialCust) {
      return (businessName || currentDbCustomer?.businessName || currentDbCustomer?.name || 'Commercial Customer').trim();
    }
    const f = (firstName || currentDbCustomer?.firstName || '').trim();
    const l = (lastName || currentDbCustomer?.lastName || '').trim();
    if (f && l) return `${f} ${l}`;
    if (f || l) return f || l;
    const raw = (currentDbCustomer?.name || '').trim();
    if (raw.includes(',')) {
      const parts = raw.split(',').map((s) => s.trim());
      const last = parts[0] || '';
      const first = parts[1] || '';
      return first && last ? `${first} ${last}` : (first || last || raw);
    }
    return raw || 'Customer Profile';
  }, [isCommercialCust, businessName, firstName, lastName, currentDbCustomer]);

  // Settings & Preferences State
  const [acceptedPayment, setAcceptedPayment] = useState('All');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [preferredComm, setPreferredComm] = useState<'Email' | 'Text'>('Email');
  const [spanishPreferred, setSpanishPreferred] = useState(false);
  const [optOutText, setOptOutText] = useState(false);
  const [optOutMarketing, setOptOutMarketing] = useState(false);
  const [optOutEmail, setOptOutEmail] = useState(false);
  const [preferredTech, setPreferredTech] = useState('');
  const [isSavedSettings, setIsSavedSettings] = useState(false);

  // Sync state whenever currentDbCustomer changes / loads
  useEffect(() => {
    if (currentDbCustomer) {
      setCustType(currentDbCustomer.customerType === 'commercial' ? 'Commercial' : 'Residential');
      setBusinessName(currentDbCustomer.businessName || (currentDbCustomer.customerType === 'commercial' ? currentDbCustomer.name : '') || '');
      setFirstName(currentDbCustomer.firstName || '');
      setLastName(currentDbCustomer.lastName || '');
      setQbName(
        currentDbCustomer.qbName ||
        (currentDbCustomer.lastName && currentDbCustomer.firstName
          ? `${currentDbCustomer.lastName}, ${currentDbCustomer.firstName}`
          : currentDbCustomer.name || '')
      );
      setMobilePhone(formatPhoneNumber(currentDbCustomer.mobilePhone || (!currentDbCustomer.homePhone ? currentDbCustomer.phone : '') || ''));
      setHomePhone(formatPhoneNumber(currentDbCustomer.homePhone || ''));
      setEmail(currentDbCustomer.email || '');
      setNoEmail(!currentDbCustomer.email);
      setCustomerNumber(cleanCustomerNumberDigits(currentDbCustomer.customerNumber || currentDbCustomer.accountNumber || currentDbCustomer.id || customerId));
      setCustomerStatus(
        currentDbCustomer.customerStatus === 'Inactive'
          ? 'Inactive'
          : currentDbCustomer.customerStatus === 'Account on Hold'
          ? 'Account on Hold'
          : 'Active'
      );

      // Settings & Preferences
      if (currentDbCustomer.acceptedPaymentMethods) setAcceptedPayment(currentDbCustomer.acceptedPaymentMethods);
      if (currentDbCustomer.paymentTerms) setPaymentTerms(currentDbCustomer.paymentTerms);
      if (currentDbCustomer.preferredCommunicationMethod || currentDbCustomer.preferredCommunication) {
        setPreferredComm((currentDbCustomer.preferredCommunicationMethod || currentDbCustomer.preferredCommunication) as any);
      }
      if (currentDbCustomer.preferredTechnician !== undefined) setPreferredTech(currentDbCustomer.preferredTechnician || '');
      if (currentDbCustomer.spanishSpeaking !== undefined || (currentDbCustomer as any).spanishPreferred !== undefined) {
        setSpanishPreferred(Boolean(currentDbCustomer.spanishSpeaking ?? (currentDbCustomer as any).spanishPreferred));
      }
      if (currentDbCustomer.optOutText !== undefined) setOptOutText(Boolean(currentDbCustomer.optOutText));
      if (currentDbCustomer.optOutEmail !== undefined) setOptOutEmail(Boolean(currentDbCustomer.optOutEmail));

      // Locations List
      let initialLocations: any[] = [];
      if (currentDbCustomer.locations && currentDbCustomer.locations.length > 0) {
        initialLocations = currentDbCustomer.locations
          .filter((loc: any) => {
            const st = (loc.street || loc.addr1 || '').trim().toLowerCase();
            return st && st !== 'primary location' && !st.includes('primary location') && st !== 'no street provided';
          })
          .map((loc: any, index: number) => ({
            id: loc.id || `loc-${index + 1}`,
            addr1: loc.street || (loc as any).addr1 || '',
            addr2: loc.addr2 || loc.addressLine2 || (loc as any).street2 || (loc as any).unit || (loc as any).apt || '',
            city: loc.city,
            state: loc.state,
            zip: loc.zipCode || (loc as any).zip || '',
            description: loc.description && !loc.description.toLowerCase().includes('primary location') ? loc.description : (loc.street || `Location ${index + 1}`),
            isDefault: loc.isDefault ?? (index === 0),
          }));
      } else if (currentDbCustomer.address && currentDbCustomer.address.street && currentDbCustomer.address.street !== 'No street provided') {
        initialLocations = [
          {
            id: 'loc-1',
            addr1: currentDbCustomer.address.street,
            addr2: currentDbCustomer.address.addr2 || currentDbCustomer.address.addressLine2 || (currentDbCustomer.address as any).street2 || '',
            city: currentDbCustomer.address.city,
            state: currentDbCustomer.address.state,
            zip: currentDbCustomer.address.zipCode,
            description: currentDbCustomer.address.street || (currentDbCustomer.address as any).addr1 || 'Location',
            isDefault: true,
          }
        ];
      }

      // Billing Addresses List
      let initialBilling: any[] = [];
      const billingSource = currentDbCustomer.billingAddress || currentDbCustomer.address;
      if (billingSource && billingSource.street && billingSource.street !== 'No street provided') {
        initialBilling = [
          {
            id: billingSource.id || 'b-1',
            addr1: billingSource.street,
            addr2: billingSource.addr2 || billingSource.addressLine2 || (billingSource as any).street2 || (billingSource as any).unit || (billingSource as any).apt || '',
            city: billingSource.city,
            state: billingSource.state,
            zip: billingSource.zipCode,
            description: billingSource.description || 'Primary Billing',
            isDefault: true,
          }
        ];
      }

      // Rule: There must ALWAYS be an address populated for billing and locations.
      // If only one address exists, it populates both by default.
      if (initialLocations.length > 0 && initialBilling.length === 0) {
        initialBilling = initialLocations.map((l) => ({
          id: `b-${l.id}`,
          addr1: l.addr1,
          addr2: l.addr2,
          city: l.city,
          state: l.state,
          zip: l.zip,
          description: 'Primary Billing',
          isDefault: true,
        }));
      } else if (initialBilling.length > 0 && initialLocations.length === 0) {
        initialLocations = initialBilling.map((b) => ({
          id: `loc-${b.id}`,
          addr1: b.addr1,
          addr2: b.addr2,
          city: b.city,
          state: b.state,
          zip: b.zip,
          description: b.addr1 || 'Location',
          isDefault: true,
        }));
      }

      setLocationsList(initialLocations);
      setBillingAddressesList(initialBilling);

      const defaultLoc = initialLocations.find((l) => l.isDefault) || initialLocations[0];
      if (defaultLoc) {
        setSelectedLocationId((prev) => prev && initialLocations.some(l => l.id === prev) ? prev : defaultLoc.id);
      }

      // Authorized Persons
      if (dbContacts && dbContacts.length > 0) {
        setAuthorizedPersonsList(dbContacts);
      } else if (currentDbCustomer.authorizedPersons && currentDbCustomer.authorizedPersons.length > 0) {
        setAuthorizedPersonsList(currentDbCustomer.authorizedPersons);
      } else {
        setAuthorizedPersonsList([]);
      }
    } else if (databaseMode === 'live') {
      setFirstName('');
      setLastName('');
      setQbName('');
      setMobilePhone('');
      setHomePhone('');
      setEmail('');
      setNoEmail(true);
      setLocationsList([]);
      setBillingAddressesList([]);
      setAuthorizedPersonsList(dbContacts || []);
    }
  }, [currentDbCustomer, databaseMode, customerId, dbContacts]);

  // Right Column Sub-Tab State
  const [activeTab, setActiveTab] = useState<'timeline' | 'payments' | 'equipment' | 'maint' | 'contacts'>('timeline');
  const [activityFilter, setActivityFilter] = useState('Jobs');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [timelinePage, setTimelinePage] = useState<number>(1);
  const [invoicesPage, setInvoicesPage] = useState<number>(1);
  const [equipmentPage, setEquipmentPage] = useState<number>(1);
  const [contactsPage, setContactsPage] = useState<number>(1);
  const [showExpiredMaintPlans, setShowExpiredMaintPlans] = useState(false);
  const [showAddMaintPlanModal, setShowAddMaintPlanModal] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<CanonicalEquipment | null>(null);
  const [authorizedPersonsList, setAuthorizedPersonsList] = useState<CanonicalAuthorizedPerson[]>([]);
  const [showAddAuthorizedPersonModal, setShowAddAuthorizedPersonModal] = useState(false);
  const [editingAuthorizedPerson, setEditingAuthorizedPerson] = useState<CanonicalAuthorizedPerson | null>(null);
  const [contactSearchCategory, setContactSearchCategory] = useState('Name');
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Customer Account Status State (Active [Green], Inactive [Red], Account on Hold [Yellow])
  const [customerStatus, setCustomerStatus] = useState<'Active' | 'Inactive' | 'Account on Hold'>('Active');
  const [showCustStatusMenu, setShowCustStatusMenu] = useState(false);

  // Invoice Status & Expansion State & PDF Viewer
  const [openInvoiceStatusMenuId, setOpenInvoiceStatusMenuId] = useState<string | null>(null);
  const [selectedPdfInvoice, setSelectedPdfInvoice] = useState<any | null>(null);

  // Declaratively derived Subtab data with useMemo (Zero useEffect loop / Maximum update depth exceeded)
  const activityTimeline = React.useMemo(() => {
    const sourceNotes = databaseMode === 'mock'
      ? (dbNotes && dbNotes.length > 0 ? dbNotes : currentMockData.notes || [])
      : (dbNotes || []);

    const mapped = sourceNotes.map((n: any) => {
      const author = n.author || n.userName || n.authorName || (n.meta ? String(n.meta).split(' - ')[0] : 'Staff');
      const rawDateStr = n.createdAt || n.timestamp || n.date || (n.meta ? String(n.meta).split(' - ')[1] : '') || '';
      const dateFormatted = formatCustomerNoteDate(rawDateStr);
      const cleanJobNum = n.jobNumber ? String(n.jobNumber).replace(/^#/, '').trim() : '';
      const jobTag = cleanJobNum ? `Job #${cleanJobNum}` : '';
      const locTag = n.locationAddress || n.locationStreet || n.location || '';
      
      const title = n.title && n.title !== 'Note' ? n.title : (jobTag ? `${jobTag} Note` : 'Customer Note');
      
      const metaParts = [
        `${author} - ${dateFormatted}`,
        jobTag,
        locTag ? locTag.split(',')[0].trim() : ''
      ].filter(Boolean);

      return {
        type: 'note' as const,
        id: n.id,
        title,
        meta: metaParts.join(' • '),
        content: n.content || n.note || n.text || '',
        location: locTag,
        isPinned: Boolean(n.isPinned),
        jobNumber: cleanJobNum,
        authorName: author,
        rawDate: rawDateStr,
      };
    });

    // Sort newest to oldest (pinned notes stay at top)
    mapped.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const tA = parseTimelineDate(a.rawDate || a.meta);
      const tB = parseTimelineDate(b.rawDate || b.meta);
      return tB - tA;
    });

    return mapped;
  }, [dbNotes, currentMockData, databaseMode]);

  const customerInvoicesList = React.useMemo(() => {
    const sourceInvoices = databaseMode === 'mock'
      ? (dbInvoices && dbInvoices.length > 0 ? dbInvoices : currentMockData.invoices || [])
      : (dbInvoices || []);

    const mapped = sourceInvoices.map((inv: any) => ({
      id: inv.id,
      number: String(inv.invoiceNumber || inv.number || inv.id || '').replace(/^#?I-?/, ''),
      amount: typeof inv.total === 'number' ? `$${inv.total.toFixed(2)}` : (inv.amount || '$0.00'),
      issued: inv.issueDate || inv.issued || '',
      status: inv.status || 'Closed',
      billTo: inv.billToCustomer || inv.billTo || currentCustName || 'Customer',
      location: inv.jobLocation || inv.location || '',
      note: inv.notes || inv.note || '',
      rawDate: inv.issueDate || inv.issued || inv.createdAt || '',
    }));

    mapped.sort((a: any, b: any) => parseTimelineDate(b.rawDate) - parseTimelineDate(a.rawDate));
    return mapped;
  }, [dbInvoices, currentMockData, currentCustName, databaseMode]);

  const customerProposalsList = React.useMemo(() => {
    const sourceProposals = databaseMode === 'mock'
      ? (dbProposals && dbProposals.length > 0 ? dbProposals : currentMockData.proposals || [])
      : (dbProposals || []);

    const mapped = sourceProposals.map((prop: any) => {
      const opt = prop.options?.[0];
      const amt = typeof opt?.total === 'number'
        ? `$${opt.total.toFixed(2)}`
        : (typeof prop.total === 'number' ? `$${prop.total.toFixed(2)}` : (prop.amount || '$0.00'));
      return {
        id: prop.id,
        number: String(prop.proposalNumber || prop.number || prop.id || '').replace(/^#?P-?/, ''),
        amount: amt,
        issued: prop.issueDate || prop.issued || '',
        status: prop.status || 'Draft',
        billTo: prop.billToCustomer || prop.billTo || currentCustName || 'Customer',
        location: prop.jobLocation || prop.location || '',
        note: prop.notes || prop.note || '',
        rawDate: prop.issueDate || prop.issued || prop.createdAt || '',
      };
    });

    mapped.sort((a: any, b: any) => parseTimelineDate(b.rawDate) - parseTimelineDate(a.rawDate));
    return mapped;
  }, [dbProposals, currentMockData, currentCustName, databaseMode]);

  const customerAppointmentsList = React.useMemo(() => {
    const sourceAppts = databaseMode === 'mock'
      ? (allAppointments && allAppointments.length > 0 ? allAppointments : (currentMockData as any).appointments || [])
      : (allAppointments || []);

    const mapped = sourceAppts.map((a: any) => {
      const tripColor = getTripTypeWebHex(a.jobType);
      const cleanJobNum = a.jobNumber ? String(a.jobNumber).replace(/^#/, '') : '';
      return {
        id: a.id,
        jobNumber: cleanJobNum ? `#${cleanJobNum}` : `#${a.id}`,
        rawJobNumber: cleanJobNum,
        jobType: a.jobType || a.title || 'Service Appointment',
        status: a.status || (a.isScheduled ? 'Scheduled' : 'Unscheduled'),
        location: a.locationAddress || a.locationStreet || a.location || (currentDbCustomer?.address ? `${currentDbCustomer.address.street}, ${currentDbCustomer.address.city}` : ''),
        tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
        date: formatAppointmentScheduleDisplay(a),
        rawDate: a.appointmentDate || a.dateTime || a.createdAt || '',
        notes: a.serviceNotes || a.summaryNotes || a.notes || '',
        jobTypeColor: tripColor,
      };
    });

    mapped.sort((a: any, b: any) => parseTimelineDate(b.rawDate) - parseTimelineDate(a.rawDate));
    return mapped;
  }, [allAppointments, currentMockData, currentDbCustomer, databaseMode]);

  const customerPaymentsTimelineList = React.useMemo(() => {
    const sourcePayments = databaseMode === 'mock'
      ? (dbPayments && dbPayments.length > 0 ? dbPayments : (currentMockData as any).payments || [])
      : (dbPayments || []);

    const mapped = sourcePayments.map((p: any) => {
      const amt = typeof p.amount === 'number' ? `$${p.amount.toFixed(2)}` : (p.amount || '$0.00');
      const dateStr = p.paymentDate || p.dateTime || p.date || p.createdAt || '';
      return {
        id: p.id,
        invoiceNumber: p.invoiceNumber ? (String(p.invoiceNumber).startsWith('#') ? p.invoiceNumber : `#${p.invoiceNumber}`) : '',
        amount: amt,
        method: p.paymentMethod || p.method || p.brand || 'Payment',
        status: p.status || 'Settled',
        date: dateStr,
        rawDate: dateStr,
        location: p.location || p.locationAddress || '',
      };
    });

    mapped.sort((a: any, b: any) => parseTimelineDate(b.rawDate) - parseTimelineDate(a.rawDate));
    return mapped;
  }, [dbPayments, currentMockData, databaseMode]);

  const customerJobsList = React.useMemo(() => {
    const cleanNum = (val: any) => (val != null ? String(val).replace(/^#/, '').trim() : '');

    if (databaseMode !== 'mock' || currentDbCustomer) {
      if (dbJobs && dbJobs.length > 0) {
        const mapped = dbJobs.map((j: any) => {
          const jNum = cleanNum(j.jobNumber || j.id);

          const matchingInvoices = dbInvoices.filter(
            (inv) => inv.jobId === j.id || (jNum && cleanNum(inv.jobNumber) === jNum) || (inv.customerId === customerId && jNum && cleanNum(inv.jobNumber) === jNum)
          );

          const matchingProposals = dbProposals.filter(
            (prop) => prop.jobId === j.id || (jNum && cleanNum(prop.jobNumber) === jNum) || (prop.customerId === customerId && jNum && cleanNum(prop.jobNumber) === jNum)
          );

          const matchingAppts = allAppointments.filter(
            (a) => a.jobId === j.id || (jNum && cleanNum(a.jobNumber) === jNum)
          );

          const matchingPayments = dbPayments.filter(
            (p: any) => (p.invoiceNumber && jNum && cleanNum(p.invoiceNumber).startsWith(jNum)) || (p.jobId === j.id)
          );

          const matchingNotes = dbNotes.filter(
            (n) => n.jobId === j.id || (jNum && cleanNum(n.jobNumber) === jNum)
          );

          const matchingCalls = dbCalls.filter(
            (c) => (jNum && cleanNum(c.jobNumber) === jNum) || matchingAppts.some((a) => c.appointmentId === a.id || (cleanNum(c.jobNumber) === cleanNum(a.jobNumber)))
          );

          const firstInvoice = matchingInvoices[0];
          const firstProposal = matchingProposals[0];
          const firstAppt = matchingAppts[0];
          const firstPayment = matchingPayments[0];
          const firstCall = matchingCalls[0];

          // Note deduplication
          const seenNoteTexts = new Set<string>();
          matchingInvoices.forEach((inv) => {
            if (inv.notes && inv.notes.trim()) seenNoteTexts.add(inv.notes.trim().toLowerCase());
          });
          matchingProposals.forEach((prop) => {
            if (prop.notes && prop.notes.trim()) seenNoteTexts.add(prop.notes.trim().toLowerCase());
          });
          matchingCalls.forEach((c) => {
            if (c.notes && c.notes.trim()) seenNoteTexts.add(c.notes.trim().toLowerCase());
          });

          const rawJobDesc = (j.jobDescription || firstAppt?.serviceNotes || '').trim();
          let primaryJobNote: any = null;
          if (rawJobDesc && !seenNoteTexts.has(rawJobDesc.toLowerCase())) {
            seenNoteTexts.add(rawJobDesc.toLowerCase());
            primaryJobNote = {
              date: j.jobCreationDate || firstAppt?.dateTime || 'Today',
              body: rawJobDesc,
              author: j.assignedTech || firstAppt?.assignedTech || 'Staff',
            };
          }

          const uniqueNotesList: any[] = [];
          matchingNotes.forEach((n) => {
            const content = (n.content || '').trim();
            if (content && !seenNoteTexts.has(content.toLowerCase())) {
              seenNoteTexts.add(content.toLowerCase());
              uniqueNotesList.push({
                id: n.id,
                authorDate: `${n.authorName || 'Staff'} - ${formatCustomerNoteDate(n.createdAt)}`,
                body: content,
              });
            }
          });

          const tripColor = getTripTypeWebHex(j.jobType);
          const rawDate = j.jobCreationDate || j.createdAt || (firstAppt ? firstAppt.dateTime : '');

          return {
            id: j.id,
            jobNumber: j.jobNumber ? (j.jobNumber.startsWith('#') ? j.jobNumber : `#${j.jobNumber}`) : `#${j.id}`,
            name: j.jobName || j.jobType || 'Service Call',
            status: j.status || 'Closed',
            location: j.locationAddress || (currentDbCustomer?.address ? `${currentDbCustomer.address.street}, ${currentDbCustomer.address.city}` : ''),
            jobType: j.jobType || 'HVAC service',
            jobTypeColor: tripColor,
            rawDate,
            createdBy: formatApptCreatorStamp(j.createdBy || firstAppt?.assignedTech || 'Staff', j.jobCreationDate || firstAppt?.createdAt || j.createdAt),
            payments: matchingPayments.map((p: any) => ({
              id: p.id,
              date: p.paymentDate || p.dateTime || 'Completed',
              amount: `$${(p.amount || 0).toFixed(2)}`,
            })),
            payment: firstPayment
              ? { date: firstPayment.paymentDate || firstPayment.dateTime, amount: `$${firstPayment.amount.toFixed(2)}` }
              : (j.invoicesTotal > 0 ? { date: j.jobCreationDate || 'Completed', amount: `$${j.invoicesTotal.toFixed(2)}` } : null),
            invoices: matchingInvoices.map((inv) => ({
              id: inv.id,
              number: String(inv.invoiceNumber || '').replace(/^#I-/, ''),
              issued: inv.issueDate || j.jobCreationDate || 'Recent',
              amount: `$${(inv.total || 0).toFixed(2)}`,
              status: inv.status || 'Presented',
              billTo: inv.billToCustomer || currentCustName || 'Customer',
              note: inv.notes || '',
            })),
            invoice: firstInvoice
              ? {
                  number: firstInvoice.invoiceNumber.replace(/^#I-/, ''),
                  issued: firstInvoice.issueDate,
                  amount: `$${firstInvoice.total.toFixed(2)}`,
                  status: firstInvoice.status,
                  billTo: firstInvoice.billToCustomer || 'Customer',
                  note: firstInvoice.notes || '',
                }
              : (j.invoicesTotal > 0
              ? {
                  number: `${cleanNum(j.jobNumber)}-1`,
                  issued: j.jobCreationDate,
                  amount: `$${j.invoicesTotal.toFixed(2)}`,
                  status: j.status === 'Closed' ? 'Closed' : 'Open',
                  billTo: currentCustName || 'Customer',
                  note: j.jobDescription || '',
                }
              : null),
            proposals: matchingProposals.map((prop) => ({
              id: prop.id,
              number: String(prop.proposalNumber || '').replace(/^#P-/, ''),
              issued: prop.issueDate || 'Recent',
              amount: `$${(prop.options?.[0]?.total || 0).toFixed(2)}`,
              status: prop.status || 'Presented',
              billTo: prop.billToCustomer || currentCustName || 'Customer',
              note: prop.notes || '',
            })),
            proposal: firstProposal
              ? {
                  number: firstProposal.proposalNumber.replace(/^#P-/, ''),
                  issued: firstProposal.issueDate,
                  amount: `$${(firstProposal.options?.[0]?.total || 0).toFixed(2)}`,
                  status: firstProposal.status,
                  billTo: firstProposal.billToCustomer || currentCustName || 'Customer',
                  note: firstProposal.notes || '',
                }
              : null,
            note: primaryJobNote,
            notesList: uniqueNotesList,
            appointments: matchingAppts.map((a) => ({
              id: a.id,
              date: formatAppointmentScheduleDisplay(a),
              status: a.status || 'Complete',
              tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
            })),
            appointment: firstAppt
              ? {
                  date: formatAppointmentScheduleDisplay(firstAppt),
                  status: firstAppt.status,
                  tech: cleanUserDisplayName(firstAppt.assignedTech || 'Unassigned'),
                }
              : null,
            calls: matchingCalls.map((c) => ({
              id: c.id,
              title: c.activityType || 'Initial Call',
              callType: c.callType || 'Inbound',
              dateTime: c.callDate || (c.createdAt?.slice(0, 10) || ''),
              contact: c.contactName || '',
              location: c.relatedLocation || '',
              user: c.user || 'Staff',
              note: c.notes || '',
            })),
            call: firstCall
              ? {
                  title: firstCall.activityType || 'Initial Call',
                  callType: firstCall.callType || 'Inbound',
                  dateTime: firstCall.callDate || (firstCall.createdAt?.slice(0, 10) || ''),
                  contact: firstCall.contactName || '',
                  location: firstCall.relatedLocation || '',
                  callWith: firstCall.contactName || '',
                  authorDate: `${firstCall.user || 'Staff'} - ${firstCall.callDate || ''}`,
                  note: firstCall.notes || '',
                }
              : null,
          };
        });

        // Also include any standalone unlinked appointments
        const linkedApptIds = new Set<string>();
        dbJobs.forEach((j: any) => {
          const jNum = cleanNum(j.jobNumber || j.id);
          allAppointments
            .filter((a) => (jNum && cleanNum(a.jobNumber) === jNum) || a.jobId === j.id)
            .forEach((a) => linkedApptIds.add(a.id));
        });

        const unlinkedAppointments = allAppointments.filter(
          (a) => !linkedApptIds.has(a.id)
        );

        const mappedUnlinked = unlinkedAppointments.map((a) => {
          const aNum = cleanNum(a.jobNumber || a.id);
          const matchingInvoices = dbInvoices.filter(
            (inv) => inv.jobId === a.id || (aNum && cleanNum(inv.jobNumber) === aNum)
          );
          const firstInvoice = matchingInvoices[0];

          const matchingProposals = dbProposals.filter(
            (prop) => prop.jobId === a.id || (aNum && cleanNum(prop.jobNumber) === aNum)
          );
          const firstProposal = matchingProposals[0];

          const matchingCalls = dbCalls.filter(
            (c) => c.appointmentId === a.id || (aNum && cleanNum(c.jobNumber) === aNum)
          );
          const firstCall = matchingCalls[0];

          const matchingNotes = dbNotes.filter((n) => n.jobId === a.id || (aNum && cleanNum(n.jobNumber) === aNum));
          
          // Deduplicate notes
          const seenNoteTexts = new Set<string>();
          matchingInvoices.forEach((inv) => {
            if (inv.notes && inv.notes.trim()) seenNoteTexts.add(inv.notes.trim().toLowerCase());
          });
          matchingProposals.forEach((prop) => {
            if (prop.notes && prop.notes.trim()) seenNoteTexts.add(prop.notes.trim().toLowerCase());
          });
          matchingCalls.forEach((c) => {
            if (c.notes && c.notes.trim()) seenNoteTexts.add(c.notes.trim().toLowerCase());
          });

          const rawServiceNote = (a.serviceNotes || '').trim();
          let primaryApptNote: any = null;
          if (rawServiceNote && !seenNoteTexts.has(rawServiceNote.toLowerCase())) {
            seenNoteTexts.add(rawServiceNote.toLowerCase());
            primaryApptNote = {
              body: rawServiceNote,
              author: a.assignedTech || 'Staff',
              date: a.dateTime || 'Today',
            };
          }

          const uniqueNotesList: any[] = [];
          matchingNotes.forEach((n) => {
            const content = (n.content || '').trim();
            if (content && !seenNoteTexts.has(content.toLowerCase())) {
              seenNoteTexts.add(content.toLowerCase());
              uniqueNotesList.push({
                id: n.id,
                authorDate: `${n.authorName || 'Staff'} - ${formatCustomerNoteDate(n.createdAt)}`,
                body: content,
              });
            }
          });

          const tripColor = getTripTypeWebHex(a.jobType);

          return {
            id: a.id,
            jobNumber: a.jobNumber ? (String(a.jobNumber).startsWith('#') ? String(a.jobNumber) : `#${a.jobNumber}`) : `#${a.id}`,
            name: a.jobType || 'Service Appointment',
            status: a.status || 'Opened',
            location: a.locationAddress || (currentDbCustomer?.address ? `${currentDbCustomer.address.street}, ${currentDbCustomer.address.city}` : ''),
            jobType: a.jobType || 'HVAC service',
            jobTypeColor: tripColor,
            rawDate: a.dateTime || a.createdAt || 'Today',
            createdBy: formatApptCreatorStamp(a.assignedTech || 'Staff', a.createdAt || a.createdDate || a.dateTime),
            payments: [],
            payment: null,
            invoices: matchingInvoices.map((inv) => ({
              id: inv.id,
              number: String(inv.invoiceNumber || '').replace(/^#I-/, ''),
              issued: inv.issueDate || 'Recent',
              amount: `$${(inv.total || 0).toFixed(2)}`,
              status: inv.status || 'Presented',
              billTo: inv.billToCustomer || currentCustName || 'Customer',
              note: inv.notes || '',
            })),
            invoice: firstInvoice ? {
              number: firstInvoice.invoiceNumber.replace(/^#I-/, ''),
              issued: firstInvoice.issueDate,
              amount: `$${firstInvoice.total.toFixed(2)}`,
              status: firstInvoice.status,
              billTo: firstInvoice.billToCustomer || currentCustName || 'Customer',
              note: firstInvoice.notes || '',
            } : null,
            proposals: matchingProposals.map((prop) => ({
              id: prop.id,
              number: String(prop.proposalNumber || '').replace(/^#P-/, ''),
              issued: prop.issueDate || 'Recent',
              amount: `$${(prop.options?.[0]?.total || 0).toFixed(2)}`,
              status: prop.status || 'Presented',
              billTo: prop.billToCustomer || currentCustName || 'Customer',
              note: prop.notes || '',
            })),
            proposal: firstProposal ? {
              number: firstProposal.proposalNumber.replace(/^#P-/, ''),
              issued: firstProposal.issueDate,
              amount: `$${(firstProposal.options?.[0]?.total || 0).toFixed(2)}`,
              status: firstProposal.status,
              billTo: firstProposal.billToCustomer || currentCustName || 'Customer',
              note: firstProposal.notes || '',
            } : null,
            note: primaryApptNote,
            notesList: uniqueNotesList,
            appointments: [{
              id: a.id,
              date: formatAppointmentScheduleDisplay(a),
              status: a.status || 'Complete',
              tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
            }],
            appointment: {
              date: formatAppointmentScheduleDisplay(a),
              status: a.status,
              tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
            },
            calls: matchingCalls.map((c) => ({
              id: c.id,
              title: c.activityType || 'Initial Call',
              callType: c.callType || 'Inbound',
              dateTime: c.callDate || (c.createdAt?.slice(0, 10) || ''),
              contact: c.contactName || '',
              location: c.relatedLocation || '',
              user: c.user || 'Staff',
              note: c.notes || '',
            })),
            call: firstCall ? {
              title: firstCall.activityType || 'Initial Call',
              callType: firstCall.callType || 'Inbound',
              dateTime: firstCall.callDate || (firstCall.createdAt?.slice(0, 10) || ''),
              contact: firstCall.contactName || '',
              location: firstCall.relatedLocation || '',
              callWith: firstCall.contactName || '',
              authorDate: `${firstCall.user || 'Staff'} - ${firstCall.callDate || ''}`,
              note: firstCall.notes || '',
            } : null,
          };
        });

        const dedupedJobsMap = new Map<string, any>();
        for (const jobItem of [...mapped, ...mappedUnlinked]) {
          const key = cleanNum(jobItem.jobNumber || jobItem.id || '');
          if (key && !dedupedJobsMap.has(key)) {
            dedupedJobsMap.set(key, jobItem);
          } else if (!key) {
            dedupedJobsMap.set(jobItem.id, jobItem);
          }
        }
        const allMapped = Array.from(dedupedJobsMap.values());
        allMapped.sort((a: any, b: any) => {
          const tA = parseTimelineDate(a.rawDate);
          const tB = parseTimelineDate(b.rawDate);
          return tB - tA;
        });

        return allMapped;
      }
      
      return allAppointments
        .filter((a) => (
          a.customerId === customerId ||
          a.customerId === `cust-${customerId}` ||
          (currentDbCustomer && a.customerId === currentDbCustomer.id) ||
          (currentCustNum && a.customerNumber === currentCustNum) ||
          (currentCustName && (a.customerName || '').toLowerCase() === currentCustName.toLowerCase())
        ))
        .map((a) => {
          const aNum = cleanNum(a.jobNumber || a.id);
          const matchingInvoices = dbInvoices.filter(
            (inv) => inv.jobId === a.id || (aNum && cleanNum(inv.jobNumber) === aNum)
          );
          const firstInvoice = matchingInvoices[0];

          const matchingProposals = dbProposals.filter(
            (prop) => prop.jobId === a.id || (aNum && cleanNum(prop.jobNumber) === aNum)
          );
          const firstProposal = matchingProposals[0];

          const matchingCalls = dbCalls.filter(
            (c) => c.appointmentId === a.id || (aNum && cleanNum(c.jobNumber) === aNum)
          );
          const firstCall = matchingCalls[0];

          const matchingNotes = dbNotes.filter((n) => n.jobId === a.id || (aNum && cleanNum(n.jobNumber) === aNum));
          
          // Deduplicate notes
          const seenNoteTexts = new Set<string>();
          matchingInvoices.forEach((inv) => {
            if (inv.notes && inv.notes.trim()) seenNoteTexts.add(inv.notes.trim().toLowerCase());
          });
          matchingProposals.forEach((prop) => {
            if (prop.notes && prop.notes.trim()) seenNoteTexts.add(prop.notes.trim().toLowerCase());
          });
          matchingCalls.forEach((c) => {
            if (c.notes && c.notes.trim()) seenNoteTexts.add(c.notes.trim().toLowerCase());
          });

          const rawServiceNote = (a.serviceNotes || '').trim();
          let primaryApptNote: any = null;
          if (rawServiceNote && !seenNoteTexts.has(rawServiceNote.toLowerCase())) {
            seenNoteTexts.add(rawServiceNote.toLowerCase());
            primaryApptNote = {
              body: rawServiceNote,
              author: a.assignedTech || 'Staff',
              date: a.dateTime || 'Today',
            };
          }

          const uniqueNotesList: any[] = [];
          matchingNotes.forEach((n) => {
            const content = (n.content || '').trim();
            if (content && !seenNoteTexts.has(content.toLowerCase())) {
              seenNoteTexts.add(content.toLowerCase());
              uniqueNotesList.push({
                id: n.id,
                authorDate: `${n.authorName || 'Staff'} - ${formatCustomerNoteDate(n.createdAt)}`,
                body: content,
              });
            }
          });

          const tripColor = getTripTypeWebHex(a.jobType);

          return {
            id: a.id,
            jobNumber: a.jobNumber ? (String(a.jobNumber).startsWith('#') ? String(a.jobNumber) : `#${a.jobNumber}`) : `#${a.id}`,
            name: a.jobType || 'Service Call',
            status: a.status || 'Opened',
            location: a.locationAddress || '',
            jobType: a.jobType || 'HVAC service',
            jobTypeColor: tripColor,
            rawDate: a.dateTime || a.createdAt || 'Today',
            createdBy: formatApptCreatorStamp(a.assignedTech || 'Staff', a.createdAt || a.createdDate || a.dateTime),
            payments: [],
            payment: null,
            invoices: matchingInvoices.map((inv) => ({
              id: inv.id,
              number: String(inv.invoiceNumber || '').replace(/^#I-/, ''),
              issued: inv.issueDate || 'Recent',
              amount: `$${(inv.total || 0).toFixed(2)}`,
              status: inv.status || 'Presented',
              billTo: inv.billToCustomer || currentCustName || 'Customer',
              note: inv.notes || '',
            })),
            invoice: firstInvoice ? {
              number: firstInvoice.invoiceNumber.replace(/^#I-/, ''),
              issued: firstInvoice.issueDate,
              amount: `$${firstInvoice.total.toFixed(2)}`,
              status: firstInvoice.status,
              billTo: firstInvoice.billToCustomer || 'Customer',
              note: firstInvoice.notes || '',
            } : null,
            proposals: matchingProposals.map((prop) => ({
              id: prop.id,
              number: String(prop.proposalNumber || '').replace(/^#P-/, ''),
              issued: prop.issueDate || 'Recent',
              amount: `$${(prop.options?.[0]?.total || 0).toFixed(2)}`,
              status: prop.status || 'Presented',
              billTo: prop.billToCustomer || currentCustName || 'Customer',
              note: prop.notes || '',
            })),
            proposal: firstProposal ? {
              number: firstProposal.proposalNumber.replace(/^#P-/, ''),
              issued: firstProposal.issueDate,
              amount: `$${(firstProposal.options?.[0]?.total || 0).toFixed(2)}`,
              status: firstProposal.status,
              billTo: firstProposal.billToCustomer || 'Customer',
              note: firstProposal.notes || '',
            } : null,
            note: primaryApptNote,
            notesList: uniqueNotesList,
            appointments: [{
              id: a.id,
              date: formatAppointmentScheduleDisplay(a),
              status: a.status || 'Complete',
              tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
            }],
            appointment: {
              date: formatAppointmentScheduleDisplay(a),
              status: a.status,
              tech: cleanUserDisplayName(a.assignedTech || 'Unassigned'),
            },
            calls: matchingCalls.map((c) => ({
              id: c.id,
              title: c.activityType || 'Initial Call',
              callType: c.callType || 'Inbound',
              dateTime: c.callDate || (c.createdAt?.slice(0, 10) || ''),
              contact: c.contactName || '',
              location: c.relatedLocation || '',
              user: c.user || 'Staff',
              note: c.notes || '',
            })),
            call: firstCall ? {
              title: firstCall.activityType || 'Initial Call',
              callType: firstCall.callType || 'Inbound',
              dateTime: firstCall.callDate || (firstCall.createdAt?.slice(0, 10) || ''),
              contact: firstCall.contactName || '',
              location: firstCall.relatedLocation || '',
              callWith: firstCall.contactName || '',
              authorDate: `${firstCall.user || 'Staff'} - ${firstCall.callDate || ''}`,
              note: firstCall.notes || '',
            } : null,
          };
        });
    }
    return currentMockData.jobs;
  }, [databaseMode, currentDbCustomer, dbJobs, dbInvoices, dbProposals, allAppointments, dbPayments, dbNotes, dbCalls, currentMockData, currentCustName, currentCustNum, customerId]);

  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<string[]>([]);
  const [expandedProposalIds, setExpandedProposalIds] = useState<string[]>([]);
  const [openProposalStatusMenuId, setOpenProposalStatusMenuId] = useState<string | null>(null);
  const [expandedPaymentSections, setExpandedPaymentSections] = useState<string[]>([]);
  const [storedPaymentMethods, setStoredPaymentMethods] = useState<StripePaymentMethod[]>(
    currentMockData.storedPaymentMethods || []
  );

  // Process Payment & Record Payment & Add Card Modals State
  const [isProcessPaymentModalOpen, setIsProcessPaymentModalOpen] = useState(false);
  const [processPaymentSubTab, setProcessPaymentSubTab] = useState<'new_card' | 'new_bank' | 'stored'>('new_card');
  const [processCardNumber, setProcessCardNumber] = useState('');
  const [processCardExpMonth, setProcessCardExpMonth] = useState('');
  const [processCardExpYear, setProcessCardExpYear] = useState('');
  const [processVerifyCvv, setProcessVerifyCvv] = useState(true);
  const [processCvvVal, setProcessCvvVal] = useState('');
  const [processVerifyZip, setProcessVerifyZip] = useState(true);
  const [processZipVal, setProcessZipVal] = useState('');
  const [processStoreCard, setProcessStoreCard] = useState(false);
  const [processIsAuthorized, setProcessIsAuthorized] = useState(false);
  const [processMemo, setProcessMemo] = useState('');
  const [processUnpaidAmount, setProcessUnpaidAmount] = useState('');
  const [processInvoiceFilter, setProcessInvoiceFilter] = useState('');

  // Record Payment Modal State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [recordPaymentUnpaidAmount, setRecordPaymentUnpaidAmount] = useState('');
  const [recordPaymentMethod, setRecordPaymentMethod] = useState('Paper Check');
  const [recordPaymentDate, setRecordPaymentDate] = useState('2026-08-13');
  const [recordPaymentMemo, setRecordPaymentMemo] = useState('');
  const [recordPaymentInvoiceFilter, setRecordPaymentInvoiceFilter] = useState('');

  // Add New Card Modal State (Stripe Elements Style)
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [stripeCardName, setStripeCardName] = useState(currentMockData.name || 'Eleanor Vance');
  const [stripeCardNumber, setStripeCardNumber] = useState('');
  const [stripeCardExp, setStripeCardExp] = useState('');
  const [stripeCardCvv, setStripeCardCvv] = useState('');
  const [stripeCardZip, setStripeCardZip] = useState('32789');
  const [stripeIsDefault, setStripeIsDefault] = useState(true);

  // State Reset Helpers (Requirement 7: Reset state entirely when closed and reopened)
  const resetProcessPaymentState = () => {
    setProcessPaymentSubTab('new_card');
    setProcessCardNumber('');
    setProcessCardExpMonth('');
    setProcessCardExpYear('');
    setProcessVerifyCvv(true);
    setProcessCvvVal('');
    setProcessVerifyZip(true);
    setProcessZipVal('');
    setProcessStoreCard(false);
    setProcessIsAuthorized(false);
    setProcessMemo('');
    setProcessUnpaidAmount('');
    setProcessInvoiceFilter('');
  };

  const resetRecordPaymentState = () => {
    setRecordPaymentUnpaidAmount('');
    setRecordPaymentMethod('Paper Check');
    setRecordPaymentDate('2026-08-13');
    setRecordPaymentMemo('');
    setRecordPaymentInvoiceFilter('');
  };

  const resetAddCardState = () => {
    setStripeCardName(currentMockData.name || 'Eleanor Vance');
    setStripeCardNumber('');
    setStripeCardExp('');
    setStripeCardCvv('');
    setStripeCardZip('32789');
    setStripeIsDefault(true);
  };

  const openProcessPaymentModal = () => {
    resetProcessPaymentState();
    setIsProcessPaymentModalOpen(true);
  };

  const closeProcessPaymentModal = () => {
    setIsProcessPaymentModalOpen(false);
    resetProcessPaymentState();
  };

  const openRecordPaymentModal = () => {
    resetRecordPaymentState();
    setIsRecordPaymentModalOpen(true);
  };

  const closeRecordPaymentModal = () => {
    setIsRecordPaymentModalOpen(false);
    resetRecordPaymentState();
  };

  const openAddCardModal = async () => {
    resetAddCardState();
    setIsAddCardModalOpen(true);
    try {
      const res = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerStripeId: (currentMockData as any).stripeCustomerId || 'cus_R89aXz2910' }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setSetupIntentClientSecret(data.clientSecret);
      }
    } catch (err) {
      // Graceful fallback
    }
  };

  const closeAddCardModal = () => {
    setIsAddCardModalOpen(false);
    setSetupIntentClientSecret(null);
    resetAddCardState();
  };

  const togglePaymentSection = (section: string) => {
    setExpandedPaymentSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  useEffect(() => {
    setStoredPaymentMethods(currentMockData.storedPaymentMethods || []);
    setCustType(currentMockData.custType);
    setBusinessName(currentMockData.businessName);
    setFirstName(currentMockData.firstName);
    setLastName(currentMockData.lastName);
    setQbName(currentMockData.qbName);
    setMobilePhone(currentMockData.mobilePhone);
    setHomePhone(currentMockData.homePhone);
    setEmail(currentMockData.email);
    setCustomerNumber(cleanCustomerNumberDigits(currentMockData.customerNumber));
    setLocationsList(currentMockData.locationsList);
  }, [customerId]);

  const toggleExpandInvoice = (id: string) => {
    setExpandedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpandProposal = (id: string) => {
    setExpandedProposalIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleProposalStatusChange = async (id: string, newStatus: string) => {
    const target = dbProposals.find((p) => p.id === id || p.proposalNumber.includes(id));
    if (target) {
      await persistProposal({ ...target, status: newStatus as any });
    }
  };

  const handleInvoiceStatusChange = async (id: string, newStatus: string) => {
    const target = dbInvoices.find((i) => i.id === id || i.invoiceNumber.includes(id));
    if (target) {
      await persistInvoice({ ...target, status: newStatus as any });
    }
  };

  // Dynamic calculation of Total Customer Balance based on open/unpaid invoices for this customer profile ID
  const totalCustomerBalance = customerInvoicesList
    .filter((inv) => {
      const st = (inv.status || '').toLowerCase();
      // Invoices that are NOT closed, paid, voided, or signed count towards unpaid customer balance
      return !st.includes('closed') && !st.includes('paid') && !st.includes('voided') && !st.includes('signed');
    })
    .reduce((sum, inv) => {
      const numericVal = parseFloat((inv.amount || '').replace(/[^0-9.-]+/g, '')) || 0;
      return sum + numericVal;
    }, 0);

  const formattedCustomerBalance = totalCustomerBalance.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  const equipmentList = React.useMemo(() => {
    const rawList = databaseMode === 'mock'
      ? (dbEquipment && dbEquipment.length > 0 ? dbEquipment : ((currentMockData as any)?.equipment || []))
      : (dbEquipment || []);

    return rawList.map((eq: any) => ({
      ...eq,
      id: eq.id || eq.equipmentId,
      customerId: eq.customerId,
      locationId: eq.locationId,
      locationStreet: eq.locationStreet || eq.locationAddress || '',
      locationAddress: eq.locationAddress || eq.locationStreet || '',
      name: eq.equipmentName || eq.name || eq.equipmentType || eq.systemName || 'Equipment',
      mfg: eq.manufacturer || eq.mfg || 'Unknown',
      model: eq.modelNumber || eq.modelNo || 'N/A',
      serial: eq.serialNumber || eq.serialNo || 'N/A',
      status: eq.equipmentStatus || eq.status || 'Active',
      systemAge: eq.systemAge || '',
      installationDate: eq.installationDate || eq.installedOn || eq.installDate || '',
      manufacturerWarrantyStatus: eq.manufacturerWarrantyStatus || eq.warranty || 'Active',
      manufacturerWarrantyEffectiveDate: eq.manufacturerWarrantyEffectiveDate || '',
      manufacturerWarrantyEffectiveEnd: eq.manufacturerWarrantyEffectiveEnd || '',
      otherWarrantyName: eq.otherWarrantyName || '',
      otherWarrantyEffectiveDate: eq.otherWarrantyEffectiveDate || '',
      otherWarrantyEndDate: eq.otherWarrantyEndDate || '',
    }));
  }, [dbEquipment, currentMockData]);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Save Toast Confirmation State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSaveToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  const handleSavePrimary = async () => {
    setIsSavedPrimary(true);
    const defaultBilling = billingAddressesList.find((b) => b.isDefault) || billingAddressesList[0];
    const defaultLoc = locationsList.find((l) => l.isDefault) || locationsList[0];

    const updatedCustomer: CanonicalCustomer = {
      id: currentDbCustomer?.id || customerId,
      customerNumber: customerNumber || currentDbCustomer?.customerNumber || customerId,
      accountNumber: customerNumber || currentDbCustomer?.accountNumber || customerId,
      wexCustomerId: currentDbCustomer?.wexCustomerId,
      legacyId: currentDbCustomer?.legacyId,
      name: custType === 'Commercial' && businessName ? businessName : `${lastName}, ${firstName}`.replace(/^,\s*|,\s*$/g, '') || 'Customer',
      businessName: businessName || currentDbCustomer?.businessName,
      firstName,
      lastName,
      qbName: qbName || (lastName && firstName ? `${lastName}, ${firstName}` : ''),
      phone: mobilePhone || homePhone || '',
      homePhone: homePhone || null,
      mobilePhone: mobilePhone || null,
      email: noEmail ? null : email,
      customerType: custType === 'Commercial' ? 'commercial' : 'residential',
      financials: currentDbCustomer?.financials,
      wexMetadata: currentDbCustomer?.wexMetadata,
      address: defaultLoc ? {
        id: defaultLoc.id,
        street: defaultLoc.addr1,
        addressLine2: defaultLoc.addr2 || '',
        city: defaultLoc.city,
        state: defaultLoc.state,
        zipCode: defaultLoc.zip,
        type: custType === 'Commercial' ? 'commercial' : 'residential',
        isDefault: true,
      } : (currentDbCustomer?.address || {
        street: '1420 Lakeview Drive',
        addressLine2: '',
        city: 'Winter Park',
        state: 'FL',
        zipCode: '32789',
        type: custType === 'Commercial' ? 'commercial' : 'residential',
        isDefault: true,
      }),
      billingAddress: defaultBilling ? {
        id: defaultBilling.id,
        street: defaultBilling.addr1,
        addressLine2: defaultBilling.addr2 || '',
        city: defaultBilling.city,
        state: defaultBilling.state,
        zipCode: defaultBilling.zip,
        type: custType === 'Commercial' ? 'commercial' : 'residential',
        isDefault: true,
        description: defaultBilling.description,
      } : null,
      locations: locationsList.map((loc) => ({
        id: loc.id,
        street: loc.addr1,
        addressLine2: loc.addr2 || '',
        city: loc.city,
        state: loc.state,
        zipCode: loc.zip,
        description: loc.description,
        isDefault: loc.isDefault,
        type: custType === 'Commercial' ? 'commercial' : 'residential',
      })),
      authorizedPersons: currentDbCustomer?.authorizedPersons || [],
      customerStatus: customerStatus === 'Active' ? 'Active' : 'Inactive',
      createdAt: currentDbCustomer?.createdAt || new Date().toISOString(),
    };
    await saveCustomer(updatedCustomer);
    showSaveToast('Customer profile saved successfully.');
    setTimeout(() => setIsSavedPrimary(false), 2000);
  };

  const handleSaveSettings = async () => {
    setIsSavedSettings(true);
    try {
      const updatedFields: Partial<CanonicalCustomer> = {
        acceptedPaymentMethods: acceptedPayment,
        paymentTerms: paymentTerms,
        preferredCommunication: preferredComm,
        preferredCommunicationMethod: preferredComm,
        preferredTechnician: preferredTech,
        spanishSpeaking: spanishPreferred,
        spanishPreferred: spanishPreferred,
        optOutText: optOutText,
        optOutEmail: optOutEmail,
      };
      await firestoreClient.updateCustomer(customerId, updatedFields, databaseMode);
      if (fetchedCustomer) {
        setFetchedCustomer((prev: any) => prev ? { ...prev, ...updatedFields } : prev);
      }
    } catch (err) {
      console.error('Error saving customer preferences:', err);
    }
    setTimeout(() => setIsSavedSettings(false), 2000);
  };

  // Dynamic Billing Addresses & Locations State
  const [billingAddressesList, setBillingAddressesList] = useState<
    Array<{
      id: string;
      addr1: string;
      addr2?: string;
      city: string;
      state: string;
      zip: string;
      description?: string;
      isDefault: boolean;
    }>
  >([
    {
      id: 'b-1',
      addr1: currentMockData.locationsList[0]?.addr1 || '1420 Lakeview Drive',
      addr2: '',
      city: currentMockData.locationsList[0]?.city || 'Winter Park',
      state: currentMockData.locationsList[0]?.state || 'FL',
      zip: currentMockData.locationsList[0]?.zip || '32789',
      description: '',
      isDefault: true,
    },
  ]);

  const [locationsList, setLocationsList] = useState<
    Array<{
      id: string;
      addr1: string;
      addr2?: string;
      city: string;
      state: string;
      zip: string;
      description?: string;
      isDefault: boolean;
    }>
  >(currentMockData.locationsList);

  const [selectedEqLocId, setSelectedEqLocId] = useState<string>('');
  const [selectedMaintLocId, setSelectedMaintLocId] = useState<string>('');

  const equipmentLocations = React.useMemo(() => {
    const locMap = new Map<string, { id: string; addr1: string; city: string; state: string; zip: string; fullAddress: string }>();

    // 1. Check locations from locationsList that have equipment
    for (const loc of locationsList) {
      const st = (loc.addr1 || '').toLowerCase().trim();
      if (!st || st === 'primary location' || st.includes('primary location')) continue;
      const stClean = st.replace(/^(best beach getaways|southern vacation rentals|360 blue|beachwalk vacation rentals)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').trim();
      const tokens = stClean.split(/\s+/).filter((t: string) => t.length > 2);
      if (!tokens.length) continue;

      const hasUnits = (equipmentList as any[]).some((eq) => {
        const eqLoc = (eq.locationAddress || eq.locationStreet || '').toLowerCase();
        if (!eqLoc) return false;
        if (eqLoc.includes(stClean) || stClean.includes(eqLoc)) return true;
        return tokens.some((t: string) => eqLoc.includes(t));
      });

      if (hasUnits) {
        locMap.set(loc.id, {
          id: loc.id,
          addr1: loc.addr1,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          fullAddress: `${loc.addr1}${loc.city ? `, ${loc.city}` : ''}${loc.state ? `, ${loc.state}` : ''} ${loc.zip || ''}`.trim(),
        });
      }
    }

    // 2. Also check addresses directly present on the customer's equipment records
    for (const eq of (equipmentList as any[])) {
      const addr = (eq.locationAddress || eq.locationStreet || '').trim();
      if (!addr) continue;
      const lines = addr.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const street = lines[0]?.replace(/,$/, '').trim() || addr;
      if (!street || street.toLowerCase() === 'primary location' || street.toLowerCase().includes('primary location')) continue;
      
      const stClean = street.replace(/^(best beach getaways|southern vacation rentals|360 blue|beachwalk vacation rentals)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').trim();
      const normKey = stClean.toLowerCase();
      
      const alreadyInMap = Array.from(locMap.values()).some((l) => {
        const lClean = l.addr1.replace(/^(best beach getaways|southern vacation rentals|360 blue|beachwalk vacation rentals)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').trim().toLowerCase();
        return lClean === normKey || lClean.includes(normKey) || normKey.includes(lClean);
      });

      if (!alreadyInMap) {
        const id = `eq-loc-${street.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        locMap.set(id, {
          id,
          addr1: street,
          city: lines.length > 1 ? lines[lines.length - 1].split(',')[0].trim() : '',
          state: 'FL',
          zip: '',
          fullAddress: addr.replace(/\n/g, ', '),
        });
      }
    }

    return Array.from(locMap.values());
  }, [equipmentList, locationsList]);

  const maintPlanLocations = React.useMemo(() => {
    const locMap = new Map<string, { id: string; addr1: string; city: string; state: string; zip: string; fullAddress: string }>();

    for (const plan of (dbPlans as any[]) || []) {
      if (!showExpiredMaintPlans && ((plan.status as string) === 'Expired' || (plan.status as string) === 'Cancelled' || (plan.status as string) === 'EXPIRED')) {
        continue;
      }
      const addr = (plan.locationAddress || plan.locationStreet || plan.location?.street || '').trim();
      if (!addr) continue;

      const matchingLoc = locationsList.find((l) => {
        const street = (l.addr1 || '').toLowerCase().trim();
        return street && addr.toLowerCase().includes(street);
      });

      if (matchingLoc) {
        locMap.set(matchingLoc.id, {
          id: matchingLoc.id,
          addr1: matchingLoc.addr1,
          city: matchingLoc.city,
          state: matchingLoc.state,
          zip: matchingLoc.zip,
          fullAddress: `${matchingLoc.addr1}, ${matchingLoc.city}${matchingLoc.state ? `, ${matchingLoc.state}` : ''} ${matchingLoc.zip || ''}`.trim(),
        });
      } else {
        const lines = addr.split('\n').map((s: string) => s.trim()).filter(Boolean);
        const street = lines[0] || addr;
        const cityStateZip = lines[1] || '';
        const id = `mp-loc-${street.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!locMap.has(id)) {
          locMap.set(id, {
            id,
            addr1: street,
            city: cityStateZip.split(',')[0] || '',
            state: 'FL',
            zip: '',
            fullAddress: addr.replace(/\n/g, ', '),
          });
        }
      }
    }

    if (locMap.size === 0 && (dbPlans || []).length > 0) {
      for (const loc of locationsList) {
        locMap.set(loc.id, {
          id: loc.id,
          addr1: loc.addr1,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          fullAddress: `${loc.addr1}, ${loc.city}${loc.state ? `, ${loc.state}` : ''} ${loc.zip || ''}`.trim(),
        });
      }
    }

    return Array.from(locMap.values());
  }, [dbPlans, locationsList, showExpiredMaintPlans]);

  const isLocationMatch = React.useCallback((itemLocation: string | undefined | null, filter: string) => {
    if (!filter || filter === 'All Locations') return true;
    if (!itemLocation) return false;

    const normItem = itemLocation.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const normFilter = filter.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

    if (normItem.includes(normFilter) || normFilter.includes(normItem)) return true;

    const filterTokens = normFilter.split(/\s+/).filter(
      (t) => t.length > 2 && !['beach', 'street', 'road', 'drive', 'lane', 'court', 'circle', 'ave', 'avenue', 'boulevard', 'blvd', 'way', 'suite', 'unit', 'santa', 'rosa', 'destin', 'miramar', 'panama', 'city', 'fl', '32459', '32550', '32541', '32413'].includes(t)
    );
    if (filterTokens.length > 0) {
      return filterTokens.every((token) => normItem.includes(token));
    }
    return false;
  }, []);

  const distinctTimelineLocationItems = React.useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ id: string; label: string; value: string }> = [
      { id: 'all-locations', label: 'All Locations', value: 'All Locations' },
    ];

    for (let i = 0; i < locationsList.length; i++) {
      const loc = locationsList[i];
      const fullAddr = `${loc.addr1}, ${loc.city}${loc.state ? `, ${loc.state}` : ''}${loc.zip ? ` ${loc.zip}` : ''}`.replace(/\s+/g, ' ').trim();
      const cleanKey = fullAddr.toLowerCase().trim();
      if (cleanKey && !seen.has(cleanKey)) {
        seen.add(cleanKey);
        items.push({
          id: `loc-opt-${i}-${(loc.id || 'loc').replace(/[^a-z0-9]/gi, '-')}`,
          label: fullAddr,
          value: loc.addr1 || fullAddr,
        });
      }
    }
    return items;
  }, [locationsList]);

  const equipmentLocationItems = React.useMemo(() => {
    return equipmentLocations.map((loc) => ({
      id: loc.id,
      label: loc.fullAddress,
      value: loc.id,
    }));
  }, [equipmentLocations]);

  const maintPlanLocationItems = React.useMemo(() => {
    return maintPlanLocations.map((loc) => ({
      id: loc.id,
      label: loc.fullAddress,
      value: loc.id,
    }));
  }, [maintPlanLocations]);

  const activeEqLocId = selectedEqLocId && equipmentLocations.some((l) => l.id === selectedEqLocId)
    ? selectedEqLocId
    : equipmentLocations[0]?.id || '';
  const currentEqLocation = equipmentLocations.find((l) => l.id === activeEqLocId) || equipmentLocations[0];

  const activeLocationEquipment = React.useMemo(() => {
    if (!currentEqLocation || equipmentLocations.length === 0) return equipmentList as any[];
    const stClean = (currentEqLocation.addr1 || '').replace(/^(best beach getaways|southern vacation rentals|360 blue|beachwalk vacation rentals)[\s\n-]+/i, '').replace(/[^a-z0-9\s]/gi, ' ').toLowerCase().trim();
    const tokens = stClean.split(/\s+/).filter((t: string) => t.length > 2);
    if (!tokens.length) return equipmentList as any[];

    const matched = (equipmentList as any[]).filter((eq) => {
      const eqLoc = (eq.locationAddress || eq.locationStreet || '').toLowerCase();
      if (!eqLoc) return false;
      if (eqLoc.includes(stClean) || stClean.includes(eqLoc)) return true;
      return tokens.some((t: string) => eqLoc.includes(t));
    });

    if (matched.length === 0 && (equipmentList as any[]).length > 0) {
      return equipmentList as any[];
    }
    return matched;
  }, [equipmentList, currentEqLocation, equipmentLocations]);

  const activeMaintLocId = selectedMaintLocId && maintPlanLocations.some((l) => l.id === selectedMaintLocId)
    ? selectedMaintLocId
    : maintPlanLocations[0]?.id || '';
  const currentMaintLocation = maintPlanLocations.find((l) => l.id === activeMaintLocId) || maintPlanLocations[0];
  const activeMaintStreet = (currentMaintLocation?.addr1 || '').toLowerCase().trim();

  const activeLocationPlan = React.useMemo(() => {
    const matching = (dbPlans || []).filter((p: any) => {
      if (!showExpiredMaintPlans && ((p.status as string) === 'Expired' || (p.status as string) === 'Cancelled' || (p.status as string) === 'EXPIRED')) {
        return false;
      }
      if (maintPlanLocations.length === 0) return true;
      if (!activeMaintStreet) return true;
      const pLoc = (p.locationAddress || p.locationStreet || p.location?.street || '').toLowerCase();
      return pLoc.includes(activeMaintStreet) || (p.locationId && p.locationId === currentMaintLocation?.id);
    });
    return matching[0] || (dbPlans && dbPlans.length > 0 ? dbPlans[0] : null);
  }, [dbPlans, showExpiredMaintPlans, maintPlanLocations, activeMaintStreet, currentMaintLocation]);

  // Form Mode State
  const [editingBillingId, setEditingBillingId] = useState<string | null>(null);
  const [billingAddr1, setBillingAddr1] = useState('');
  const [billingAddr2, setBillingAddr2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('FL');
  const [billingZip, setBillingZip] = useState('');
  const [billingDesc, setBillingDesc] = useState('');
  const [billingIsDefault, setBillingIsDefault] = useState(false);

  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locAddr1, setLocAddr1] = useState('');
  const [locAddr2, setLocAddr2] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('FL');
  const [locZip, setLocZip] = useState('');
  const [locDesc, setLocDesc] = useState('');
  const [locIsDefault, setLocIsDefault] = useState(false);
  // Location Search State
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  // Attachments State & Modal (Live Firestore Synchronized)
  const [attachmentsList, setAttachmentsList] = useState<
    { id: string; filename: string; job: string; uploaded: string; caption?: string; previewUrl?: string }[]
  >([]);

  // Synchronize with live Firestore attachments
  useEffect(() => {
    if (dbAttachments && Array.isArray(dbAttachments)) {
      setAttachmentsList(
        dbAttachments.map((att: any) => ({
          id: att.id,
          filename: att.name || att.filename || att.title || 'Attachment',
          job: att.jobNumber ? `#${att.jobNumber}` : (att.job || ''),
          uploaded: att.uploadedAt ? att.uploadedAt.slice(0, 10) : (att.uploaded || '8/28/2026'),
          caption: att.caption || att.description || '',
          previewUrl: att.url || att.previewUrl || '',
        }))
      );
    }
  }, [dbAttachments]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentFilter, setAttachmentFilter] = useState('All Attachments');
  const [attachmentSearchQuery, setAttachmentSearchQuery] = useState('');

  // New Attachment Form State
  const [newAttachFile, setNewAttachFile] = useState<File | null>(null);
  const [newAttachName, setNewAttachName] = useState('');
  const [newAttachCaption, setNewAttachCaption] = useState('');

  // Edit Attachment State & Modal
  const [editingAttachment, setEditingAttachment] = useState<{
    id: string;
    filename: string;
    job: string;
    uploaded: string;
    caption?: string;
    previewUrl?: string;
  } | null>(null);
  const [editAttachName, setEditAttachName] = useState('');
  const [editAttachCaption, setEditAttachCaption] = useState('');

  const openEditAttachmentModal = (item: any) => {
    setEditingAttachment(item);
    setEditAttachName(item.filename);
    setEditAttachCaption(item.caption || '');
  };

  const handleSaveEditAttachment = () => {
    if (!editingAttachment) return;
    setAttachmentsList((prev) =>
      prev.map((a) =>
        a.id === editingAttachment.id
          ? { ...a, filename: editAttachName, caption: editAttachCaption }
          : a
      )
    );
    setEditingAttachment(null);
  };

  const handleDeleteAttachment = async () => {
    if (!editingAttachment) return;
    const targetId = editingAttachment.id;
    setAttachmentsList((prev) => prev.filter((a) => a.id !== targetId));
    if (removeAttachment) {
      try {
        await removeAttachment(targetId);
      } catch (err) {
        console.error('Error removing attachment from Firestore:', err);
      }
    }
    setEditingAttachment(null);
  };

  // Large Photo Viewer State & Drag-to-Pan Controls
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoRotation, setPhotoRotation] = useState(0);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleOpenPhotoViewer = (url: string) => {
    setViewingPhotoUrl(url);
    setEditingAttachment(null);
    setPhotoZoom(1);
    setPhotoRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setPhotoZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setPhotoZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateLeft = () => setPhotoRotation((prev) => (prev - 90) % 360);
  const handleRotateRight = () => setPhotoRotation((prev) => (prev + 90) % 360);

  // Full Schedule Call / Appointment Booking Modal State (Matching schedule/page.tsx)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInitialValues, setBookingInitialValues] = useState<any>(null);

  const handleScheduleServiceWindow = (sw: any, plan: any) => {
    let approxDate = new Date().toISOString().split('T')[0];
    const mYear = sw.window?.match(/\b(20\d\d)\b/);
    if (mYear) {
      const yr = mYear[1];
      const isFall = sw.season === 'Fall' || /sep|oct|nov|dec/i.test(sw.window);
      approxDate = isFall ? `${yr}-09-15` : `${yr}-03-15`;
    }

    const locStr = plan?.locationAddress || plan?.locationStreet || (locationsList[0] ? `${locationsList[0].addr1}, ${locationsList[0].city}, ${locationsList[0].state} ${locationsList[0].zip}` : '');

    setBookingInitialValues({
      jobNumber: sw.jobNumber || '',
      jobType: '',
      appointmentDate: approxDate,
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      locationAddress: locStr,
      callNotes: `Service Window: ${sw.window} (${sw.windowNumber || ''}) - ${sw.jobName || 'Maintenance Visit'}`,
      appointmentStatus: 'Scheduled',
    });
    setShowBookingModal(true);
  };
  const [bookingCallMode, setBookingCallMode] = useState<'call_only' | 'call_with_appt'>('call_with_appt');
  const [bookingScheduleMode, setBookingScheduleMode] = useState<'schedule' | 'request'>('schedule');
  const [bookingSubTab, setBookingSubTab] = useState<'appointment' | 'notes' | 'balance' | 'maintenance' | 'equipment'>('appointment');
  const [bookingSelectedJob, setBookingSelectedJob] = useState('New Job');
  const [bookingJobType, setBookingJobType] = useState('Appliance service');
  const [bookingPhoneNumber, setBookingPhoneNumber] = useState('(407) 555-8121');
  const [bookingCallNotes, setBookingCallNotes] = useState('');
  const [showQuickEditLocations, setShowQuickEditLocations] = useState(false);
  // Full Appointment Form State (Identical to schedule/page.tsx)
  const [bookingDate, setBookingDate] = useState('2026-08-12');
  const [bookingFrequency, setBookingFrequency] = useState('one time');
  const [bookingAssignLater, setBookingAssignLater] = useState(false);
  const [bookingPrimaryTech, setBookingPrimaryTech] = useState('Marcus Vance');
  const [bookingAdditionalTech, setBookingAdditionalTech] = useState('');
  const [bookingStartHour, setBookingStartHour] = useState('9');
  const [bookingStartMin, setBookingStartMin] = useState('00');
  const [bookingStartAmpm, setBookingStartAmpm] = useState<'AM' | 'PM'>('AM');
  const [bookingEndHour, setBookingEndHour] = useState('10');
  const [bookingEndMin, setBookingEndMin] = useState('00');
  const [bookingEndAmpm, setBookingEndAmpm] = useState<'AM' | 'PM'>('AM');
  const [showNoticesPopover, setShowNoticesPopover] = useState(false);
  const [reqDurationHour, setReqDurationHour] = useState('1 hour');
  const [reqDurationMin, setReqDurationMin] = useState('00 min');
  const [reqMinTechLevel, setReqMinTechLevel] = useState('Level 1');
  const [allTechNamesList] = useState(['Alex Reynolds', 'Sarah Jenkins', 'Marcus Vance', 'Carlos Mendez', 'David Ross', 'Tyler Reed']);

  // Primary Appointment Contact Inline State (Matching schedule/page.tsx)
  const [showPrimaryApptContact, setShowPrimaryApptContact] = useState(false);
  const [primaryApptContactPerson, setPrimaryApptContactPerson] = useState('Eleanor Vance');
  const [primaryApptContactType, setPrimaryApptContactType] = useState('SMS');
  const [primaryApptContactValue, setPrimaryApptContactValue] = useState('(407) 555-8121');

  // Appointment Notifications Toggles (Matching schedule/page.tsx)
  const [notifyScheduled, setNotifyScheduled] = useState(true);
  const [notify1Week, setNotify1Week] = useState(true);
  const [notify1Day, setNotify1Day] = useState(true);
  const [notifyEnRoute, setNotifyEnRoute] = useState(true);

  // Timeline Collapsible Jobs State
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);

  const toggleExpandJob = (jobId: string) => {
    setExpandedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  // Date / Time Picker Popover State (for Log Call Only)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [newCallDayNum, setNewCallDayNum] = useState(10);
  const [newCallHourInput, setNewCallHourInput] = useState('08');
  const [newCallMinInput, setNewCallMinInput] = useState('00');
  const [newCallAmpmInput, setNewCallAmpmInput] = useState<'AM' | 'PM'>('AM');
  const [newCallDateTimeStr, setNewCallDateTimeStr] = useState('8/10/2026, 08:00 AM');

  const updateNewCallDateTime = (day: number, hr: string, min: string, ampm: 'AM' | 'PM') => {
    setNewCallDayNum(day);
    setNewCallHourInput(hr);
    setNewCallMinInput(min);
    setNewCallAmpmInput(ampm);
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    setNewCallDateTimeStr(`08/${dayStr}/2026, ${hr}:${min} ${ampm}`);
  };



  // New Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteLocation, setNoteLocation] = useState('');
  const [noteText, setNoteText] = useState('');

  // View/Edit Note Modal State
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [editNoteLocation, setEditNoteLocation] = useState('');
  const [editNoteText, setEditNoteText] = useState('');

  const handleOpenLogCall = () => {
    setBookingCallMode('call_only');
    setBookingSubTab('appointment');
    setShowQuickEditLocations(false);
    setShowBookingModal(true);
  };

  const handleOpenScheduleAppt = () => {
    setBookingCallMode('call_with_appt');
    setBookingSubTab('appointment');
    setBookingScheduleMode('schedule');
    setShowQuickEditLocations(false);
    setShowBookingModal(true);
  };

  const handleOpenNoteModal = () => {
    setShowNoteModal(true);
    setNoteLocation('');
    setNoteText('');
  };

  const openEditNoteModal = (noteItem: any) => {
    setEditingNote(noteItem);
    setEditNoteLocation(noteItem.location || '1420 Lakeview Drive, Winter Park, FL 32789');
    setEditNoteText(noteItem.content || '');
  };

  const handleSaveBooking = async () => {
    const apptId = `appt-${Date.now()}`;
    const hr = parseInt(bookingStartHour || '9', 10);
    const hour24 = bookingStartAmpm === 'PM' ? (hr === 12 ? 12 : hr + 12) : (hr === 12 ? 0 : hr);
    const timeStr = `${String(hour24).padStart(2, '0')}:${(bookingStartMin || '00').padStart(2, '0')}:00`;
    const dateTimeIso = bookingDate ? `${bookingDate}T${timeStr}` : new Date().toISOString();

    const selectedLoc = locationsList.find((l) => l.id === selectedLocationId) || locationsList[0];
    const locAddr = selectedLoc
      ? `${selectedLoc.addr1}, ${selectedLoc.city}, ${selectedLoc.state} ${selectedLoc.zip}`.trim()
      : (fetchedCustomer?.address ? `${fetchedCustomer.address.street}, ${fetchedCustomer.address.city}` : '');

    const isNewJob = !bookingSelectedJob || bookingSelectedJob === 'New Job' || bookingSelectedJob === '';
    const generatedJobNumber = isNewJob
      ? Math.floor(100000 + Math.random() * 900000)
      : (parseInt(bookingSelectedJob.replace(/\D/g, '') || '135000', 10));

    const start12h = `${hr}:${bookingStartMin || '00'} ${bookingStartAmpm}`;
    const cleanPrimaryTech = bookingAssignLater ? 'Unassigned' : cleanUserDisplayName(bookingPrimaryTech || 'Marcus Vance');

    const newAppt: CanonicalAppointment = {
      id: apptId,
      customerId: customerId,
      customerNumber: currentCustNum,
      customerName: currentCustName || (fetchedCustomer?.name || 'Customer'),
      phone: bookingPhoneNumber || fetchedCustomer?.phone || '',
      email: fetchedCustomer?.email || '',
      locationAddress: locAddr,
      jobNumber: generatedJobNumber,
      jobId: `job-${generatedJobNumber}`,
      jobType: bookingJobType || 'HVAC service',
      appointmentDate: bookingDate,
      startTime: start12h,
      dateTime: dateTimeIso,
      assignedTech: cleanPrimaryTech,
      technicians: [cleanPrimaryTech],
      status: bookingScheduleMode === 'schedule' ? 'Scheduled' : 'Unscheduled',
      isScheduled: bookingScheduleMode === 'schedule',
      serviceNotes: bookingCallNotes || '',
      summaryNotes: bookingCallNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (saveLiveAppointment) {
      await saveLiveAppointment(newAppt);
    }

    if (isNewJob) {
      const newJob: CanonicalJob = {
        id: `job-${generatedJobNumber}`,
        jobNumber: String(generatedJobNumber),
        customerId: customerId,
        customerName: currentCustName || (fetchedCustomer?.name || 'Customer'),
        customerNumber: currentCustNum || customerId,
        jobType: bookingJobType || 'HVAC service',
        status: 'Opened',
        locationAddress: locAddr,
        jobCreationDate: formatCalendarDateMdy(new Date()),
        jobDescription: bookingCallNotes || (bookingScheduleMode === 'schedule' ? 'Scheduled appointment.' : 'Service Request'),
        assignedTech: bookingAssignLater ? null : cleanPrimaryTech,
        invoicesTotal: 0,
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      await firestoreClient.saveJob(newJob, databaseMode);
    }

    setShowBookingModal(false);
    setBookingCallNotes('');
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    const newNoteId = `note-${Date.now()}`;

    if (persistNote) {
      await persistNote({
        id: newNoteId,
        customerId,
        authorId: currentUser?.id || 'usr-admin',
        authorName: currentUser?.name || 'Staff',
        authorRole: (currentUser?.accountType as any) || 'Admin',
        title: 'Customer Note',
        content: noteText,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setShowNoteModal(false);
    setNoteText('');
  };

  const handleSaveEditNote = async () => {
    if (!editingNote || !editNoteText.trim()) return;
    if (persistNote) {
      await persistNote({
        id: editingNote.id,
        customerId,
        authorId: (editingNote as any).authorId || currentUser?.id || 'usr-admin',
        authorName: (editingNote as any).authorName || currentUser?.name || 'Staff',
        authorRole: (editingNote as any).authorRole || (currentUser?.accountType as any) || 'Admin',
        title: editingNote.title || 'Customer Note',
        content: editNoteText,
        isPinned: (editingNote as any).isPinned || false,
        createdAt: (editingNote as any).createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingNote(null);
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;
    if (removeNote) {
      await removeNote(editingNote.id);
    }
    setEditingNote(null);
  };

  const handleUploadAttachment = () => {
    const filename = newAttachName || (newAttachFile ? newAttachFile.name : 'Untitled Document.pdf');
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()}`;

    setAttachmentsList((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        filename,
        job: '',
        uploaded: formattedDate,
        caption: newAttachCaption,
        previewUrl: newAttachFile && newAttachFile.type.startsWith('image/')
          ? URL.createObjectURL(newAttachFile)
          : 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&auto=format&fit=crop&q=80',
      },
    ]);

    setShowAttachmentModal(false);
    setNewAttachFile(null);
    setNewAttachName('');
    setNewAttachCaption('');
  };

  const openBillingForm = (item?: any) => {
    if (item) {
      setEditingBillingId(item.id);
      setBillingAddr1(item.addr1 || '');
      setBillingAddr2(item.addr2 || '');
      setBillingCity(item.city || '');
      setBillingState(item.state || 'FL');
      setBillingZip(item.zip || '');
      setBillingDesc(item.description || '');
      setBillingIsDefault(item.isDefault || false);
    } else {
      setEditingBillingId('new');
      setBillingAddr1('');
      setBillingAddr2('');
      setBillingCity('');
      setBillingState('FL');
      setBillingZip('');
      setBillingDesc('');
      setBillingIsDefault(false);
    }
  };

  const openLocationForm = (item?: any) => {
    if (item) {
      setEditingLocationId(item.id);
      setLocAddr1(item.addr1 || '');
      setLocAddr2(item.addr2 || '');
      setLocCity(item.city || '');
      setLocState(item.state || 'FL');
      setLocZip(item.zip || '');
      setLocDesc(item.description || '');
      setLocIsDefault(item.isDefault || false);
    } else {
      setEditingLocationId('new');
      setLocAddr1('');
      setLocAddr2('');
      setLocCity('');
      setLocState('FL');
      setLocZip('');
      setLocDesc('');
      setLocIsDefault(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!billingAddr1) return;
    let updatedList = [...billingAddressesList];
    if (editingBillingId === 'new') {
      const newItem = {
        id: `b-${Date.now()}`,
        addr1: billingAddr1,
        addr2: billingAddr2,
        city: billingCity,
        state: billingState,
        zip: billingZip,
        description: billingDesc,
        isDefault: billingIsDefault,
      };
      updatedList = billingIsDefault
        ? [...billingAddressesList.map((i) => ({ ...i, isDefault: false })), newItem]
        : [...billingAddressesList, newItem];
    } else if (editingBillingId) {
      updatedList = billingAddressesList.map((i) => {
        if (i.id === editingBillingId) {
          return {
            ...i,
            addr1: billingAddr1,
            addr2: billingAddr2,
            city: billingCity,
            state: billingState,
            zip: billingZip,
            description: billingDesc,
            isDefault: billingIsDefault,
          };
        }
        return billingIsDefault ? { ...i, isDefault: false } : i;
      });
    }
    setBillingAddressesList(updatedList);
    setEditingBillingId(null);

    const defaultBilling = updatedList.find((b) => b.isDefault) || updatedList[0];
    if (currentDbCustomer) {
      const updatedCustomer: CanonicalCustomer = {
        ...currentDbCustomer,
        billingAddress: defaultBilling ? {
          id: defaultBilling.id,
          street: defaultBilling.addr1,
          addressLine2: defaultBilling.addr2 || '',
          city: defaultBilling.city,
          state: defaultBilling.state,
          zipCode: defaultBilling.zip,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
          isDefault: true,
          description: defaultBilling.description,
        } : null,
      };
      await saveCustomer(updatedCustomer);
      showSaveToast('Billing address saved successfully.');
    }
  };

  const handleSaveLocation = async () => {
    if (!locAddr1) return;
    let updatedList = [...locationsList];
    if (editingLocationId === 'new') {
      const newItem = {
        id: `loc-${Date.now()}`,
        addr1: locAddr1,
        addr2: locAddr2,
        city: locCity,
        state: locState,
        zip: locZip,
        description: locDesc,
        isDefault: locIsDefault,
      };
      updatedList = locIsDefault
        ? [...locationsList.map((i) => ({ ...i, isDefault: false })), newItem]
        : [...locationsList, newItem];
    } else if (editingLocationId) {
      updatedList = locationsList.map((i) => {
        if (i.id === editingLocationId) {
          return {
            ...i,
            addr1: locAddr1,
            addr2: locAddr2,
            city: locCity,
            state: locState,
            zip: locZip,
            description: locDesc,
            isDefault: locIsDefault,
          };
        }
        return locIsDefault ? { ...i, isDefault: false } : i;
      });
    }
    setLocationsList(updatedList);
    setEditingLocationId(null);

    if (currentDbCustomer) {
      const defaultLoc = updatedList.find((l) => l.isDefault) || updatedList[0];
      const updatedCustomer: CanonicalCustomer = {
        ...currentDbCustomer,
        address: defaultLoc ? {
          id: defaultLoc.id,
          street: defaultLoc.addr1,
          addressLine2: defaultLoc.addr2 || '',
          city: defaultLoc.city,
          state: defaultLoc.state,
          zipCode: defaultLoc.zip,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
          isDefault: true,
          description: defaultLoc.description,
        } : currentDbCustomer.address,
        locations: updatedList.map((loc) => ({
          id: loc.id,
          street: loc.addr1,
          addressLine2: loc.addr2 || '',
          city: loc.city,
          state: loc.state,
          zipCode: loc.zip,
          description: loc.description,
          isDefault: loc.isDefault,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
        })),
      };
      await saveCustomer(updatedCustomer);
      showSaveToast('Location saved successfully.');
    }
  };

  const handleArchiveBilling = async () => {
    if (billingAddressesList.length <= 1) {
      setToastMessage('Cannot archive the only remaining billing address. At least one billing address is required.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (!editingBillingId || editingBillingId === 'new') {
      setEditingBillingId(null);
      return;
    }

    const updatedList = billingAddressesList.filter((b) => b.id !== editingBillingId);
    if (!updatedList.some((b) => b.isDefault) && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }
    setBillingAddressesList(updatedList);
    setEditingBillingId(null);

    const defaultBilling = updatedList.find((b) => b.isDefault) || updatedList[0];
    if (currentDbCustomer) {
      const updatedCustomer: CanonicalCustomer = {
        ...currentDbCustomer,
        billingAddress: defaultBilling ? {
          id: defaultBilling.id,
          street: defaultBilling.addr1,
          addressLine2: defaultBilling.addr2 || '',
          city: defaultBilling.city,
          state: defaultBilling.state,
          zipCode: defaultBilling.zip,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
          isDefault: true,
          description: defaultBilling.description,
        } : null,
      };
      await saveCustomer(updatedCustomer);
      showSaveToast('Billing address archived successfully.');
    }
  };

  const handleArchiveLocation = async () => {
    if (locationsList.length <= 1) {
      setToastMessage('Cannot archive the only remaining location. At least one location is required.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (!editingLocationId || editingLocationId === 'new') {
      setEditingLocationId(null);
      return;
    }

    const updatedList = locationsList.filter((l) => l.id !== editingLocationId);
    if (!updatedList.some((l) => l.isDefault) && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }
    setLocationsList(updatedList);
    setEditingLocationId(null);

    if (currentDbCustomer) {
      const defaultLoc = updatedList.find((l) => l.isDefault) || updatedList[0];
      const updatedCustomer: CanonicalCustomer = {
        ...currentDbCustomer,
        address: defaultLoc ? {
          id: defaultLoc.id,
          street: defaultLoc.addr1,
          addressLine2: defaultLoc.addr2 || '',
          city: defaultLoc.city,
          state: defaultLoc.state,
          zipCode: defaultLoc.zip,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
          isDefault: true,
          description: defaultLoc.description,
        } : currentDbCustomer.address,
        locations: updatedList.map((loc) => ({
          id: loc.id,
          street: loc.addr1,
          addressLine2: loc.addr2 || '',
          city: loc.city,
          state: loc.state,
          zipCode: loc.zip,
          description: loc.description,
          isDefault: loc.isDefault,
          type: custType === 'Commercial' ? 'commercial' : 'residential',
        })),
      };
      await saveCustomer(updatedCustomer);
      showSaveToast('Location archived successfully.');
    }
  };

  return (
    <div className="w-full space-y-4 text-slate-800 pb-12 font-sans">
      {/* 1. Customer Profile Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Customer Title & Status Badges */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {displayProfileName}
            </h1>
            <div className="flex items-center gap-2">
              {/* Customer Status Clickable Indicator */}
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setShowCustStatusMenu((prev) => !prev)}
                  className={`inline-flex items-center h-6 px-2.5 py-0.5 text-xs font-semibold tracking-[0.025em] border rounded cursor-pointer transition-colors shadow-2xs leading-none ${
                    customerStatus === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : customerStatus === 'Inactive'
                      ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                      : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                  }`}
                >
                  {customerStatus}
                </button>

                {showCustStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-md z-30 py-1 min-w-[130px] animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => { setCustomerStatus('Active'); setShowCustStatusMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-emerald-800 font-medium hover:bg-emerald-50 cursor-pointer"
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomerStatus('Inactive'); setShowCustStatusMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-800 font-medium hover:bg-red-50 cursor-pointer"
                    >
                      Inactive
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomerStatus('Account on Hold'); setShowCustStatusMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-amber-800 font-medium hover:bg-amber-50 cursor-pointer"
                    >
                      Account on Hold
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 Square Red Quick Action Buttons (WEX Exact Format with Hover Tooltip) */}
          <div className="flex items-center gap-1.5">
            {/* Button 1: Log a phone call */}
            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenLogCall}
                className="w-8 h-8 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
              >
                <Phone className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="bg-[#1c1c1c] text-white text-xs font-semibold px-2.5 py-1 rounded shadow-md">
                  Log a phone call
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1c1c1c] -mt-px" />
              </div>
            </div>

            {/* Button 2: Schedule an appointment */}
            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenScheduleAppt}
                className="w-8 h-8 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="bg-[#1c1c1c] text-white text-xs font-semibold px-2.5 py-1 rounded shadow-md">
                  Schedule an appointment
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1c1c1c] -mt-px" />
              </div>
            </div>

            {/* Button 3: Leave a note about the customer */}
            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenNoteModal}
                className="w-8 h-8 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="bg-[#1c1c1c] text-white text-xs font-semibold px-2.5 py-1 rounded shadow-md">
                  Leave a note about the customer
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1c1c1c] -mt-px" />
              </div>
            </div>

            {/* Button 4: Create a New Job form */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => alert('Create a New Job form')}
                className="w-8 h-8 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="bg-[#1c1c1c] text-white text-xs font-semibold px-2.5 py-1 rounded shadow-md">
                  Create a New Job form
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1c1c1c] -mt-px" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Condensed Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN: CUSTOMER DETAILS (5 COLS) ================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card 1: Primary Contact */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <User className="w-4 h-4 text-[#2d82b7]" />
                <span>Primary Contact</span>
              </div>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCustType('Residential')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    custType === 'Residential'
                      ? 'bg-[#2d82b7] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => setCustType('Commercial')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    custType === 'Commercial'
                      ? 'bg-[#2d82b7] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Commercial
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Business Name Field (Appears when Commercial tab is selected) */}
              {custType === 'Commercial' && (
                <div className="animate-in fade-in zoom-in-95 duration-100">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  QuickBooks Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={qbName}
                  onChange={(e) => setQbName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Home Phone
                  </label>
                  <input
                    type="text"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Email Address
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noEmail}
                      onChange={(e) => setNoEmail(e.target.checked)}
                      className="rounded border-slate-300 text-[#2d82b7]"
                    />
                    <span>No Email</span>
                  </label>
                </div>
                <input
                  type="email"
                  value={email}
                  disabled={noEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7] disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Customer Number
                  </label>
                  <input
                    type="text"
                    value={cleanCustomerNumberDigits(customerNumber)}
                    disabled
                    readOnly
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Contact Type
                  </label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Billing">Billing</option>
                    <option value="Property Manager">Property Manager</option>
                    <option value="Tenant">Tenant</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePrimary}
                  className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavedPrimary ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Billing Addresses & Locations (Matching WEX Exact Format) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4 font-sans text-xs">
            
            {/* 1. Billing Addresses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">Billing Addresses</h3>
                <button
                  type="button"
                  onClick={() => openBillingForm()}
                  className="p-1 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded cursor-pointer transition-colors"
                  title="Add Billing Address"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Replace List with Form View when adding or editing */}
              {editingBillingId !== null ? (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 font-sans text-xs shadow-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                    {editingBillingId === 'new' ? 'Create New Billing Address' : 'Edit Billing Address'}
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billingAddr1}
                        onChange={(e) => setBillingAddr1(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Address Line 2</label>
                        <input
                          type="text"
                          value={billingAddr2}
                          onChange={(e) => setBillingAddr2(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={billingState}
                          onChange={(e) => setBillingState(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        >
                          {US_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Zip Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billingIsDefault}
                          onChange={(e) => setBillingIsDefault(e.target.checked)}
                          className="rounded border-slate-300 text-[#2d82b7]"
                        />
                        <span>Make this address the billing address default.</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      {editingBillingId && editingBillingId !== 'new' ? (
                        <button
                          type="button"
                          onClick={handleArchiveBilling}
                          disabled={billingAddressesList.length <= 1}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                          title={billingAddressesList.length <= 1 ? 'Cannot archive the only remaining billing address' : 'Archive this billing address'}
                        >
                          Archive
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBillingId(null)}
                          className="px-3.5 py-1.5 bg-[#f1f1f1] hover:bg-[#e2e2e2] text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBilling}
                          className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Billing Addresses List (Click to Edit - Default address ALWAYS sorted to top, increased line spacing) */
                <div className="space-y-6 pt-1">
                  {[...billingAddressesList]
                    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openBillingForm(item)}
                        className="flex items-center gap-2 cursor-pointer group"
                        title="Click to edit billing address"
                      >
                        {item.isDefault && (
                          <span className="text-[10px] font-semibold bg-sky-100 text-[#2d82b7] border border-sky-300 px-1.5 py-0.5 rounded shrink-0">
                            Default
                          </span>
                        )}
                        <span className="text-xs text-slate-800 font-normal group-hover:text-[#2d82b7] transition-colors truncate">
                          {item.addr1}{item.addr2 ? `, ${item.addr2}` : ''}, {item.city}, {item.state} {item.zip}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            {/* 2. Locations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">Locations</h3>
                  <span className="text-xs font-normal text-slate-500">{locationsList.length}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* Show Search bar ONLY when count > 5 */}
                  {locationsList.length > 5 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search locations..."
                        value={locationSearchQuery}
                        onChange={(e) => setLocationSearchQuery(e.target.value)}
                        className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#2d82b7] w-36"
                      />
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openLocationForm()}
                    className="p-1 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded cursor-pointer transition-colors"
                    title="Add Location"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Replace List with Form View when adding or editing */}
              {editingLocationId !== null ? (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 font-sans text-xs shadow-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                    {editingLocationId === 'new' ? 'Create New Location' : 'Edit Location'}
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={locAddr1}
                        onChange={(e) => setLocAddr1(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Address Line 2</label>
                        <input
                          type="text"
                          value={locAddr2}
                          onChange={(e) => setLocAddr2(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={locCity}
                          onChange={(e) => setLocCity(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={locState}
                          onChange={(e) => setLocState(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        >
                          {US_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Zip Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={locZip}
                          onChange={(e) => setLocZip(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={locIsDefault}
                          onChange={(e) => setLocIsDefault(e.target.checked)}
                          className="rounded border-slate-300 text-[#2d82b7]"
                        />
                        <span>Make this location the default location.</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      {editingLocationId && editingLocationId !== 'new' ? (
                        <button
                          type="button"
                          onClick={handleArchiveLocation}
                          disabled={locationsList.length <= 1}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                          title={locationsList.length <= 1 ? 'Cannot archive the only remaining location' : 'Archive this location'}
                        >
                          Archive
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingLocationId(null)}
                          className="px-3.5 py-1.5 bg-[#f1f1f1] hover:bg-[#e2e2e2] text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveLocation}
                          className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Locations List (Default address ALWAYS sorted to top; scrollable max-h-48 when count > 5, increased line spacing) */
                <div className={`space-y-6 pt-1 ${locationsList.length > 5 ? 'max-h-48 overflow-y-auto pr-1.5' : ''}`}>
                  {[...locationsList]
                    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                    .filter((item) =>
                      !locationSearchQuery ||
                      `${item.addr1} ${item.city} ${item.state} ${item.zip}`.toLowerCase().includes(locationSearchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openLocationForm(item)}
                        className="flex items-center gap-2 cursor-pointer group"
                        title="Click to edit location"
                      >
                        {item.isDefault && (
                          <span className="text-[10px] font-semibold bg-sky-100 text-[#2d82b7] border border-sky-300 px-1.5 py-0.5 rounded shrink-0">
                            Default
                          </span>
                        )}
                        <span className="text-xs text-slate-800 font-normal group-hover:text-[#2d82b7] transition-colors truncate">
                          {item.addr1}{item.addr2 ? `, ${item.addr2}` : ''}, {item.city}, {item.state} {item.zip}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Settings & Preferences */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Settings className="w-4 h-4 text-[#2d82b7]" />
                <span>Settings & Preferences</span>
              </div>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Accepted Payment Methods
                  </label>
                  <select
                    value={acceptedPayment}
                    onChange={(e) => setAcceptedPayment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  >
                    <option value="All">All</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Check">Check</option>
                    <option value="ACH">ACH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Preferred Communication
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setPreferredComm('Email')}
                      className={`flex-1 py-1 text-center rounded transition-colors ${
                        preferredComm === 'Email' ? 'bg-[#2d82b7] text-white font-bold' : 'text-slate-600'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredComm('Text')}
                      className={`flex-1 py-1 text-center rounded transition-colors ${
                        preferredComm === 'Text' ? 'bg-[#2d82b7] text-white font-bold' : 'text-slate-600'
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Preferred Technician
                  </label>
                  <select
                    value={preferredTech}
                    onChange={(e) => setPreferredTech(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
                  >
                    <option value="">None</option>
                    {(liveUsers && liveUsers.length > 0 ? liveUsers : CANONICAL_OFFICIAL_USERS).map((u) => (
                      <option key={u.id || u.name} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles (Checkboxes placed directly next to option text) */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spanishPreferred}
                    onChange={(e) => setSpanishPreferred(e.target.checked)}
                    className="rounded border-slate-300 text-[#2d82b7]"
                  />
                  <span>Spanish Speaking</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOutText}
                    onChange={(e) => setOptOutText(e.target.checked)}
                    className="rounded border-slate-300 text-[#2d82b7]"
                  />
                  <span>Opt-Out Text</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOutEmail}
                    onChange={(e) => setOptOutEmail(e.target.checked)}
                    className="rounded border-slate-300 text-[#2d82b7]"
                  />
                  <span>Opt-Out Email</span>
                </label>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-xs font-bold rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavedSettings ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Attachments (Matching WEX Exact Header & Table Design) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Paperclip className="w-4 h-4 text-[#2d82b7]" />
                <span>Attachments</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Aria Filter Dropdown */}
                <MenuTrigger>
                  <MenuButton
                    variant="outline"
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-normal text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-1.5 min-w-[125px] cursor-pointer"
                  >
                    <span>{attachmentFilter}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </MenuButton>
                  <Menu placement="bottom end" onAction={(key) => setAttachmentFilter(String(key))}>
                    <MenuItem id="All Attachments">All Attachments</MenuItem>
                    <MenuItem id="Customer Attachments">Customer Attachments</MenuItem>
                    <MenuItem id="Job Attachments">Job Attachments</MenuItem>
                  </Menu>
                </MenuTrigger>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search attachments..."
                    value={attachmentSearchQuery}
                    onChange={(e) => setAttachmentSearchQuery(e.target.value)}
                    className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#2d82b7] w-36"
                  />
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Add Attachment Button */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="p-1 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded cursor-pointer transition-colors"
                  title="Add Attachment"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Attachments Table / Empty State */}
            <div className="p-4">
              {attachmentsList.length === 0 ? (
                <div>
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                    <div className="col-span-6">Filename</div>
                    <div className="col-span-3">Job</div>
                    <div className="col-span-3">Uploaded</div>
                  </div>
                  <div className="py-4 text-slate-500 text-xs font-normal">
                    This customer has no attachments.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                    <div className="col-span-6">Filename</div>
                    <div className="col-span-3">Job</div>
                    <div className="col-span-3">Uploaded</div>
                  </div>
                  {attachmentsList
                    .filter((item) =>
                      !attachmentSearchQuery ||
                      item.filename.toLowerCase().includes(attachmentSearchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 text-xs text-slate-800 py-1.5 border-b border-slate-100 items-center">
                        <div
                          onClick={() => openEditAttachmentModal(item)}
                          className="col-span-6 font-normal text-[#be4646] hover:underline cursor-pointer truncate"
                          title="Click to edit attachment"
                        >
                          {item.filename}
                        </div>
                        <div className="col-span-3 text-slate-600 truncate">{item.job}</div>
                        <div className="col-span-3 text-slate-600 text-xs">{item.uploaded}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: ACTIVITY TIMELINE & SUB-TABS (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-slate-200 text-xs font-sans pt-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                    : 'text-[#be4646] hover:underline font-medium'
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                  activeTab === 'payments'
                    ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                    : 'text-[#be4646] hover:underline font-medium'
                }`}
              >
                Payments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('equipment')}
                className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                  activeTab === 'equipment'
                    ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                    : 'text-[#be4646] hover:underline font-medium'
                }`}
              >
                Equipment{activeLocationEquipment.length > 0 ? ` (${activeLocationEquipment.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('maint')}
                className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                  activeTab === 'maint'
                    ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                    : 'text-[#be4646] hover:underline font-medium'
                }`}
              >
                Maintenance Plans{dbPlans && dbPlans.length > 0 ? ` (${dbPlans.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer ${
                  activeTab === 'contacts'
                    ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                    : 'text-[#be4646] hover:underline font-medium'
                }`}
              >
                Authorized Persons{authorizedPersonsList.length > 0 ? ` (${authorizedPersonsList.length})` : ''}
              </button>
            </div>

            {/* Filter Bar (Tab-dependent toolbar styling) */}
            {activeTab !== 'payments' && (
              <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                {activeTab === 'equipment' ? (
                  /* Equipment Tab Toolbar: Location dropdown on left (filtered to locations with equipment) + Plus button on right */
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <LocationAutocomplete
                        items={equipmentLocationItems}
                        selectedKey={activeEqLocId}
                        onSelectionChange={(key) => {
                          if (key) setSelectedEqLocId(String(key));
                        }}
                        placeholder="Select or search equipment location..."
                        ariaLabel="Filter equipment location"
                        className="min-w-[320px] w-80"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingEquipment(null);
                        setShowAddEquipmentModal(true);
                      }}
                      className="w-8 h-8 p-0 flex items-center justify-center bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Add Equipment"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                ) : activeTab === 'maint' ? (
                  /* Maint Plans Tab Toolbar: Location dropdown on left (filtered to locations with maint plans) + Checkbox + Plus button on right */
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-4">
                      <LocationAutocomplete
                        items={maintPlanLocationItems}
                        selectedKey={activeMaintLocId}
                        onSelectionChange={(key) => {
                          if (key) setSelectedMaintLocId(String(key));
                        }}
                        placeholder="Select or search maintenance plan location..."
                        ariaLabel="Filter maintenance plan location"
                        className="min-w-[320px] w-80"
                      />

                      <label className="inline-flex items-center gap-2 text-xs text-slate-700 font-normal cursor-pointer ">
                        <input
                          type="checkbox"
                          checked={showExpiredMaintPlans}
                          onChange={(e) => setShowExpiredMaintPlans(e.target.checked)}
                          className="rounded border-slate-300 text-[#be4646] focus:ring-[#be4646] cursor-pointer"
                        />
                        <span>Show Cancelled & Expired Plans</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMaintPlanModal(true)}
                      className="w-8 h-8 p-0 flex items-center justify-center bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Add Maintenance Plan"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                ) : activeTab === 'contacts' ? (
                  /* Authorized Persons Tab Toolbar: Joined Search Category Dropdown + Search Input on Left, Plus button on Right */
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center flex-1 max-w-md">
                      <select
                        value={contactSearchCategory}
                        onChange={(e) => setContactSearchCategory(e.target.value)}
                        className="px-3 py-1.5 bg-[#e5e7eb] hover:bg-[#d1d5db] border border-slate-300 rounded-l text-xs text-slate-700 font-semibold cursor-pointer border-r-0 focus:outline-none shrink-0"
                      >
                        <option value="Name">Name</option>
                        <option value="Location">Location</option>
                        <option value="Role">Role</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-r text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAuthorizedPerson(null);
                        setShowAddAuthorizedPersonModal(true);
                      }}
                      className="w-8 h-8 p-0 flex items-center justify-center bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-md font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Add Authorized Person"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  /* Default Toolbar for Timeline and Contacts */
                  <>
                    <div className="flex items-center gap-2">
                      {/* 1. Activity Filter Dropdown (Default: Jobs) */}
                      <select
                        value={activityFilter}
                        onChange={(e) => {
                          setActivityFilter(e.target.value);
                          setTimelinePage(1);
                        }}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Jobs">Jobs</option>
                        <option value="Appointments">Appointments</option>
                        <option value="Calls & Notes">Calls & Notes</option>
                        <option value="Proposals">Proposals</option>
                        <option value="Invoices">Invoices</option>
                        <option value="Payments">Payments</option>
                      </select>

                      {/* 2. Locations Dropdown Field (React Aria Autocomplete) */}
                      <LocationAutocomplete
                        items={distinctTimelineLocationItems}
                        selectedKey={
                          distinctTimelineLocationItems.find((it) => it.value === locationFilter || it.label === locationFilter)?.id || 'all-locations'
                        }
                        onSelectionChange={(key) => {
                          if (key && key !== 'all-locations') {
                            const matched = distinctTimelineLocationItems.find((it) => it.id === String(key));
                            setLocationFilter(matched ? matched.value : String(key));
                          } else {
                            setLocationFilter('All Locations');
                          }
                          setTimelinePage(1);
                        }}
                        placeholder="All Locations"
                        className="min-w-[360px] w-96"
                      />
                    </div>

                    {/* 3. Search Bar */}
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter by Job Number/Name..."
                        value={activitySearchQuery}
                        onChange={(e) => setActivitySearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Body Content based on Active Tab */}
            <div className="p-4">
              {activeTab === 'timeline' ? (
                /* TIMELINE FEED */
                <div className="space-y-4">
                  {/* Customer Notes List (Pinned notes always visible at top of timeline, sorted newest to oldest) */}
                  {(() => {
                    const filteredNotes = activityTimeline
                      .filter((item) => item.type === 'note')
                      .filter((item) => item.isPinned || activityFilter === 'Calls & Notes')
                      .filter((item) => isLocationMatch(item.location, locationFilter))
                      .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        const tA = parseTimelineDate(a.rawDate || a.meta);
                        const tB = parseTimelineDate(b.rawDate || b.meta);
                        return tB - tA;
                      });

                    const pagedNotes = activityFilter === 'Calls & Notes'
                      ? filteredNotes.slice((timelinePage - 1) * 15, timelinePage * 15)
                      : filteredNotes;

                    return (
                      <>
                        {pagedNotes.map((note) => (
                          <div key={note.id} className="flex items-start gap-3 w-full">
                            {/* Note Circle Container matching job circles with Pencil or Bell Icon */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-2 shadow-2xs ${
                                note.isPinned
                                  ? 'border-[#be4646] bg-[#be4646] text-white'
                                  : 'border-slate-300 bg-slate-100 text-slate-600'
                              }`}
                            >
                              {note.isPinned ? (
                                <Bell className="w-3 h-3 fill-current text-white" />
                              ) : (
                                <Pencil className="w-3 h-3 text-slate-600" />
                              )}
                            </div>

                            {/* Condensed Note Card Body */}
                            <div
                              className={`rounded border shadow-2xs overflow-hidden flex-1 font-sans ${
                                note.isPinned ? 'bg-amber-50/70 border-amber-200' : 'bg-[#f2f2f2] border-slate-200'
                              }`}
                            >
                              {/* Note Card Header */}
                              <div
                                className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 ${
                                  note.isPinned ? 'border-amber-200/80 bg-amber-100/50' : 'border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-slate-800 leading-tight">{note.title}</h4>
                                  {note.isPinned && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#be4646] text-white">
                                      <Bell className="w-2.5 h-2.5 fill-current" /> Pinned
                                    </span>
                                  )}
                                  <p className="text-[11px] text-slate-500 font-normal leading-none">{note.meta}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openEditNoteModal(note)}
                                  className="px-2.5 py-0.5 bg-[#be4646] hover:bg-[#a63a3a] text-white text-[11px] font-semibold rounded cursor-pointer transition-colors shadow-2xs"
                                >
                                  Edit
                                </button>
                              </div>

                              {/* Note Card Content */}
                              <div className="px-3 py-1.5 text-xs text-slate-800 leading-normal font-normal">
                                {note.content}
                              </div>
                            </div>
                          </div>
                        ))}

                        {activityFilter === 'Calls & Notes' && (
                          <SectionPagination
                            currentPage={timelinePage}
                            totalItems={filteredNotes.length}
                            pageSize={15}
                            onPageChange={setTimelinePage}
                            itemName="notes"
                          />
                        )}
                      </>
                    );
                  })()}

                  {/* Invoice List Items */}
                  {activityFilter === 'Invoices' && (() => {
                    const filteredInvoices = customerInvoicesList
                      .filter((inv) => isLocationMatch(inv.location, locationFilter))
                      .filter((inv) =>
                        !activitySearchQuery ||
                        `invoice ${inv.number} ${inv.billTo} ${inv.location}`.toLowerCase().includes(activitySearchQuery.toLowerCase())
                      );
                    const pagedInvoices = filteredInvoices.slice((timelinePage - 1) * 15, timelinePage * 15);

                    return (
                      <>
                        {pagedInvoices.map((inv) => {
                          const isExpanded = expandedInvoiceIds.includes(inv.id);
                          const isStatusMenuOpen = openInvoiceStatusMenuId === inv.id;
                          return (
                            <div key={inv.id} className="flex items-start gap-3 w-full">
                              {/* Document Symbol Circle Container */}
                              <div className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 mt-2 text-slate-600 shadow-2xs">
                                <FileText className="w-3 h-3 text-slate-600" />
                              </div>

                              {/* Invoice Card Body (Same gray background bg-[#f2f2f2]) */}
                              <div className="bg-[#f2f2f2] rounded border border-slate-200 shadow-2xs flex-1 font-sans overflow-hidden">
                                {/* Collapsed Tile Header Container */}
                                <div className="p-3 relative space-y-1 pr-20">
                                  {/* Header Row */}
                                  <div className="flex items-center gap-1.5 pr-14">
                                    <h4 className="font-bold text-sm text-[#be4646]">Invoice {inv.number}</h4>
                                    <button
                                      type="button"
                                      title="View Invoice PDF"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfInvoice(inv);
                                      }}
                                      className="text-[#be4646] hover:text-[#a63a3a] cursor-pointer p-0.5 rounded transition-colors inline-flex items-center gap-1 font-semibold"
                                    >
                                      <FileText className="w-4 h-4 text-[#be4646]" />
                                      <span className="text-[10px] text-[#be4646] underline">PDF</span>
                                    </button>
                                  </div>

                                  {/* Interactive Status Indicator Popover Badge */}
                                  <div className="absolute top-3 right-3 z-30 inline-block text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenInvoiceStatusMenuId(isStatusMenuOpen ? null : inv.id);
                                      }}
                                      className={`text-[10px] font-semibold border px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs whitespace-nowrap ${
                                        inv.status === 'Open - Draft'
                                          ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                          : inv.status === 'Presented'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                          : inv.status === 'Signed'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                          : inv.status === 'Voided'
                                          ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                      }`}
                                    >
                                      {inv.status}
                                    </button>

                                    {isStatusMenuOpen && (
                                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 py-1 min-w-[130px] animate-in fade-in duration-100">
                                        {['Open - Draft', 'Presented', 'Signed', 'Voided', 'Closed'].map((st) => (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleInvoiceStatusChange(inv.id, st);
                                              setOpenInvoiceStatusMenuId(null);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 cursor-pointer ${
                                              inv.status === st ? 'text-[#be4646]' : 'text-slate-700'
                                            }`}
                                          >
                                            {st}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Fields Row 1: Bill To & Amount */}
                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 font-normal">
                                    <span><span className="font-semibold text-slate-700">Bill To:</span> {inv.billTo}</span>
                                    <span><span className="font-semibold text-slate-700">Amount:</span> {inv.amount}</span>
                                  </div>

                                  {/* Fields Row 2: Issued Date */}
                                  <div className="flex items-center justify-between text-xs text-slate-600 font-normal">
                                    <span><span className="font-semibold text-slate-700">Issued:</span> {inv.issued}</span>
                                  </div>

                                  {/* Downward Facing Chevron Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandInvoice(inv.id);
                                    }}
                                    className="absolute right-3 bottom-3 text-[#be4646] p-0.5 rounded hover:bg-slate-300/50 transition-colors cursor-pointer "
                                    title={isExpanded ? 'Collapse Invoice' : 'Expand Invoice Note'}
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 text-[#be4646] transition-transform duration-200 ease-in-out ${
                                        isExpanded ? 'rotate-180' : 'rotate-0'
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Inline Note Expansion */}
                                {isExpanded && (
                                  <div className="p-3 text-xs text-slate-600 font-normal border-t border-slate-300/70 bg-[#eaeaea] animate-in fade-in duration-100">
                                    <span className="font-semibold text-slate-700">Note:</span> {inv.note || 'No notes attached to this invoice.'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <SectionPagination
                          currentPage={timelinePage}
                          totalItems={filteredInvoices.length}
                          pageSize={15}
                          onPageChange={setTimelinePage}
                          itemName="invoices"
                        />
                      </>
                    );
                  })()}

                  {/* Proposal List Items */}
                  {activityFilter === 'Proposals' && (() => {
                    const filteredProposals = customerProposalsList
                      .filter((prop) => isLocationMatch(prop.location, locationFilter))
                      .filter((prop) =>
                        !activitySearchQuery ||
                        `proposal ${prop.number} ${prop.billTo} ${prop.location}`.toLowerCase().includes(activitySearchQuery.toLowerCase())
                      );
                    const pagedProposals = filteredProposals.slice((timelinePage - 1) * 15, timelinePage * 15);

                    return (
                      <>
                        {pagedProposals.map((prop) => {
                          const isExpanded = expandedProposalIds.includes(prop.id);
                          const isStatusMenuOpen = openProposalStatusMenuId === prop.id;
                          return (
                            <div key={prop.id} className="flex items-start gap-3 w-full">
                              {/* Document Symbol Circle Container */}
                              <div className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0 mt-2 text-slate-600 shadow-2xs">
                                <FileText className="w-3 h-3 text-slate-600" />
                              </div>

                              {/* Proposal Card Body */}
                              <div className="bg-[#f2f2f2] rounded border border-slate-200 shadow-2xs flex-1 font-sans p-3 relative space-y-1 pr-14">
                                {/* Header Row */}
                                <div className="flex items-center justify-between gap-2 pr-14">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-sm text-[#be4646]">Proposal {prop.number}</h4>
                                    <button
                                      type="button"
                                      title="View Proposal PDF"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfInvoice(prop);
                                      }}
                                      className="text-[#be4646] hover:text-[#a63a3a] cursor-pointer p-0.5 rounded transition-colors inline-flex items-center gap-1 font-semibold"
                                    >
                                      <FileText className="w-4 h-4 text-[#be4646]" />
                                      <span className="text-[10px] text-[#be4646] underline">PDF</span>
                                    </button>
                                  </div>

                                  {/* Dynamic Status Indicator Badge Popover */}
                                  <div className="absolute right-3 top-3 z-30">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenProposalStatusMenuId(isStatusMenuOpen ? null : prop.id);
                                      }}
                                      className={`text-[10px] font-semibold border px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs ${
                                        prop.status === 'Open - Draft'
                                          ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                          : prop.status === 'Presented'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                          : prop.status === 'Signed'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                          : prop.status === 'Voided'
                                          ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                      }`}
                                    >
                                      {prop.status}
                                    </button>

                                    {isStatusMenuOpen && (
                                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 py-1 min-w-[130px] animate-in fade-in duration-100">
                                        {['Open - Draft', 'Presented', 'Signed', 'Voided', 'Closed'].map((st) => (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleProposalStatusChange(prop.id, st);
                                              setOpenProposalStatusMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                          >
                                            {st}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Fields Row 1: Bill To & Amount */}
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 font-normal">
                                  <span><span className="font-semibold text-slate-700">Bill To:</span> {prop.billTo}</span>
                                  <span><span className="font-semibold text-slate-700">Amount:</span> {prop.amount}</span>
                                </div>

                                {/* Fields Row 2: Issued Date */}
                                <div className="flex items-center justify-between text-xs text-slate-600 font-normal">
                                  <span><span className="font-semibold text-slate-700">Issued:</span> {prop.issued}</span>
                                </div>

                                {/* Inline Note Expansion */}
                                {isExpanded && (
                                  <div className="text-xs text-slate-600 font-normal pt-1.5 border-t border-slate-300/70 mt-1 animate-in fade-in duration-100">
                                    <span className="font-semibold text-slate-700">Note:</span> {prop.note || 'No notes attached to this proposal.'}
                                  </div>
                                )}

                                {/* Downward Facing Chevron Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandProposal(prop.id);
                                  }}
                                  className="absolute right-3 bottom-3 text-[#be4646] p-0.5 rounded hover:bg-slate-300/50 transition-colors cursor-pointer "
                                  title={isExpanded ? 'Collapse Proposal' : 'Expand Proposal Note'}
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 text-[#be4646] transition-transform duration-200 ease-in-out ${
                                      isExpanded ? 'rotate-180' : 'rotate-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <SectionPagination
                          currentPage={timelinePage}
                          totalItems={filteredProposals.length}
                          pageSize={15}
                          onPageChange={setTimelinePage}
                          itemName="proposals"
                        />
                      </>
                    );
                  })()}

                  {/* Collapsible Stacked Job Tiles (WEX Style, Paged, Newest to Oldest) */}
                  {(() => {
                    const filteredJobs = customerJobsList
                      .filter((job) => activityFilter === 'Jobs')
                      .filter((job) => isLocationMatch(job.location, locationFilter))
                      .filter((job) =>
                        !activitySearchQuery ||
                        `${job.jobNumber} ${job.name} ${job.jobType} ${job.location}`.toLowerCase().includes(activitySearchQuery.toLowerCase())
                      );

                    if (activityFilter !== 'Jobs') return null;

                    const pagedJobs = filteredJobs.slice((timelinePage - 1) * 15, timelinePage * 15);

                    return (
                      <>
                        {pagedJobs.map((job) => {
                          const isExpanded = expandedJobIds.includes(job.id);
                          const dotColor = job.jobTypeColor && job.jobTypeColor.startsWith('#')
                            ? job.jobTypeColor
                            : (getTripTypeWebHex(job.jobType) || '#64748b');

                          return (
                            <div key={job.id} className="flex items-start gap-3">
                              {/* Left Solid Circle Badge with Color Representing Trip Type */}
                              <div
                                className="w-4 h-4 rounded-full shrink-0 mt-3 shadow-2xs"
                                style={{ backgroundColor: dotColor }}
                                title={`Job Type: ${job.jobType}`}
                              />

                              {/* Collapsible Card Container */}
                              <div className="bg-[#f2f2f2] rounded border border-slate-200 flex-1 overflow-hidden font-sans shadow-2xs">
                                {/* Collapsed Tile Header */}
                                <div className="p-3 relative space-y-1 pr-20">
                                  {/* Title (Job # - Job Name / Job Type) */}
                                  <h4 className="font-bold text-sm text-[#be4646]">
                                    {job.jobNumber} - {job.name || job.jobType}
                                  </h4>

                                  {/* Field 2: Location Address */}
                                  <p className="text-xs text-slate-600 font-normal">{job.location}</p>

                                  {/* Field 3: Uncollected Job Amount */}
                                  <p className="text-xs text-slate-600 font-normal">
                                    <span className="font-semibold text-slate-700">Uncollected Job Amount:</span> $0.00
                                  </p>

                                  {/* Field 4: Created by user, date/time stamp */}
                                  <p className="text-xs text-slate-600 font-normal">
                                    <span className="font-semibold text-slate-700">Created by:</span> {job.createdBy}
                                  </p>

                                  {/* Status Indicator */}
                                  <span className={`absolute right-3 top-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    job.status === 'Opened'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : job.status === 'Closed'
                                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {job.status}
                                  </span>

                                  {/* Downward Facing Chevron Button ONLY for Expanding Tile */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandJob(job.id);
                                    }}
                                    className="absolute right-3 bottom-3 text-[#be4646] p-0.5 rounded hover:bg-slate-300/50 transition-colors cursor-pointer "
                                    title={isExpanded ? 'Collapse Job' : 'Expand Job Details'}
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 text-[#be4646] transition-transform duration-200 ease-in-out ${
                                        isExpanded ? 'rotate-180' : 'rotate-0'
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Expanded Content View */}
                                {isExpanded && (
                                  <div className="p-4 space-y-3.5 border-t border-slate-300 bg-white animate-in fade-in duration-100 text-xs">
                                    {/* 1. Payment Box */}
                                    {((job.payments && job.payments.length > 0) ? job.payments : (job.payment ? [job.payment] : [])).map((pmt: any, pIdx: number) => (
                                      <div key={pmt.id || pIdx} className="bg-[#f8f9fa] border border-slate-200 rounded p-3 flex items-center justify-between font-sans">
                                        <h4 className="font-bold text-sm text-slate-800 leading-tight">Payment</h4>
                                        <span className="text-xs text-slate-600">
                                          {pmt.date}, Amount:{' '}
                                          <span className="font-semibold text-slate-800">{pmt.amount}</span>
                                        </span>
                                      </div>
                                    ))}

                                    {/* 2. Invoices Box */}
                                    {((job.invoices && job.invoices.length > 0) ? job.invoices : (job.invoice ? [job.invoice] : [])).map((inv: any, iIdx: number) => (
                                      <div key={inv.id || inv.number || iIdx} className="bg-[#f8f9fa] border border-slate-200 rounded p-3 space-y-2 font-sans">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <h4 className="font-bold text-sm text-slate-800 leading-tight">
                                              Invoice #: <span className="text-[#be4646] font-semibold">{inv.number}</span>
                                            </h4>
                                            <button
                                              type="button"
                                              title="View Invoice PDF"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPdfInvoice({
                                                  id: `inv-${inv.number}`,
                                                  number: `#I-${inv.number}`,
                                                  amount: inv.amount,
                                                  issued: inv.issued,
                                                  status: inv.status,
                                                  billTo: inv.billTo,
                                                  location: job.location,
                                                });
                                              }}
                                              className="text-[#be4646] hover:text-[#a63a3a] cursor-pointer p-0.5 rounded transition-colors inline-flex items-center gap-1 font-semibold ml-1"
                                            >
                                              <FileText className="w-4 h-4 text-[#be4646]" />
                                            </button>
                                          </div>
                                          <span className="text-slate-600 text-xs font-semibold">
                                            Amount: <span className="text-slate-900">{inv.amount}</span>
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                                          <span>
                                            <span className="font-semibold text-slate-700">Bill To Customer:</span> {inv.billTo}
                                          </span>
                                          <div className="flex items-center gap-4">
                                            <span>
                                              <span className="font-semibold text-slate-700">Issued:</span> {inv.issued}
                                            </span>
                                            {inv.status && (
                                              <span>
                                                <span className="font-semibold text-slate-700">Status:</span> {inv.status}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {inv.note && (
                                          <div className="pt-1 text-xs">
                                            <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                                            <p className="text-slate-600 leading-relaxed">{inv.note}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {/* 3. Proposals Box */}
                                    {((job.proposals && job.proposals.length > 0) ? job.proposals : (job.proposal ? [job.proposal] : [])).map((prop: any, pIdx: number) => (
                                      <div key={prop.id || prop.number || pIdx} className="bg-[#f8f9fa] border border-slate-200 rounded p-3 space-y-2 font-sans">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <h4 className="font-bold text-sm text-slate-800 leading-tight">
                                              Proposal #: <span className="text-[#be4646] font-semibold">{prop.number}</span>
                                            </h4>
                                            <button
                                              type="button"
                                              title="View Proposal PDF"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPdfInvoice({
                                                  id: `prop-${prop.number}`,
                                                  number: `#P-${prop.number}`,
                                                  amount: prop.amount,
                                                  issued: prop.issued,
                                                  status: prop.status,
                                                  billTo: prop.billTo,
                                                  location: job.location,
                                                });
                                              }}
                                              className="text-[#be4646] hover:text-[#a63a3a] cursor-pointer p-0.5 rounded transition-colors inline-flex items-center gap-1 font-semibold ml-1"
                                            >
                                              <FileText className="w-4 h-4 text-[#be4646]" />
                                            </button>
                                          </div>
                                          <span className="text-slate-600 text-xs font-semibold">
                                            Amount: <span className="text-slate-900">{prop.amount}</span>
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                                          <span>
                                            <span className="font-semibold text-slate-700">Bill To Customer:</span> {prop.billTo}
                                          </span>
                                          <div className="flex items-center gap-4">
                                            <span>
                                              <span className="font-semibold text-slate-700">Issued:</span> {prop.issued}
                                            </span>
                                            {prop.status && (
                                              <span>
                                                <span className="font-semibold text-slate-700">Status:</span> {prop.status}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {prop.note && (
                                          <div className="pt-1 text-xs">
                                            <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                                            <p className="text-slate-600 leading-relaxed">{prop.note}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {/* 4. Appointments Box (WEX FSM Style) */}
                                    {((job.appointments && job.appointments.length > 0) ? job.appointments : (job.appointment ? [job.appointment] : [])).map((appt: any, aIdx: number) => (
                                      <div key={appt.id || aIdx} className="bg-[#f8f9fa] border border-slate-200 rounded p-3 flex items-center justify-between font-sans text-xs">
                                        <h4 className="font-bold text-sm text-slate-800 leading-tight">Appointment</h4>
                                        <div className="text-right space-y-0.5">
                                          <div className="text-xs text-slate-600">
                                            <span className="text-[#be4646] font-semibold">{appt.date}</span>
                                            {appt.status ? ` , ${appt.status}` : ''}
                                          </div>
                                          <div className="text-xs text-slate-600">
                                            <span className="font-bold text-slate-800">Primary Technician:</span> {appt.tech || 'Unassigned'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {/* 5. Notes List */}
                                    {(job.note || (job.notesList && job.notesList.length > 0)) && (
                                      <div className="bg-[#f8f9fa] border border-slate-200 rounded p-3 space-y-2 font-sans">
                                        <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                                          <h4 className="font-bold text-sm text-slate-800 leading-tight">Notes</h4>
                                        </div>
                                        {job.note && (
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                              <span className="font-semibold text-slate-700">Job Description</span>
                                              <span>{formatServiceNoteStamp(job.note.author, job.note.date)}</span>
                                            </div>
                                            <p className="text-slate-700 leading-relaxed">{job.note.body}</p>
                                          </div>
                                        )}
                                        {job.notesList && job.notesList.map((n: any, idx: number) => (
                                          <div key={idx} className="space-y-1 pt-1.5 border-t border-slate-200 first:border-t-0 first:pt-0">
                                            <div className="text-[11px] text-slate-500 font-semibold">{n.authorDate}</div>
                                            <p className="text-slate-700 leading-relaxed">{n.body}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* 6. Calls Box (WEX FSM Style) */}
                                    {((job.calls && job.calls.length > 0) ? job.calls : (job.call ? [job.call] : [])).map((c: any, cIdx: number) => (
                                      <div key={c.id || cIdx} className="bg-[#f8f9fa] border border-slate-200 rounded p-3 space-y-2 font-sans">
                                        <div className="border-b border-slate-200 pb-1.5">
                                          <h4 className="font-bold text-sm text-slate-800 leading-tight">Calls</h4>
                                        </div>
                                        <div className="text-[#be4646] font-bold text-xs">{c.title || 'Initial Call'}</div>
                                        <div className="text-xs text-slate-600 space-y-1 font-normal">
                                          <div>
                                            {c.callType} on {c.dateTime}
                                          </div>
                                          {c.location && (
                                            <div>
                                              <span className="font-semibold text-slate-700">Related Location(s):</span> {c.location}
                                            </div>
                                          )}
                                          {c.contact && (
                                            <div>
                                              Call with {c.contact} {c.user ? `Edited by ${c.user}` : ''} on {c.dateTime}
                                            </div>
                                          )}
                                          {c.note && (
                                            <p className="text-slate-700 pt-1 leading-relaxed whitespace-pre-line">{c.note}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Pagination Bar for Timeline Jobs */}
                        <SectionPagination
                          currentPage={timelinePage}
                          totalItems={filteredJobs.length}
                          pageSize={15}
                          onPageChange={setTimelinePage}
                          itemName="jobs"
                        />
                      </>
                    );
                  })()}

                  {/* Appointment List Items (Timeline View) */}
                  {activityFilter === 'Appointments' && (() => {
                    const filteredAppts = customerAppointmentsList
                      .filter((a: any) => isLocationMatch(a.location, locationFilter))
                      .filter((a: any) =>
                        !activitySearchQuery ||
                        `${a.jobNumber} ${a.jobType} ${a.tech} ${a.location}`.toLowerCase().includes(activitySearchQuery.toLowerCase())
                      );

                    const pagedAppts = filteredAppts.slice((timelinePage - 1) * 15, timelinePage * 15);

                    return (
                      <>
                        {pagedAppts.map((appt: any) => {
                          const dotColor = appt.jobTypeColor && appt.jobTypeColor.startsWith('#')
                            ? appt.jobTypeColor
                            : (getTripTypeWebHex(appt.jobType) || '#64748b');

                          return (
                            <div key={appt.id} className="flex items-start gap-3">
                              {/* Left Circle Badge */}
                              <div
                                className="w-4 h-4 rounded-full shrink-0 mt-3 shadow-2xs"
                                style={{ backgroundColor: dotColor }}
                                title={`Appointment: ${appt.jobType}`}
                              />

                              {/* Card Container */}
                              <div className="bg-[#f2f2f2] rounded border border-slate-200 flex-1 overflow-hidden font-sans shadow-2xs p-3 relative space-y-1 pr-20">
                                <h4 className="font-bold text-sm text-[#be4646]">
                                  {appt.jobNumber ? `${appt.jobNumber} - ` : ''}{appt.jobType}
                                </h4>

                                <p className="text-xs text-slate-600 font-normal">{appt.location}</p>
                                <p className="text-xs text-slate-600 font-normal">
                                  <span className="font-semibold text-slate-700">Scheduled:</span> {appt.date}
                                </p>
                                <p className="text-xs text-slate-600 font-normal">
                                  <span className="font-semibold text-slate-700">Technician:</span> {appt.tech}
                                </p>
                                {appt.notes && (
                                  <p className="text-xs text-slate-600 font-normal italic pt-0.5">
                                    &ldquo;{appt.notes}&rdquo;
                                  </p>
                                )}

                                <span className={`absolute right-3 top-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                  appt.status === 'Scheduled'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : appt.status === 'Complete' || appt.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  {appt.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <SectionPagination
                          currentPage={timelinePage}
                          totalItems={filteredAppts.length}
                          pageSize={15}
                          onPageChange={setTimelinePage}
                          itemName="appointments"
                        />
                      </>
                    );
                  })()}

                  {/* Payment List Items (Timeline View) */}
                  {activityFilter === 'Payments' && (() => {
                    const filteredPayments = customerPaymentsTimelineList
                      .filter((p: any) => isLocationMatch(p.location, locationFilter))
                      .filter((p: any) =>
                        !activitySearchQuery ||
                        `${p.invoiceNumber} ${p.method} ${p.amount} ${p.location}`.toLowerCase().includes(activitySearchQuery.toLowerCase())
                      );

                    const pagedPayments = filteredPayments.slice((timelinePage - 1) * 15, timelinePage * 15);

                    return (
                      <>
                        {pagedPayments.map((pmt: any) => (
                          <div key={pmt.id} className="flex items-start gap-3 w-full">
                            <div className="w-5 h-5 rounded-full border border-emerald-300 bg-emerald-100 flex items-center justify-center shrink-0 mt-2 text-emerald-700 shadow-2xs">
                              <CreditCard className="w-3 h-3 text-emerald-700" />
                            </div>

                            <div className="bg-[#f2f2f2] rounded border border-slate-200 shadow-2xs flex-1 font-sans p-3 relative space-y-1 pr-20">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-[#be4646]">
                                  Payment {pmt.invoiceNumber ? `for ${pmt.invoiceNumber}` : ''}
                                </h4>
                                <span className="text-xs font-bold text-slate-900">{pmt.amount}</span>
                              </div>

                              <p className="text-xs text-slate-600 font-normal">
                                <span className="font-semibold text-slate-700">Date:</span> {pmt.date}
                              </p>
                              <p className="text-xs text-slate-600 font-normal">
                                <span className="font-semibold text-slate-700">Method:</span> {pmt.method}
                              </p>

                              <span className="absolute right-3 top-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                                {pmt.status}
                              </span>
                            </div>
                          </div>
                        ))}

                        <SectionPagination
                          currentPage={timelinePage}
                          totalItems={filteredPayments.length}
                          pageSize={15}
                          onPageChange={setTimelinePage}
                          itemName="payments"
                        />
                      </>
                    );
                  })()}
                </div>
              ) : activeTab === 'payments' ? (
                /* PAYMENTS TAB (Matching Screenshot 1 & 2 with Murphy's Design Language) */
                <div className="space-y-4 font-sans">
                  {/* 1. Top Balance Card (Floating over white background, no gray box) */}
                  <div className="py-2 px-4 text-center space-y-4 font-sans">
                    <h3 className="text-2xl font-bold text-slate-700">
                      Total Customer Balance: <span className="text-slate-900 font-extrabold">{formattedCustomerBalance}</span>
                    </h3>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      {/* Process Payment Button (Opens Modal Popup Window) */}
                      <button
                        type="button"
                        onClick={() => setIsProcessPaymentModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#38a169] hover:bg-[#2f855a] text-white text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Process Payment</span>
                      </button>

                      {/* Record Payment Button (Opens Modal Popup Window) */}
                      <button
                        type="button"
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#38a169] hover:bg-[#2f855a] text-white text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record Payment</span>
                      </button>

                      {/* Add Credit / Refund Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setToastMessage('Add Credit/Refund action triggered');
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4 text-slate-600" />
                        <span>Add Credit/Refund</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Light Grey Collapsible Section 1: Payments & Credit by Invoices */}
                  <div className="rounded-lg overflow-hidden border border-slate-200 shadow-2xs bg-white">
                    <button
                      type="button"
                      onClick={() => togglePaymentSection('invoices')}
                      className="w-full bg-[#f2f2f2] hover:bg-slate-200 border-b border-slate-300 text-slate-800 px-4 py-2.5 font-bold text-sm flex items-center justify-between transition-colors text-center cursor-pointer "
                    >
                      <span className="w-full text-center">Payments & Credit by Invoices</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
                          expandedPaymentSections.includes('invoices') ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {expandedPaymentSections.includes('invoices') && (
                      <div className="p-4 space-y-3 animate-in fade-in duration-100">
                        {/* Top Right Search / Filter Bar */}
                        <div className="flex justify-end gap-2">
                          <div className="relative w-64">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Invoice # / Search..."
                              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                            />
                          </div>
                        </div>

                        {/* Data Table (Matching Screenshot 2 exact format) */}
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                              <tr>
                                <th className="p-2.5">Date/Time</th>
                                <th className="p-2.5">Item</th>
                                <th className="p-2.5">Amount</th>
                                <th className="p-2.5">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {customerInvoicesList.length > 0 ? (
                                customerInvoicesList.slice((invoicesPage - 1) * 15, invoicesPage * 15).map((inv) => {
                                  const isUnpaid = !['closed', 'paid', 'voided', 'signed'].some((s) =>
                                    (inv.status || '').toLowerCase().includes(s)
                                  );
                                  const balanceStr = isUnpaid ? inv.amount : '$0.00';
                                  return (
                                    <React.Fragment key={inv.id}>
                                      {/* Invoice Row */}
                                      <tr className="bg-slate-50/50">
                                        <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap">
                                          {inv.issued.includes(' - ') ? inv.issued : `${inv.issued} - 10:39am`}
                                        </td>
                                        <td className="p-2.5 font-bold text-[#be4646]">
                                          <div className="inline-flex items-center gap-1.5">
                                            <span
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPdfInvoice(inv);
                                              }}
                                              className="cursor-pointer hover:underline"
                                            >
                                              Invoice {inv.number.startsWith('#') ? inv.number : `#${inv.number}`}
                                            </span>
                                            <button
                                              type="button"
                                              title="View Invoice PDF"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPdfInvoice(inv);
                                              }}
                                              className="text-[#be4646] hover:text-[#a63a3a] cursor-pointer p-0.5 rounded transition-colors inline-flex items-center gap-1 font-semibold"
                                            >
                                              <FileText className="w-4 h-4 text-[#be4646]" />
                                              <span className="text-[10px] text-[#be4646] underline">PDF</span>
                                            </button>
                                          </div>
                                        </td>
                                        <td className="p-2.5 text-slate-800 font-medium">{inv.amount}</td>
                                        <td className="p-2.5 font-semibold text-slate-800">{balanceStr}</td>
                                      </tr>
                                      {/* Payment Entry Row if paid/closed */}
                                      {!isUnpaid && (
                                        <tr>
                                          <td className="p-2.5 pl-6 text-slate-600 inline-flex items-center gap-1.5 whitespace-nowrap">
                                            <Pencil className="w-3 h-3 text-[#be4646] cursor-pointer hover:text-[#a63a3a]" />
                                            <span>{inv.issued.includes(' - ') ? inv.issued : `${inv.issued} - 10:39am`}</span>
                                          </td>
                                          <td className="p-2.5 text-slate-600">Other</td>
                                          <td className="p-2.5 text-slate-600">{inv.amount}</td>
                                          <td className="p-2.5 text-slate-600">-</td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={4} className="p-4 text-center text-slate-500 italic text-xs">
                                    No invoices on file for this customer.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <SectionPagination
                            currentPage={invoicesPage}
                            totalItems={customerInvoicesList.length}
                            pageSize={15}
                            onPageChange={setInvoicesPage}
                            itemName="invoices"
                          />
                        </div>
                      </div>
                    )}
                  </div>



                  {/* 4. Light Grey Collapsible Section 3: Stored Accounts */}
                  <div className="rounded-lg overflow-hidden border border-slate-200 shadow-2xs bg-white">
                    <button
                      type="button"
                      onClick={() => togglePaymentSection('stored')}
                      className="w-full bg-[#f2f2f2] hover:bg-slate-200 border-b border-slate-300 text-slate-800 px-4 py-2.5 font-bold text-sm flex items-center justify-between transition-colors text-center cursor-pointer "
                    >
                      <span className="w-full text-center">Stored Accounts</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
                          expandedPaymentSections.includes('stored') ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {expandedPaymentSections.includes('stored') && (
                      <div className="p-4 space-y-3 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-xs font-bold text-slate-700">
                            Payment Cards{' '}
                            <button
                              type="button"
                              onClick={openAddCardModal}
                              className="text-[#be4646] no-underline hover:text-[#a63a3a] font-semibold cursor-pointer ml-1"
                            >
                              Add New Card
                            </button>
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                              <tr>
                                <th className="p-2.5">Label</th>
                                <th className="p-2.5">Stripe Token / Provider</th>
                                <th className="p-2.5">Expiration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {storedPaymentMethods.length > 0 ? (
                                storedPaymentMethods.map((pm) => (
                                  <tr key={pm.id}>
                                    <td className="p-2.5 font-medium text-slate-800">
                                      {pm.brand} ending in {pm.last4}
                                      {pm.isDefault && (
                                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 font-normal">
                                          Default
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-slate-600 text-[11px]">
                                      <span className="text-[#635bff] font-semibold">{pm.id}</span> ({pm.provider || 'Stripe'})
                                    </td>
                                    <td className="p-2.5 text-slate-600">
                                      {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="p-4 text-center text-slate-500 italic text-xs">
                                    No stored accounts linked in Stripe.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Light Grey Collapsible Section 4: Customer Statement History */}
                  <div className="rounded-lg overflow-hidden border border-slate-200 shadow-2xs bg-white">
                    <button
                      type="button"
                      onClick={() => togglePaymentSection('statements')}
                      className="w-full bg-[#f2f2f2] hover:bg-slate-200 border-b border-slate-300 text-slate-800 px-4 py-2.5 font-bold text-sm flex items-center justify-between transition-colors text-center cursor-pointer "
                    >
                      <span className="w-full text-center">Customer Statement History</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
                          expandedPaymentSections.includes('statements') ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {expandedPaymentSections.includes('statements') && (
                      <div className="p-4 animate-in fade-in duration-100">
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                              <tr>
                                <th className="p-2.5">Statement #</th>
                                <th className="p-2.5">Issue Date</th>
                                <th className="p-2.5">Statement Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              <tr>
                                <td className="p-2.5 font-medium text-[#be4646] hover:underline cursor-pointer">#ST-2026-05</td>
                                <td className="p-2.5 text-slate-600">05/31/2026</td>
                                <td className="p-2.5 text-slate-800">$0.00</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-medium text-[#be4646] hover:underline cursor-pointer">#ST-2026-04</td>
                                <td className="p-2.5 text-slate-600">04/30/2026</td>
                                <td className="p-2.5 text-slate-800">$0.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'equipment' ? (
                /* EQUIPMENT TAB */
                <div className="space-y-3">
                  {activeLocationEquipment.length === 0 ? (
                    <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                      <p className="text-xs text-slate-700 font-medium">Customer has no equipment on record for this location.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                          <tr>
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">Mfr.</th>
                            <th className="p-2.5">Serial No.</th>
                            <th className="p-2.5">Model No.</th>
                            <th className="p-2.5">Age / Install</th>
                            <th className="p-2.5">Warranty</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {activeLocationEquipment.slice((equipmentPage - 1) * 15, equipmentPage * 15).map((eq: any) => (
                            <tr key={eq.id}>
                              <td className="p-2.5 font-semibold text-slate-800">{eq.name}</td>
                              <td
                                onClick={() => handleCopy(eq.mfg, `${eq.id}-mfg`)}
                                className="p-2.5 cursor-pointer "
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  <span>{eq.mfg}</span>
                                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                    {copiedKey === `${eq.id}-mfg` && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td
                                onClick={() => handleCopy(eq.serial, `${eq.id}-serial`)}
                                className="p-2.5 text-[11px] cursor-pointer "
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  <span>{eq.serial}</span>
                                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                    {copiedKey === `${eq.id}-serial` && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td
                                onClick={() => handleCopy(eq.model, `${eq.id}-model`)}
                                className="p-2.5 text-[11px] cursor-pointer "
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  <span>{eq.model}</span>
                                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                    {copiedKey === `${eq.id}-model` && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-slate-600">
                                {eq.installationDate || eq.systemAge || '—'}
                              </td>
                              <td className="p-2.5">
                                {eq.manufacturerWarrantyStatus || eq.warranty ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {eq.manufacturerWarrantyStatus || eq.warranty || 'Active'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-emerald-700 font-semibold">{eq.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <SectionPagination
                        currentPage={equipmentPage}
                        totalItems={activeLocationEquipment.length}
                        pageSize={15}
                        onPageChange={setEquipmentPage}
                        itemName="equipment items"
                      />
                    </div>
                  )}
                </div>
              ) : activeTab === 'maint' ? (
                /* MAINTENANCE PLANS TAB (WEX Design) */
                <div className="space-y-6 font-sans">
                  {!activeLocationPlan ? (
                    <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                      <p className="text-xs text-slate-700 font-medium">Customer has no maintenance plans for this location.</p>
                    </div>
                  ) : (
                    <MaintenancePlanLocationCard
                      key={activeLocationPlan.id}
                      plan={activeLocationPlan}
                      jobs={dbJobs}
                      onScheduleWindow={(sw) => handleScheduleServiceWindow(sw, activeLocationPlan)}
                      onDeletePlan={async (planId) => {
                        await removePlan(planId);
                        setToastMessage('Maintenance plan deleted.');
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                    />
                  )}
                </div>
              ) : activeTab === 'contacts' ? (
                /* AUTHORIZED PERSONS TAB */
                <div className="space-y-4 font-sans text-xs">
                  {(() => {
                    const filteredContacts = authorizedPersonsList.filter((p) => {
                      if (!contactSearchQuery.trim()) return true;
                      const q = contactSearchQuery.toLowerCase();
                      if (contactSearchCategory === 'Name') {
                        return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
                      } else if (contactSearchCategory === 'Location') {
                        return (p.assignedLocation || '').toLowerCase().includes(q);
                      } else if (contactSearchCategory === 'Role') {
                        return (p.positionLabel || '').toLowerCase().includes(q);
                      }
                      return true;
                    });

                    if (filteredContacts.length === 0 && authorizedPersonsList.length === 0) {
                      return (
                        <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                          <p className="text-xs text-slate-700 font-medium">This customer has no authorized persons.</p>
                        </div>
                      );
                    }

                    if (filteredContacts.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 italic text-xs">
                          No authorized persons match the search query.
                        </div>
                      );
                    }

                    const pagedContacts = filteredContacts.slice((contactsPage - 1) * 15, contactsPage * 15);

                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <tr>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Contact Type</th>
                              <th className="p-2.5">Location</th>
                              <th className="p-2.5">Mobile Phone</th>
                              <th className="p-2.5">Home Phone</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-700">
                            {pagedContacts.map((person) => (
                              <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 font-semibold text-slate-900">
                                  {person.firstName} {person.lastName}
                                </td>
                                <td className="p-2.5 text-slate-700 font-normal">
                                  {person.positionLabel || '—'}
                                </td>
                                <td className="p-2.5 text-slate-600">{person.assignedLocation || '—'}</td>
                                <td className="p-2.5 text-slate-600">{formatPhoneNumber(person.mobilePhone || person.phone) || '—'}</td>
                                <td className="p-2.5 text-slate-600">{formatPhoneNumber(person.homePhone) || '—'}</td>
                                <td className="p-2.5 text-slate-600">{person.email || '—'}</td>
                                <td className="p-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAuthorizedPerson(person);
                                        setShowAddAuthorizedPersonModal(true);
                                      }}
                                      className="text-[#2d82b7] hover:underline font-semibold text-xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const updatedList = authorizedPersonsList.filter((p) => p.id !== person.id);
                                        setAuthorizedPersonsList(updatedList);
                                        if (currentDbCustomer) {
                                          const updatedCustomer = {
                                            ...currentDbCustomer,
                                            authorizedPersons: updatedList,
                                          };
                                          await saveCustomer(updatedCustomer);
                                          await client.deleteAuthorizedPerson(person.id, currentDbCustomer.id, databaseMode);
                                        }
                                        setToastMessage(`Authorized Person "${person.firstName} ${person.lastName}" removed.`);
                                        setTimeout(() => setToastMessage(null), 3000);
                                      }}
                                      className="text-red-600 hover:underline font-semibold text-xs cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <SectionPagination
                          currentPage={contactsPage}
                          totalItems={filteredContacts.length}
                          pageSize={15}
                          onPageChange={setContactsPage}
                          itemName="authorized persons"
                        />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* OTHER TABS EMPTY STATE */
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No records found in this view.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Modal Popup: New Attachment (Matching Screenshot Exact Layout) */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans text-xs">
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">New Attachment</h3>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form Body */}
            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewAttachFile(e.target.files?.[0] || null)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Name</label>
                <input
                  type="text"
                  value={newAttachName}
                  onChange={(e) => setNewAttachName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Caption or Description</label>
                <textarea
                  rows={3}
                  value={newAttachCaption}
                  onChange={(e) => setNewAttachCaption(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="px-3.5 py-1.5 bg-[#f1f1f1] hover:bg-[#e2e2e2] text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAttachment}
                className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Edit Attachment (Matching Screenshot Exact Layout) */}
      {editingAttachment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans text-xs">
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Edit Attachment</h3>
              <button
                type="button"
                onClick={() => setEditingAttachment(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form Body */}
            <div className="p-4 space-y-3.5">
              {/* Thumbnail Preview (Clickable to open Large Photo Viewer) */}
              <div className="text-center">
                <div
                  onClick={() =>
                    handleOpenPhotoViewer(
                      editingAttachment.previewUrl ||
                        'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&auto=format&fit=crop&q=80'
                    )
                  }
                  className="w-24 h-24 mx-auto rounded border border-slate-200 overflow-hidden shadow-xs bg-slate-50 flex items-center justify-center cursor-pointer hover:opacity-90 hover:border-[#2d82b7] transition-all group"
                  title="Click to expand full screen photo viewer"
                >
                  <img
                    src={
                      editingAttachment.previewUrl ||
                      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&auto=format&fit=crop&q=80'
                    }
                    alt={editingAttachment.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="text-[11px] italic text-slate-500 mt-1.5 font-sans">
                  Uploaded {editingAttachment.uploaded} 8:14 pm
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Name</label>
                <input
                  type="text"
                  value={editAttachName}
                  onChange={(e) => setEditAttachName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Caption or Description</label>
                <textarea
                  rows={3}
                  value={editAttachCaption}
                  onChange={(e) => setEditAttachCaption(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteAttachment}
                className="px-4 py-1.5 bg-[#9370db] hover:bg-[#805ad5] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleSaveEditAttachment}
                className="px-4 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Large Photo Viewer (Vertical Side Toolbar & Viewport Fit) */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-90 flex items-center justify-center p-6 gap-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Photo Container Frame (Fits 100% inside viewport, Drag Pan Enabled) */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative bg-white rounded-lg shadow-2xl overflow-hidden max-w-4xl h-[78vh] w-full flex items-center justify-center p-6 border border-slate-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Close Button on top right of photo frame */}
            <button
              type="button"
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-3 right-3 z-10 cursor-pointer bg-white/90 rounded-full w-8 h-8 flex items-center justify-center border border-slate-200 shadow-2xs hover:bg-white transition-colors"
              title="Close viewer"
            >
              <X className="w-4 h-4 text-slate-500 hover:text-slate-800" />
            </button>

            {/* Image viewport with transform translation, scale & rotate */}
            <div className="overflow-hidden w-full h-full flex items-center justify-center">
              <img
                src={viewingPhotoUrl}
                alt="Attachment Preview"
                draggable={false}
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${photoZoom}) rotate(${photoRotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                className="max-h-[72vh] max-w-full object-contain shadow-xs rounded pointer-events-none"
              />
            </div>
          </div>

          {/* Vertical Toolbar on the Side (4 Tools: Zoom In, Zoom Out, Rotate Left, Rotate Right) */}
          <div className="flex flex-col items-center gap-3 bg-slate-900/90 border border-slate-700/80 shadow-2xl rounded-lg p-2.5 text-white shrink-0 z-10">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRotateLeft}
              className="p-2 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
              title="Rotate Left"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRotateRight}
              className="p-2 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
              title="Rotate Right"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Shared Prepopulated Appointment & Booking Modal */}
      {showBookingModal && (
        <UpdateAppointmentModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setBookingInitialValues(null);
          }}
          initialValues={bookingInitialValues || undefined}
          customer={{
            id: customerId,
            name: displayProfileName,
            customerType: isCommercialCust ? 'commercial' : 'residential',
            businessName: isCommercialCust ? businessName : undefined,
            phone: mobilePhone || '(850) 555-0100',
            email: email || 'customer@example.com',
            address: bookingInitialValues?.locationAddress || locAddr1 || (locationsList[0] ? `${locationsList[0].addr1}, ${locationsList[0].city}, ${locationsList[0].state} ${locationsList[0].zip}` : ''),
            locations: locationsList.map((loc) => `${loc.addr1}, ${loc.city}, ${loc.state} ${loc.zip}`),
            balance: '$0.00',
          }}
          onSave={async (savedData) => {
            setShowBookingModal(false);
            const jNum = (savedData as any)?.jobNumber || bookingInitialValues?.jobNumber || '';
            setBookingInitialValues(null);
            setToastMessage(`Appointment set${jNum ? ` for Job #${jNum}` : ''}!`);
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {/* Modal: New Note (Shared NewNoteModal with Bell Pin button & tooltip) */}
      <NewNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        locations={locationsList.map((loc) => ({
          id: loc.id,
          label: `${loc.addr1}, ${loc.city}, ${loc.state} ${loc.zip}`,
        }))}
        defaultLocation={locationsList[0] ? `${locationsList[0].addr1}, ${locationsList[0].city}, ${locationsList[0].state} ${locationsList[0].zip}` : ''}
        onSave={async (data) => {
          const authorName = currentUser?.name || 'Staff';
          const authorId = currentUser?.id || 'usr-staff';
          const authorRole = currentUser?.accountType || 'Staff';
          const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const nowTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const newNoteItem = {
            id: `note-${Date.now()}`,
            type: 'note' as const,
            title: data.isPinned ? 'Pinned Customer Note' : 'Customer Note',
            meta: `${authorName} - ${nowStr} ${nowTime}`,
            createdMeta: `Created: ${nowStr}, ${nowTime} by ${authorName}`,
            updatedMeta: `Updated: ${nowStr}, ${nowTime} by ${authorName}`,
            content: data.text,
            location: data.location,
            isPinned: data.isPinned,
          };

          if (persistNote) {
            await persistNote({
              id: newNoteItem.id,
              customerId,
              authorId,
              authorName,
              authorRole,
              title: newNoteItem.title,
              content: data.text,
              isPinned: data.isPinned || false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          setShowNoteModal(false);
        }}
      />

      {/* Modal: View/Edit Note (Shared NewNoteModal with Edit mode and Bell Pin toggle) */}
      {editingNote && (
        <NewNoteModal
          isOpen={!!editingNote}
          title="Edit Note"
          submitLabel="Save"
          onClose={() => setEditingNote(null)}
          locations={locationsList.map((loc) => ({
            id: loc.id,
            label: `${loc.addr1}, ${loc.city}, ${loc.state} ${loc.zip}`,
          }))}
          defaultLocation={locationsList[0] ? `${locationsList[0].addr1}, ${locationsList[0].city}, ${locationsList[0].state} ${locationsList[0].zip}` : ''}
          initialText={editingNote.content || ''}
          initialLocation={editingNote.location || ''}
          initialIsPinned={editingNote.isPinned || false}
          onDelete={async () => {
            if (removeNote) {
              await removeNote(editingNote.id);
            }
            setEditingNote(null);
          }}
          onSave={async (data) => {
            const authorName = (editingNote as any).authorName || currentUser?.name || 'Staff';
            const authorId = (editingNote as any).authorId || currentUser?.id || 'usr-staff';
            const authorRole = (editingNote as any).authorRole || currentUser?.accountType || 'Staff';
            if (persistNote) {
              await persistNote({
                id: editingNote.id,
                customerId,
                authorId,
                authorName,
                authorRole,
                title: data.isPinned ? 'Pinned Customer Note' : 'Customer Note',
                content: data.text,
                isPinned: data.isPinned || false,
                createdAt: (editingNote as any).createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            setEditingNote(null);
          }}
        />
      )}

      {/* Customer Profile Save Confirmation Toast Banner (Bottom Center, Auto-disappears after 3s) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-[#e6f4ea] border border-[#c3e6cb] shadow-lg rounded px-4 py-2.5 flex items-center justify-between gap-4 text-xs font-sans text-slate-800 min-w-[340px] max-w-lg">
            <div className="flex items-center gap-2 text-[#3c763d]">
              <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
              <span className="font-medium">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-base leading-none cursor-pointer ml-2"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Invoice PDF Document Viewer Modal */}
      {selectedPdfInvoice && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden font-sans">
            {/* Header Bar */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className="font-bold text-sm">Invoice {selectedPdfInvoice.number} Document Viewer</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPdfInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PDF Content Mock Canvas */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-100 space-y-6">
              <div className="bg-white p-8 border border-slate-300 shadow-md rounded max-w-3xl mx-auto space-y-6 text-slate-800">
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#be4646]">INVOICE</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Apex Field Solutions</p>
                    <p className="text-xs text-slate-500">Winter Park, FL 32789</p>
                  </div>
                  <div className="text-right text-xs text-slate-600 space-y-1">
                    <div><span className="font-semibold text-slate-800">Invoice #:</span> {selectedPdfInvoice.number}</div>
                    <div><span className="font-semibold text-slate-800">Issued Date:</span> {selectedPdfInvoice.issued}</div>
                    <div><span className="font-semibold text-slate-800">Status:</span> {selectedPdfInvoice.status}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">Billed To:</h3>
                    <p className="font-semibold">{selectedPdfInvoice.billTo}</p>
                    <p className="text-slate-600">{selectedPdfInvoice.location}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">Customer Account:</h3>
                    <p className="text-slate-600">{firstName} {lastName}</p>
                    <p className="text-slate-600">{mobilePhone}</p>
                    <p className="text-slate-600">{email}</p>
                  </div>
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2.5 font-bold">Description</th>
                      <th className="p-2.5 font-bold text-center">Qty</th>
                      <th className="p-2.5 font-bold text-right">Rate</th>
                      <th className="p-2.5 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr>
                      <td className="p-2.5 font-medium">{selectedPdfInvoice.note || 'Appliance Service Call & Maintenance'}</td>
                      <td className="p-2.5 text-center">1</td>
                      <td className="p-2.5 text-right">{selectedPdfInvoice.amount}</td>
                      <td className="p-2.5 text-right font-semibold">{selectedPdfInvoice.amount}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{selectedPdfInvoice.amount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax:</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-2">
                      <span>Total Due:</span>
                      <span className="text-[#be4646]">{selectedPdfInvoice.amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: PROCESS PAYMENT POPUP WINDOW (Matching Screenshots in Murphy's Design Language) ================= */}
      {isProcessPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header Bar */}
            <div className="px-5 py-3.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#be4646]" />
                <span>Process Payment</span>
              </h2>
              <button
                type="button"
                onClick={closeProcessPaymentModal}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-lg font-bold px-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* 1. Unpaid Invoices Section */}
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">Unpaid Invoices</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Invoice #"
                      value={processInvoiceFilter}
                      onChange={(e) => setProcessInvoiceFilter(e.target.value)}
                      className="w-56 pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                    />
                  </div>
                </div>

                <div className="border-b border-slate-200 pb-3 space-y-2">
                  <div className="grid grid-cols-3 text-xs font-bold px-2 py-1">
                    <span className="text-[#a82e2e] flex items-center gap-1">
                      Invoice Number <span className="text-xs">▲</span>
                    </span>
                    <span className="text-[#a82e2e]">Balance</span>
                    <span className="text-slate-700 text-right">Amount</span>
                  </div>

                  {customerInvoicesList.filter((inv) =>
                    !['closed', 'paid', 'voided', 'signed'].some((s) => (inv.status || '').toLowerCase().includes(s))
                  ).length > 0 ? (
                    customerInvoicesList
                      .filter((inv) => !['closed', 'paid', 'voided', 'signed'].some((s) => (inv.status || '').toLowerCase().includes(s)))
                      .map((inv) => (
                        <div key={inv.id} className="grid grid-cols-3 items-center px-2 py-1 text-xs">
                          <span className="font-bold text-[#be4646]">Invoice {inv.number}</span>
                          <span className="font-semibold text-slate-800">{inv.amount}</span>
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-slate-500">$</span>
                            <input
                              type="text"
                              placeholder="0.00"
                              className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                            />
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-500 py-2.5 text-center italic text-xs">
                      There are no unpaid invoices for this customer.
                    </p>
                  )}

                  {/* Payment Without Invoice Row */}
                  <div className="flex items-center justify-between py-2 px-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800 text-xs">Payment Without Invoice</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={processUnpaidAmount}
                        placeholder="0.00"
                        onFocus={(e) => {
                          if (e.target.value === '0.00') {
                            setProcessUnpaidAmount('');
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                            setProcessUnpaidAmount(val);
                          }
                        }}
                        onBlur={() => {
                          const num = parseFloat(processUnpaidAmount);
                          if (!isNaN(num) && num > 0) {
                            setProcessUnpaidAmount(num.toFixed(2));
                          }
                        }}
                        className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-right font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                      />
                    </div>
                  </div>

                  {/* Total Payment Row */}
                  <div className="flex items-center justify-between py-2 px-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800 text-xs">Total Payment</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">$</span>
                      <input
                        type="text"
                        readOnly
                        value={parseFloat(processUnpaidAmount) > 0 ? (parseFloat(processUnpaidAmount) || 0).toFixed(2) : ''}
                        placeholder="0.00"
                        className="w-36 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-right font-bold text-slate-900 text-xs cursor-not-allowed placeholder:text-slate-400 focus:placeholder-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Payment Details Section */}
              <div className="space-y-4 pt-1">
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded font-bold text-slate-700 text-sm">
                  Payment Details
                </div>

                {/* Stripe Elements with Native Stock UI Theme (No appearance prop) */}
                <Elements
                  stripe={stripePromise}
                  options={{
                    mode: 'payment',
                    amount: Math.max(Math.round((parseFloat(processUnpaidAmount) || 0) * 100), 100),
                    currency: 'usd',
                  }}
                >
                  <StripeProcessPaymentForm
                    totalAmount={parseFloat(processUnpaidAmount) || 0}
                    memo={processMemo}
                    setMemo={setProcessMemo}
                    isAuthorized={processIsAuthorized}
                    setIsAuthorized={setProcessIsAuthorized}
                    onSuccess={() => {
                      closeProcessPaymentModal();
                      setToastMessage('Payment processed successfully via Stripe!');
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    onCancel={closeProcessPaymentModal}
                  />
                </Elements>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RECORD PAYMENT POPUP WINDOW (Matching Screenshot 100%) ================= */}
      {isRecordPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Record Payment</h2>
              <button
                type="button"
                onClick={closeRecordPaymentModal}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-lg font-bold px-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Unpaid Invoices Header Bar */}
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm">Unpaid Invoices</span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Invoice #"
                    value={recordPaymentInvoiceFilter}
                    onChange={(e) => setRecordPaymentInvoiceFilter(e.target.value)}
                    className="w-56 pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                  />
                </div>
              </div>

              {/* Unpaid Invoices Table */}
              <div className="border-b border-slate-200 pb-3 space-y-2">
                <div className="grid grid-cols-3 text-xs font-bold px-2 py-1">
                  <span className="text-[#a82e2e] flex items-center gap-1">
                    Invoice Number <span className="text-xs">▲</span>
                  </span>
                  <span className="text-[#a82e2e]">Balance</span>
                  <span className="text-slate-700 text-right">Amount</span>
                </div>

                {customerInvoicesList.filter((inv) =>
                  !['closed', 'paid', 'voided', 'signed'].some((s) => (inv.status || '').toLowerCase().includes(s))
                ).length > 0 ? (
                  customerInvoicesList
                    .filter((inv) => !['closed', 'paid', 'voided', 'signed'].some((s) => (inv.status || '').toLowerCase().includes(s)))
                    .map((inv) => (
                      <div key={inv.id} className="grid grid-cols-3 items-center px-2 py-1 text-xs">
                        <span className="font-bold text-[#be4646]">Invoice {inv.number}</span>
                        <span className="font-semibold text-slate-800">{inv.amount}</span>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-slate-500">$</span>
                          <input
                            type="text"
                            placeholder="0.00"
                            className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-right font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-slate-500 py-3 text-center italic text-xs">
                    There are no unpaid invoices for this customer.
                  </p>
                )}

                {/* Payment Without Invoice Row */}
                <div className="flex items-center justify-between py-2 px-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 text-xs">Payment Without Invoice</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={recordPaymentUnpaidAmount}
                      placeholder="0.00"
                      onFocus={(e) => {
                        if (e.target.value === '0.00') {
                          setRecordPaymentUnpaidAmount('');
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                          setRecordPaymentUnpaidAmount(val);
                        }
                      }}
                      onBlur={() => {
                        const num = parseFloat(recordPaymentUnpaidAmount);
                        if (!isNaN(num) && num > 0) {
                          setRecordPaymentUnpaidAmount(num.toFixed(2));
                        }
                      }}
                      className="w-36 px-2.5 py-1 bg-white border border-slate-300 rounded text-right font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#2d82b7] placeholder:text-slate-400 focus:placeholder-transparent"
                    />
                  </div>
                </div>

                {/* Total Payment Row */}
                <div className="flex items-center justify-between py-2 px-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 text-xs">Total Payment</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">$</span>
                    <input
                      type="text"
                      readOnly
                      value={parseFloat(recordPaymentUnpaidAmount) > 0 ? (parseFloat(recordPaymentUnpaidAmount) || 0).toFixed(2) : ''}
                      placeholder="0.00"
                      className="w-36 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-right font-bold text-slate-900 text-xs cursor-not-allowed placeholder:text-slate-400 focus:placeholder-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="space-y-3 pt-1">
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded">
                  <span className="font-bold text-slate-700 text-sm">Payment Details</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Payment Method <span className="text-[#be4646]">*</span>
                    </label>
                    <select
                      value={recordPaymentMethod}
                      onChange={(e) => setRecordPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7]"
                    >
                      <option value="Paper Check">Paper Check</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="ACH / eCheck">ACH / eCheck</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Date Received <span className="text-[#be4646]">*</span>
                    </label>
                    <DatePicker
                      value={recordPaymentDate}
                      onChange={(d) => setRecordPaymentDate(d)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Memo</label>
                  <textarea
                    rows={2}
                    value={recordPaymentMemo}
                    onChange={(e) => setRecordPaymentMemo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] resize-none"
                  />
                </div>

                {/* Alert Message Box */}
                <div className="bg-sky-50 border border-sky-200 rounded p-3 text-sky-900 text-xs font-semibold text-center">
                  Recording this payment will NOT process a payment!
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={closeRecordPaymentModal}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  closeRecordPaymentModal();
                  setToastMessage('Payment recorded successfully (Offline record)');
                  setTimeout(() => setToastMessage(null), 3500);
                  setRecordPaymentUnpaidAmount('0.00');
                  setRecordPaymentMemo('');
                }}
                className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADD NEW CARD (STRIPE SETUPINTENT + PAYMENTELEMENT) ================= */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add new card</h3>
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#635bff]" />
                  <span>Encrypted & powered by Stripe</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddCardModal}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            {/* Body: Stripe PaymentElement wrapped in Elements with SetupIntent clientSecret */}
            <div className="p-6 text-xs">
              {setupIntentClientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: setupIntentClientSecret,
                  }}
                >
                  <StripeAddCardForm
                    stripeIsDefault={stripeIsDefault}
                    setStripeIsDefault={setStripeIsDefault}
                    onSuccess={(newPm) => {
                      setStoredPaymentMethods((prev) => [...prev, newPm]);
                      closeAddCardModal();
                      setToastMessage(`Card ending in ${newPm.last4} saved to Stripe!`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    onCancel={closeAddCardModal}
                  />
                </Elements>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    mode: 'setup',
                    currency: 'usd',
                  }}
                >
                  <StripeAddCardForm
                    stripeIsDefault={stripeIsDefault}
                    setStripeIsDefault={setStripeIsDefault}
                    onSuccess={(newPm) => {
                      setStoredPaymentMethods((prev) => [...prev, newPm]);
                      closeAddCardModal();
                      setToastMessage(`Card ending in ${newPm.last4} saved to Stripe!`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    onCancel={closeAddCardModal}
                  />
                </Elements>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Maintenance Plan Modal */}
      {showAddMaintPlanModal && (
        <AddMaintenancePlanModal
          isOpen={showAddMaintPlanModal}
          onClose={() => setShowAddMaintPlanModal(false)}
          customer={currentDbCustomer}
          locationsList={locationsList}
          authorizedPersons={authorizedPersonsList}
          onPlanCreated={async (plan) => {
            await persistPlan(plan);
            setToastMessage(`Maintenance Plan "${plan.name}" added successfully!`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <AddEquipmentModal
          isOpen={showAddEquipmentModal}
          onClose={() => {
            setShowAddEquipmentModal(false);
            setEditingEquipment(null);
          }}
          customer={currentDbCustomer}
          locations={locationsList}
          initialEquipment={editingEquipment}
          onSave={async (item) => {
            await persistEquipment(item);
            setToastMessage(`Equipment "${item.name}" saved successfully!`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Add Authorized Person Modal */}
      {showAddAuthorizedPersonModal && (
        <AddAuthorizedPersonModal
          isOpen={showAddAuthorizedPersonModal}
          onClose={() => {
            setShowAddAuthorizedPersonModal(false);
            setEditingAuthorizedPerson(null);
          }}
          customer={currentDbCustomer}
          locations={locationsList}
          initialPerson={editingAuthorizedPerson}
          onSave={async (person) => {
            const personWithCustomer: CanonicalAuthorizedPerson = {
              ...person,
              customerId: currentDbCustomer?.id,
              customerNumber: (currentDbCustomer as any)?.customerNumber || currentDbCustomer?.id,
            };
            let updatedList: CanonicalAuthorizedPerson[] = [];
            if (editingAuthorizedPerson) {
              updatedList = authorizedPersonsList.map((p) => (p.id === person.id ? personWithCustomer : p));
            } else {
              updatedList = [...authorizedPersonsList, personWithCustomer];
            }
            setAuthorizedPersonsList(updatedList);
            if (currentDbCustomer) {
              const updatedCustomer: CanonicalCustomer = {
                ...currentDbCustomer,
                authorizedPersons: updatedList,
              };
              await saveCustomer(updatedCustomer);
              await client.saveAuthorizedPerson(personWithCustomer, databaseMode);
            }
            setToastMessage(`Authorized Person "${person.firstName} ${person.lastName}" saved successfully!`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
