'use client';

import React, { useState, useRef, use, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Star, 
  MapPin, 
  Edit3, 
  Flag, 
  ChevronDown, 
  Plus, 
  Copy, 
  Columns, 
  X, 
  AlertTriangle, 
  FileText, 
  Send, 
  RotateCcw, 
  Check, 
  Upload, 
  Trash2, 
  Pencil, 
  Heart,
  Search,
  User,
  Bell,
  Mail,
  Download,
  Eye,
  Image as ImageIcon,
  FolderDown,
  MoreVertical
} from 'lucide-react';
import { 
  Button, 
  Checkbox,
  MenuTrigger,
  Menu,
  MenuItem,
  MenuButton,
  MenuSeparator,
  HierarchicalJobTypeSelector
} from '@/components/ui';
import { 
  EditFollowUpFlagModal, 
  FlagNoteEntry, 
  mockFollowUpTypes, 
  mockAssignees 
} from '@/components/modals/EditFollowUpFlagModal';
import { 
  JobChecklistInstance, 
  defaultChecklistDefinitions 
} from '@/data/checklistsData';
import { ViewChecklistModal } from '@/components/modals/ViewChecklistModal';
import { UpdateAppointmentModal, formatCustomerDisplayName } from '@/components/modals/UpdateAppointmentModal';
import { AddEquipmentModal } from '@/components/modals/AddEquipmentModal';
import { NewNoteModal } from '@/components/modals/NewNoteModal';
import { AdobePdfIcon, PdfDocumentViewerModal } from '@/components/modals/PdfDocumentViewerModal';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useChecklists } from '@/hooks/useChecklists';
import { useNotes } from '@/hooks/useNotes';
import { useAttachments } from '@/hooks/useAttachments';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useCalls } from '@/hooks/useCalls';
import { useProposals } from '@/hooks/useProposals';
import { useEquipment } from '@/hooks/useEquipment';
import { useAppointments } from '@/hooks/useAppointments';
import { useCustomers } from '@/hooks/useCustomers';
import { useJobs } from '@/hooks/useJobs';
import { useDatabaseMode } from '@/contexts/database-mode-context';
import { useSession } from '@/auth/sessionStore';
import { INITIAL_JOB_TYPES } from '@/stores/jobTypeRegistry';
import { JOB_PRICE_OPTIONS } from '@/constants/globalChoices';
import { CanonicalFollowUpFlag, CanonicalChecklistInstance, CanonicalNote, CanonicalAttachment, CanonicalPaymentRecord, CanonicalInvoice, CanonicalProposal, CanonicalCustomer, CanonicalJob, CanonicalAppointment, formatEasternDate } from '@murphys/domain';

interface Props {
  params: Promise<{ id: string }>;
}

interface JobDetails {
  id: string;
  jobNumber: string;
  customerName: string;
  customerId: string;
  isStarred: boolean;
  address: {
    locationName: string;
    street: string;
    cityStateZip: string;
  };
  phone: string;
  email: string;
  status: 'Opened' | 'Closed' | 'Abandoned';
  jobType: string;
  jobPrice: string;
  uncollected: string;
  isFlagged: boolean;
  followUpType?: string;
  assignee?: string;
  dueDate?: string;
  isFlagComplete?: boolean;
  notes?: FlagNoteEntry[];
  stage: 'Appointment' | 'Proposal' | 'Purchase Order' | 'Invoice' | 'Payment';
  checklistsCount: number;
  equipmentCount: number;
}

export function extractLiveApptTimes(appt: any) {
  if (!appt) {
    return {
      appointmentDate: '2026-08-27',
      startTime: '08:00 AM',
      endTime: '10:00 AM',
      durationHours: 2,
    };
  }

  // If explicit startTime and endTime exist
  if (appt.startTime && appt.endTime) {
    const rawDate = appt.appointmentDate || appt.date || (appt.dateTime ? appt.dateTime.slice(0, 10) : '2026-08-27');
    return {
      appointmentDate: rawDate.includes('T') ? rawDate.slice(0, 10) : rawDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      durationHours: appt.durationHours || 2,
    };
  }

  // If ISO string dateTime exists (e.g. "2026-08-27T17:00:00Z")
  if (typeof appt.dateTime === 'string') {
    if (appt.dateTime.includes('\n')) {
      const [dPart, tPart] = appt.dateTime.split(/\r?\n/);
      if (tPart && tPart.includes('-')) {
        const [st, et] = tPart.split('-').map((s: string) => s.trim().replace(/\s*CDT|\s*EDT/gi, ''));
        return {
          appointmentDate: dPart.trim(),
          startTime: st,
          endTime: et,
          durationHours: appt.durationHours || 2,
        };
      }
    }

    try {
      const dt = new Date(appt.dateTime);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;

        const dur = typeof appt.durationHours === 'number' ? appt.durationHours : (parseFloat(appt.durationHours || appt.expectedDurationHours || '2') || 2);
        const endDt = new Date(dt.getTime() + dur * 60 * 60 * 1000);

        const format12 = (d: Date) => {
          let h = d.getHours();
          const min = String(d.getMinutes()).padStart(2, '0');
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          if (h === 0) h = 12;
          return `${h}:${min} ${ampm}`;
        };

        return {
          appointmentDate: dateStr,
          startTime: format12(dt),
          endTime: format12(endDt),
          durationHours: dur,
        };
      }
    } catch (e) {}
  }

  return {
    appointmentDate: appt.appointmentDate || '2026-08-27',
    startTime: '08:00 AM',
    endTime: '10:00 AM',
    durationHours: 2,
  };
}

export function computeJobElapsedTime(appt: any): string {
  if (!appt) return '(00:00:00)';
  
  if (appt.elapsedJobTime) return appt.elapsedJobTime;
  if (appt.actualJobDuration) return appt.actualJobDuration;
  
  // Elapsed time between Arrived and Completed
  if (appt.arrivedAt && appt.completedAt) {
    const start = new Date(appt.arrivedAt).getTime();
    const end = new Date(appt.completedAt).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diffMs = end - start;
      const totalSecs = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      return `(${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')})`;
    }
  }

  // If completed with actual hours worked
  if ((appt.status === 'Completed' || appt.techStatus === 'Completed') && appt.hoursWorked && appt.hoursWorked !== 'N/A') {
    const h = parseFloat(appt.hoursWorked) || 0;
    const hrs = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    return `(${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00)`;
  }

  // Default for unfinished/open appointments
  return '(00:00:00)';
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

export function formatAppointmentSchedule(appt: any): { dateStr: string; timeWindowStr: string; durationStr: string } {
  if (!appt) {
    return { dateStr: 'August 27, 2026', timeWindowStr: '3:00 pm - 5:00 pm', durationStr: '(00:00:00)' };
  }

  // 1. If startTime and endTime exist
  if (appt.startTime && appt.endTime) {
    const rawDate = appt.appointmentDate || appt.date || (appt.dateTime ? appt.dateTime.slice(0, 10) : '2026-08-27');
    let dateStr = rawDate;
    try {
      if (rawDate.includes('-')) {
        const [y, m, d] = rawDate.split('-').map((n: string) => parseInt(n, 10));
        const dt = new Date(y, m - 1, d);
        dateStr = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}

    const format12 = (t: string) => {
      if (t.includes('am') || t.includes('pm') || t.includes('AM') || t.includes('PM')) return t.toLowerCase().replace(/\s*(cdt|cst|edt|est|utc)/gi, '');
      const [hStr, mStr] = t.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${mStr || '00'} ${ampm}`;
    };

    return {
      dateStr,
      timeWindowStr: `${format12(appt.startTime)} - ${format12(appt.endTime)}`,
      durationStr: appt.hoursScheduled ? `(${appt.hoursScheduled})` : (appt.durationHours ? `(${String(Math.floor(appt.durationHours)).padStart(2, '0')}:00:00)` : '(00:00:00)'),
    };
  }

  // 2. If dateTime string with newline (e.g. "1/20/2025 \n2:00 PM - 3:00 PM")
  if (typeof appt.dateTime === 'string' && appt.dateTime.includes('\n')) {
    const [dPart, tPart] = appt.dateTime.split('\n');
    let dateStr = dPart.trim();
    try {
      const dt = new Date(dPart.trim());
      if (!isNaN(dt.getTime())) {
        dateStr = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return {
      dateStr,
      timeWindowStr: tPart.trim().replace(/\s*(CDT|CST|EDT|EST|UTC)/gi, ''),
      durationStr: appt.hoursScheduled ? `(${appt.hoursScheduled})` : '(01:00:00)',
    };
  }

  // 3. If dateTime is ISO timestamp (e.g. "2026-08-27T17:00:00Z")
  if (typeof appt.dateTime === 'string' && (appt.dateTime.includes('T') || appt.dateTime.includes('-') || !isNaN(Date.parse(appt.dateTime)))) {
    try {
      const startDt = new Date(appt.dateTime);
      if (!isNaN(startDt.getTime())) {
        const dateStr = startDt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const durHours = typeof appt.durationHours === 'number' ? appt.durationHours : (parseFloat(appt.durationHours || appt.expectedDurationHours || '2') || 2);
        const endDt = new Date(startDt.getTime() + durHours * 60 * 60 * 1000);
        const tStart = startDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        const tEnd = endDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        return {
          dateStr,
          timeWindowStr: `${tStart} - ${tEnd}`,
          durationStr: `(${String(Math.floor(durHours)).padStart(2, '0')}:${String(Math.round((durHours % 1) * 60)).padStart(2, '0')}:00)`,
        };
      }
    } catch (e) {}
  }

  return {
    dateStr: appt.date || 'August 27, 2026',
    timeWindowStr: (appt.scheduledTime || '3:00 pm - 5:00 pm').replace(/\s*(CDT|CST|EDT|EST|UTC)/gi, ''),
    durationStr: '(00:00:00)',
  };
}

export function getJobTripTypeColorHex(jobType: string): string {
  const jt = (jobType || '').toUpperCase();
  if (jt.includes('INSTALL')) return '#6255f5'; // Indigo
  if (jt.includes('PART')) return '#cb30e0'; // Purple
  if (jt.includes('PM') || jt.includes('PREVENTATIVE') || jt.includes('MAINTENANCE')) return '#34c759'; // Green
  if (jt.includes('RECALL')) return '#FF3B30'; // Red
  if (jt.includes('DIAGNOSTIC') || jt.includes('DIAG')) return '#0088ff'; // Blue
  if (jt.includes('AHS') || jt.includes('FI') || /(O\.?R\.?)/i.test(jt) || jt.includes('HOME WARRANTY')) return '#ff9500'; // Amber/Orange
  if (jt.includes('APPLIANCE')) return '#0088ff'; // Blue
  if (jt.includes('COMMERCIAL')) return '#0088ff'; // Blue
  return '#0088ff'; // Default Blue
}

export const mockCustomerSavedLocations = [
  '184 Eglin Pkwy NE, Fort Walton Beach, FL 32547',
  '880 Park Avenue N, Winter Park, FL 32789',
  '400 Harbor Blvd, Orlando, FL 32801',
  '1200 Lake Baldwin Ln, Orlando, FL 32814',
];

const mockJobsDatabase: Record<string, JobDetails> = {
  '1001': {
    id: 'job-1001',
    jobNumber: '1001',
    customerName: 'Eleanor Vance',
    customerId: 'cust-res-01',
    isStarred: true,
    address: {
      locationName: '184 Eglin Pkwy NE',
      street: '184 Eglin Pkwy NE',
      cityStateZip: 'Winter Park, FL 32789',
    },
    phone: '(850) 555-8121',
    email: 'eleanor.vance@example.com',
    status: 'Opened',
    jobType: 'Preventative Maintenance',
    jobPrice: 'Maintenance Plan Price',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Marcus Vance',
    dueDate: '2026-08-20',
    isFlagComplete: false,
    notes: [
      {
        id: 'note-1',
        authorName: 'Marcus Vance',
        timestamp: '8/13/2026, 2:45 pm',
        text: 'Routine seasonal check completed. All system components operational.',
      },
    ],
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 2,
  },
  'job-1001': {
    id: 'job-1001',
    jobNumber: '1001',
    customerName: 'Eleanor Vance',
    customerId: 'cust-res-01',
    isStarred: true,
    address: {
      locationName: '184 Eglin Pkwy NE',
      street: '184 Eglin Pkwy NE',
      cityStateZip: 'Winter Park, FL 32789',
    },
    phone: '(850) 555-8121',
    email: 'eleanor.vance@example.com',
    status: 'Opened',
    jobType: 'Preventative Maintenance',
    jobPrice: 'Maintenance Plan Price',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Marcus Vance',
    dueDate: '2026-08-20',
    isFlagComplete: false,
    notes: [
      {
        id: 'note-1',
        authorName: 'Marcus Vance',
        timestamp: '8/13/2026, 2:45 pm',
        text: 'Routine seasonal check completed. All system components operational.',
      },
    ],
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 2,
  },
  'job-1': {
    id: 'job-1',
    jobNumber: '1001',
    customerName: 'Eleanor Vance',
    customerId: 'cust-res-01',
    isStarred: true,
    address: {
      locationName: '184 Eglin Pkwy NE',
      street: '184 Eglin Pkwy NE',
      cityStateZip: 'Winter Park, FL 32789',
    },
    phone: '(850) 555-8121',
    email: 'eleanor.vance@example.com',
    status: 'Opened',
    jobType: 'HVAC Service',
    jobPrice: 'Flat Rate',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Marcus Vance',
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 2,
  },
  'job-2': {
    id: 'job-2',
    jobNumber: '1002',
    customerName: 'Magnolia Bay Bistro',
    customerId: 'cust-com-01',
    isStarred: false,
    address: {
      locationName: 'Magnolia Bay Bistro',
      street: '400 Harbor Blvd',
      cityStateZip: 'Orlando, FL 32801',
    },
    phone: '(850) 555-4321',
    email: 'contact@magnoliabaybistro.com',
    status: 'Opened',
    jobType: 'Commercial Refrigeration',
    jobPrice: 'Time & Materials',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Sarah Jenkins',
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 2,
  },
  'job-3': {
    id: 'job-3',
    jobNumber: '1003',
    customerName: 'Dr. Aris Thorne',
    customerId: 'cust-res-02',
    isStarred: false,
    address: {
      locationName: 'Dr. Aris Thorne',
      street: '1200 Lake Baldwin Ln',
      cityStateZip: 'Orlando, FL 32814',
    },
    phone: '(850) 555-9204',
    email: 'dr.thorne@winterparkclinic.com',
    status: 'Opened',
    jobType: 'HVAC Service',
    jobPrice: 'Maintenance Plan Price',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Alex Reynolds',
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 1,
  },
};

const stagesList: Array<'Appointment' | 'Proposal' | 'Purchase Order' | 'Invoice' | 'Payment'> = [
  'Appointment',
  'Proposal',
  'Purchase Order',
  'Invoice',
  'Payment',
];

type SummaryTabType = 
  | 'calls-notes'
  | 'checklists'
  | 'equipment'
  | 'attachments';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const jobIdParam = resolvedParams.id;

  const defaultJobData: JobDetails = {
    id: jobIdParam,
    jobNumber: jobIdParam.replace(/\D/g, '') || '1001',
    customerName: 'Eleanor Vance',
    customerId: 'cust-res-01',
    isStarred: true,
    address: {
      locationName: '184 Eglin Pkwy NE, Fort Walton Beach, FL 32547',
      street: '184 Eglin Pkwy NE',
      cityStateZip: 'Winter Park, FL 32789',
    },
    phone: '(850) 555-8121',
    email: 'eleanor.vance@example.com',
    status: 'Opened',
    jobType: 'Preventative Maintenance',
    jobPrice: 'Maintenance Plan Price',
    uncollected: '$0.00',
    isFlagged: false,
    followUpType: 'Need Quote/Autho',
    assignee: 'Marcus Vance',
    dueDate: '2026-08-20',
    isFlagComplete: false,
    notes: [
      {
        id: 'note-1',
        authorName: 'Marcus Vance',
        timestamp: '8/13/2026, 2:45 pm',
        text: 'Routine seasonal check completed. All system components operational.',
      },
    ],
    stage: 'Appointment',
    checklistsCount: 1,
    equipmentCount: 2,
  };

  const { databaseMode, client } = useDatabaseMode();
  const { currentUser } = useSession();

  const emptyJobData: JobDetails = {
    id: jobIdParam,
    jobNumber: jobIdParam.replace(/\D/g, '') || '134375',
    customerName: '',
    customerId: '',
    isStarred: false,
    address: {
      locationName: '',
      street: '',
      cityStateZip: '',
    },
    phone: '',
    email: '',
    status: 'Opened',
    jobType: 'HVAC service',
    jobPrice: '$0.00',
    uncollected: '$0.00',
    isFlagged: false,
    notes: [],
    stage: 'Appointment',
    checklistsCount: 0,
    equipmentCount: 0,
  };

  const initialJob = databaseMode === 'mock' ? (mockJobsDatabase[jobIdParam] || defaultJobData) : emptyJobData;

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  const { jobs: allJobs = [], saveJob: persistCanonicalJob } = useJobs();
  const [directJob, setDirectJob] = useState<CanonicalJob | null>(null);
  const [directCustomer, setDirectCustomer] = useState<CanonicalCustomer | null>(null);
  const [localJobOverrides, setLocalJobOverrides] = useState<Partial<JobDetails>>({});
  const [selectedApptForEdit, setSelectedApptForEdit] = useState<any | null>(null);
  const [viewingPdfInvoice, setViewingPdfInvoice] = useState<any | null>(null);
  const [viewingPdfProposal, setViewingPdfProposal] = useState<any | null>(null);

  const queryJobIdentifier = directJob?.jobNumber
    ? String(directJob.jobNumber)
    : jobIdParam.startsWith('appt-')
    ? undefined
    : jobIdParam;
  const { appointments = [], saveAppointment, deleteAppointment } = useAppointments(undefined, queryJobIdentifier);
  const { customers = [] } = useCustomers();
  const { invoices: allInvoices = [] } = useInvoices(undefined, jobIdParam);
  const { proposals: allProposals = [] } = useProposals(undefined, jobIdParam);
  const { followUps, saveFollowUp } = useFollowUps();
  const { templates, instances, saveChecklistInstance } = useChecklists(jobIdParam);

  useEffect(() => {
    let isMounted = true;
    async function loadDirectData() {
      try {
        let j = await client.fetchJobById(jobIdParam, databaseMode);
        if (!j && jobIdParam.startsWith('appt-')) {
          const appt = await client.fetchAppointmentById(jobIdParam, databaseMode);
          if (appt) {
            const jNum = appt.jobNumber ? String(appt.jobNumber) : undefined;
            const jId = appt.jobId || (jNum ? `job-${jNum}` : undefined);
            if (jId || jNum) {
              j = await client.fetchJobById(jId || jNum!, databaseMode);
            }
          }
        }
        if (j && isMounted) {
          setDirectJob(j);
        }

        const rawJobId = jobIdParam.replace(/^job-/, '');
        const foundJob = j || allJobs.find(
          (item: any) => item.id === jobIdParam || item.jobNumber === jobIdParam || item.id === `job-${jobIdParam}` || item.jobNumber === rawJobId
        );

        const custLookupId = (foundJob as any)?.customerId || (jobIdParam.startsWith('cust-') ? jobIdParam : undefined);
        const custLookupNum = (foundJob as any)?.customerNumber || (typeof (foundJob as any)?.customerId === 'number' ? String((foundJob as any).customerId) : undefined);

        if (custLookupId) {
          const c = await client.fetchCustomerById(custLookupId, databaseMode);
          if (c && isMounted) {
            setDirectCustomer(c);
            return;
          }
        }
        if (custLookupNum) {
          const c = await client.fetchCustomerById(custLookupNum, databaseMode);
          if (c && isMounted) {
            setDirectCustomer(c);
            return;
          }
        }
        if (foundJob?.customerName) {
          const { customers: list } = await client.fetchCustomersPaginated({
            mode: databaseMode,
            searchQuery: foundJob.customerName,
            pageSize: 5,
          });
          const match = list.find((c: any) => c.name?.toLowerCase() === foundJob.customerName?.toLowerCase());
          if (match && isMounted) {
            setDirectCustomer(match);
          }
        }
      } catch (err) {
        console.error('Error loading direct job or customer:', err);
      }
    }
    loadDirectData();
    return () => { isMounted = false; };
  }, [jobIdParam, databaseMode, client]);

  const job: JobDetails = useMemo(() => {
    const rawJobId = jobIdParam.replace(/^job-/, '');
    const foundJob = directJob || allJobs.find(
      (j: any) => j.id === jobIdParam || j.jobNumber === jobIdParam || j.id === `job-${jobIdParam}` || j.jobNumber === rawJobId
    );

    const relatedAppts = appointments.filter(
      (a: any) =>
        String(a.jobNumber) === jobIdParam ||
        String(a.jobNumber) === rawJobId ||
        a.jobId === jobIdParam ||
        a.id === jobIdParam ||
        (foundJob && (String(a.jobNumber) === String(foundJob.jobNumber) || a.jobId === foundJob.id))
    );

    const relatedInvoices = allInvoices.filter(
      (i: any) =>
        String(i.jobNumber) === jobIdParam ||
        String(i.jobNumber) === rawJobId ||
        (foundJob && String(i.jobNumber) === String(foundJob.jobNumber))
    );

    const relatedProposals = allProposals.filter(
      (p: any) =>
        String(p.jobNumber) === jobIdParam ||
        String(p.jobNumber) === rawJobId ||
        (foundJob && String(p.jobNumber) === String(foundJob.jobNumber))
    );

    const custId = (foundJob as any)?.customerId || relatedAppts[0]?.customerId;
    const custNum = (foundJob as any)?.customerNumber;
    const cust = directCustomer || customers.find(
      (c: any) => (custId && c.id === custId) || (custNum && c.customerNumber === custNum) || (foundJob?.customerName && c.name?.toLowerCase() === foundJob.customerName.toLowerCase())
    );

    // Clean, full address resolution
    let fullStreet = '';
    let fullCityStateZip = '';

    const jobAddr = (foundJob as any)?.address;
    const rawLoc = (foundJob as any)?.locationAddress || (relatedAppts[0] as any)?.location || (relatedAppts[0] as any)?.locationAddress || '';

    if (jobAddr && jobAddr.street && jobAddr.street !== 'Primary Location') {
      fullStreet = jobAddr.street;
      const city = jobAddr.city || (foundJob as any)?.locationCity || cust?.address?.city || '';
      const state = jobAddr.state || (foundJob as any)?.locationState || cust?.address?.state || 'FL';
      const zip = jobAddr.zipCode || jobAddr.zip || (foundJob as any)?.locationZip || cust?.address?.zipCode || '';
      fullCityStateZip = city ? `${city}, ${state} ${zip}`.trim() : jobAddr.cityStateZip || '';
    } else if (rawLoc) {
      const locClean = rawLoc.replace(/^[^-]+-\s*/, '').replace(/\n/g, ', ').replace(/\s+,/g, ',').trim();
      if (locClean.includes('FL') || /\b32[0-9]{3}\b/.test(locClean)) {
        fullStreet = locClean;
        fullCityStateZip = '';
      } else {
        fullStreet = locClean;
        const city = (foundJob as any)?.locationCity || cust?.address?.city || 'Destin';
        const state = (foundJob as any)?.locationState || cust?.address?.state || 'FL';
        const zip = (foundJob as any)?.locationZip || cust?.address?.zipCode || '32541';
        fullCityStateZip = `${city}, ${state} ${zip}`.trim();
      }
    } else if (cust?.address?.street) {
      fullStreet = cust.address.street;
      const city = cust.address.city || 'Destin';
      const state = cust.address.state || 'FL';
      const zip = cust.address.zipCode || '32541';
      fullCityStateZip = `${city}, ${state} ${zip}`.trim();
    } else if (databaseMode === 'mock') {
      fullStreet = initialJob.address?.street || '';
      fullCityStateZip = initialJob.address?.cityStateZip || 'FL';
    }

    const completeFullAddress = (fullCityStateZip && !fullStreet.toLowerCase().includes(fullCityStateZip.toLowerCase().split(',')[0]))
      ? `${fullStreet}, ${fullCityStateZip}`
      : fullStreet;

    const computedStage: 'Appointment' | 'Proposal' | 'Purchase Order' | 'Invoice' | 'Payment' = relatedInvoices.some((i: any) => i.paymentStatus === 'Paid')
      ? 'Payment'
      : relatedInvoices.length > 0
      ? 'Invoice'
      : relatedProposals.length > 0
      ? 'Proposal'
      : 'Appointment';

    const statusVal: 'Opened' | 'Closed' | 'Abandoned' =
      foundJob?.status === 'Closed' || relatedAppts[0]?.status === 'Completed'
        ? 'Closed'
        : foundJob?.status === 'Abandoned'
        ? 'Abandoned'
        : 'Opened';

    const isFlagged = Boolean(foundJob?.isFlagged || (foundJob as any)?.followUpFlag === 'Y' || relatedAppts[0]?.isFlaggedForFollowUp);

    const invTotal = relatedInvoices.reduce((sum: number, i: any) => sum + (i.total || i.amount || i.balance || i.balanceDue || 0), 0);
    const propTotal = relatedProposals.reduce((sum: number, p: any) => sum + (p.total || p.amount || 0), 0);
    const computedUncollected = ((foundJob as any)?.uncollected && (foundJob as any).uncollected !== '$0.00')
      ? (foundJob as any).uncollected
      : invTotal > 0
      ? `$${invTotal.toFixed(2)}`
      : propTotal > 0
      ? `$${propTotal.toFixed(2)}`
      : '$0.00';

    const rawCustCandidate = (foundJob as any)?.customerName || (directJob as any)?.customerName || cust?.name || directCustomer?.name || relatedAppts[0]?.customerName;
    const formattedCustName = rawCustCandidate && rawCustCandidate !== 'Customer'
      ? formatCustomerDisplayName(rawCustCandidate)
      : (cust ? formatCustomerDisplayName(cust) : (directCustomer ? formatCustomerDisplayName(directCustomer) : (databaseMode === 'mock' ? initialJob.customerName : 'Customer')));

    const baseJob: JobDetails = {
      id: foundJob?.id || `job-${jobIdParam}`,
      jobNumber: String(foundJob?.jobNumber || rawJobId),
      customerName: formattedCustName,
      customerId: custId || cust?.id || (databaseMode === 'mock' ? initialJob.customerId : `cust-${rawJobId}`),
      isStarred: Boolean(foundJob?.isStarred),
      address: {
        locationName: completeFullAddress,
        street: completeFullAddress,
        cityStateZip: fullCityStateZip,
      },
      phone: (foundJob as any)?.phone || cust?.mobilePhone || cust?.phone || (databaseMode === 'mock' ? initialJob.phone : ''),
      email: (foundJob as any)?.email || cust?.email || (databaseMode === 'mock' ? initialJob.email : ''),
      status: statusVal,
      jobType: (foundJob as any)?.jobName || foundJob?.jobType || relatedAppts[0]?.jobType || (databaseMode === 'mock' ? initialJob.jobType : 'HVAC Service'),
      jobPrice: (foundJob as any)?.jobPrice || (databaseMode === 'mock' ? initialJob.jobPrice : 'Standard Price'),
      uncollected: computedUncollected,
      isFlagged,
      followUpType: isFlagged ? (foundJob?.followUpType || 'Need Quote/Autho') : undefined,
      assignee: (foundJob as any)?.assignee || relatedAppts[0]?.assignedTech || (databaseMode === 'mock' ? initialJob.assignee : 'Alex Reynolds'),
      dueDate: (foundJob as any)?.followUpDate || undefined,
      isFlagComplete: false,
      notes: (foundJob as any)?.serviceNotes ? [{ id: 'n-1', authorName: 'Technician', timestamp: 'Today', text: (foundJob as any).serviceNotes }] : (databaseMode === 'mock' ? (initialJob.notes || []) : []),
      stage: computedStage,
      checklistsCount: 0,
      equipmentCount: 0,
    };

    return {
      ...baseJob,
      ...localJobOverrides,
    };
  }, [allJobs, appointments, customers, allInvoices, allProposals, jobIdParam, initialJob, localJobOverrides, directJob, directCustomer, databaseMode]);

  const setJob = useCallback((updater: React.SetStateAction<JobDetails>) => {
    setLocalJobOverrides((prev) => {
      const currentFullJob = { ...job, ...prev };
      const nextFullJob = typeof updater === 'function' ? (updater as any)(currentFullJob) : updater;
      return { ...prev, ...nextFullJob };
    });
  }, [job]);

  const custNum = (job as any)?.customerNumber || (directJob as any)?.customerNumber;
  const custId = job.customerId || (directJob as any)?.customerId;

  const customerProfileLink = useMemo(() => {
    if (directCustomer?.id) return `/customers/${directCustomer.id}`;
    if (directCustomer?.customerNumber) return `/customers/cust-${directCustomer.customerNumber}`;
    if (job.customerId && !job.customerId.startsWith('cust-job-') && !job.customerId.startsWith('cust-sr-') && !job.customerId.includes(jobIdParam)) {
      return `/customers/${job.customerId}`;
    }
    if (job.customerName) {
      const matchedByName = customers.find((c) => (c.name || '').toLowerCase().trim() === job.customerName.toLowerCase().trim());
      if (matchedByName) return `/customers/${matchedByName.id}`;
      return `/customers/${encodeURIComponent(job.customerName)}`;
    }
    if (custNum) return `/customers/cust-${custNum}`;
    return `/customers/cust-1`;
  }, [directCustomer, job.customerId, job.customerName, jobIdParam, customers, custNum]);
  const { notes: dbNotes = [], saveNote: persistNote, deleteNote: removeNote } = useNotes(undefined, jobIdParam);
  const { attachments: dbAttachments = [], saveAttachment: persistAttachment, deleteAttachment: removeAttachment } = useAttachments(job.customerId || initialJob.customerId, jobIdParam);
  const { equipment: dbEquipment = [] } = useEquipment(custId, undefined, job.customerName, custNum);
  const { payments: allPayments = [] } = usePayments(job.customerId, undefined, job.customerName);
  const { calls: allCalls = [] } = useCalls();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reactive filters for Job Accordions and Tabs
  const allJobAppointments = useMemo(() => {
    return appointments.filter(
      (a: any) =>
        String(a.jobNumber) === String(job.jobNumber) ||
        String(a.jobNumber) === jobIdParam ||
        a.jobId === job.id ||
        a.jobId === jobIdParam ||
        a.id === jobIdParam ||
        (directJob && (String(a.jobNumber) === String(directJob.jobNumber) || a.jobId === directJob.id))
    );
  }, [appointments, job.jobNumber, job.id, jobIdParam, directJob]);

  const jobScheduledAppointments = useMemo(() => {
    return allJobAppointments.filter(
      (a: any) =>
        !(
          a.scheduleMode === 'request' ||
          a.isServiceRequest === true ||
          (a.status || '').toLowerCase() === 'unscheduled' ||
          a.type === 'service_request' ||
          a.isScheduled === false
        )
    );
  }, [allJobAppointments]);

  const jobServiceRequests = useMemo(() => {
    return allJobAppointments.filter(
      (a: any) =>
        a.scheduleMode === 'request' ||
        a.isServiceRequest === true ||
        (a.status || '').toLowerCase() === 'unscheduled' ||
        a.type === 'service_request' ||
        a.isScheduled === false
    );
  }, [allJobAppointments]);

  const jobAppointments = jobScheduledAppointments;

  const jobInvoices = useMemo(() => {
    return allInvoices.filter(
      (i: any) =>
        String(i.jobNumber) === String(job.jobNumber) ||
        String(i.jobNumber) === jobIdParam ||
        i.jobId === job.id ||
        i.jobId === jobIdParam ||
        (directJob && String(i.jobNumber) === String(directJob.jobNumber))
    );
  }, [allInvoices, job.jobNumber, job.id, jobIdParam, directJob]);

  const jobPayments = useMemo(() => {
    return allPayments.filter(
      (p: any) =>
        String(p.jobNumber) === String(job.jobNumber) ||
        String(p.jobNumber) === jobIdParam ||
        p.jobId === job.id ||
        p.jobId === jobIdParam ||
        (directJob && String(p.jobNumber) === String(directJob.jobNumber))
    );
  }, [allPayments, job.jobNumber, job.id, jobIdParam, directJob]);

  const jobProposals = useMemo(() => {
    return allProposals.filter(
      (p: any) =>
        String(p.jobNumber) === String(job.jobNumber) ||
        String(p.jobNumber) === jobIdParam ||
        p.jobId === job.id ||
        p.jobId === jobIdParam ||
        (directJob && String(p.jobNumber) === String(directJob.jobNumber))
    );
  }, [allProposals, job.jobNumber, job.id, jobIdParam, directJob]);

  // Edit Location State
  const [selectedLocation, setSelectedLocation] = useState<string>(
    initialJob.address ? `${initialJob.address.street}, ${initialJob.address.cityStateZip}` : '184 Eglin Pkwy NE, Fort Walton Beach, FL 32547'
  );

  useEffect(() => {
    if (job.address) {
      setSelectedLocation(`${job.address.street}, ${job.address.cityStateZip}`);
    }
  }, [job.address?.street, job.address?.cityStateZip]);

  // Pinned Alert Note Banner (Only displayed if an actual pinned note exists in Firestore)
  const [pinnedAlertNote, setPinnedAlertNote] = useState<string | null>(null);

  useEffect(() => {
    const pinned = (directJob as any)?.pinnedNote || (directCustomer as any)?.pinnedNote || dbNotes.find((n) => n.isPinned)?.content || null;
    setPinnedAlertNote(pinned);
  }, [directJob, directCustomer, dbNotes]);

  // Active Job Summary Tab (null by default so tabs are unexpanded initially!)
  const [activeSummaryTab, setActiveSummaryTab] = useState<SummaryTabType | null>(null);

  // Bottom Accordion Expand/Collapse States (Unexpanded by default!)
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    const isExpanding = !expandedSections.includes(section);
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );

    if (isExpanding) {
      setTimeout(() => {
        const el = document.getElementById(`section-${section}`);
        if (el) {
          const yOffset = -70; // Breathing room from top of viewport
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      }, 120);
    }
  };

  // Toggle Tab in Job Summary (clicking active tab collapses it, clicking new one opens it)
  const handleTabClick = (tab: SummaryTabType) => {
    setActiveSummaryTab((prev) => (prev === tab ? null : tab));
  };

  // Modals for Top Actions
  const [activeModal, setActiveModal] = useState<
    | null
    | 'flag-modal'
    | 'delete-confirm'
    | 'cannot-delete'
    | 'edit-appointment'
    | 'new-appointment'
    | 'edit-location'
    | 'new-note'
  >(null);

  const [appointmentScheduleMode, setAppointmentScheduleMode] = useState<'schedule' | 'request'>('schedule');

  // Data for Calls & Notes Tab (In chronological order starting from appt creation note)
  const [jobCallsNotes, setJobCallsNotes] = useState<
    Array<{
      id: string;
      user?: string;
      dateTime?: string;
      notes: string;
      type?: string;
      hasFlag?: boolean;
      createdDate?: string;
      lastModified?: string;
      [key: string]: any;
    }>
  >([]);

  const displayJobCallsNotes = useMemo(() => {
    const combined: Array<{
      id: string;
      user: string;
      dateTime: string;
      notes: string;
      type?: string;
      hasFlag?: boolean;
    }> = [];

    // 1. Direct Job Notes left by tech / office staff for this specific job
    const filteredDbNotes = (dbNotes || []).filter(
      (n: any) =>
        ((n.jobId && (n.jobId === job.id || n.jobId === jobIdParam)) ||
        (n.jobNumber && (String(n.jobNumber) === String(job.jobNumber) || String(n.jobNumber) === jobIdParam))) &&
        n.targetType !== 'customer'
    );
    filteredDbNotes.forEach((n) => {
      combined.push({
        id: n.id,
        user: n.authorName || 'Staff',
        dateTime: n.createdAt ? (n.createdAt.includes('T') ? n.createdAt.slice(0, 16).replace('T', ' ') : n.createdAt) : 'Today',
        notes: n.content,
        type: 'Job Note',
        hasFlag: n.isPinned,
      });
    });

    // 2. Notes left during appointment creation or appointment status updates for this job
    (allJobAppointments || []).forEach((appt: any) => {
      const apptNote = appt.serviceNotes || appt.callNotes || appt.appointmentNote;
      if (apptNote && apptNote.trim() && !combined.some((item) => item.notes === apptNote.trim())) {
        combined.push({
          id: `appt-note-${appt.id}`,
          user: appt.assignedTech || appt.technician || appt.customerName || 'Office Staff',
          dateTime: appt.dateTime ? (appt.dateTime.includes('T') ? appt.dateTime.slice(0, 10) : appt.dateTime.split(/\r?\n/)[0]) : (appt.dateCreated || 'Appointment'),
          notes: apptNote.trim(),
          type: appt.isServiceRequest || appt.scheduleMode === 'request' ? 'Service Request Note' : 'Appt Note',
          hasFlag: false,
        });
      }
    });

    // 3. Notes on service requests
    (jobServiceRequests || []).forEach((sr: any) => {
      const srNote = sr.serviceNotes || sr.callNotes || sr.appointmentNote;
      if (srNote && srNote.trim() && !combined.some((item) => item.notes === srNote.trim())) {
        combined.push({
          id: `sr-note-${sr.id}`,
          user: sr.customerName || sr.customer || sr.assignedTech || 'Office Staff',
          dateTime: sr.dateCreated || (sr.createdAt ? sr.createdAt.slice(0, 10) : 'Service Request'),
          notes: srNote.trim(),
          type: 'Service Request Note',
          hasFlag: false,
        });
      }
    });

    // 4. Base job service notes or callsAndNotes
    const baseJobNote = (job as any).serviceNotes || (job as any).callNotes || (job as any).appointmentNote;
    if (baseJobNote && baseJobNote.trim() && !combined.some((item) => item.notes === baseJobNote.trim())) {
      combined.push({
        id: `job-base-note-${job.id}`,
        user: job.customerName || 'Customer',
        dateTime: (job as any).dateCreated || 'Job Note',
        notes: baseJobNote.trim(),
        type: 'Job Note',
        hasFlag: false,
      });
    }

    if (Array.isArray((job as any).callsAndNotes)) {
      (job as any).callsAndNotes.forEach((cn: any, idx: number) => {
        const txt = typeof cn === 'string' ? cn : (cn.notes || cn.note || cn.content || '');
        if (txt && !combined.some((item) => item.notes === txt)) {
          combined.push({
            id: cn.id || `cn-${idx}`,
            user: cn.user || cn.authorName || 'Staff',
            dateTime: cn.dateTime || cn.createdAt || 'Note',
            notes: txt,
            type: 'Note',
            hasFlag: false,
          });
        }
      });
    }

    // Merge manual jobCallsNotes
    (jobCallsNotes || []).forEach((jcn: any) => {
      if (jcn.notes && !combined.some((item) => item.notes === jcn.notes)) {
        combined.push({
          id: jcn.id || `jcn-${Math.random()}`,
          user: jcn.user || 'Staff',
          dateTime: jcn.dateTime || 'Today',
          notes: jcn.notes,
          type: jcn.type || 'Job Note',
          hasFlag: jcn.hasFlag || false,
        });
      }
    });

    return combined;
  }, [dbNotes, allJobAppointments, jobServiceRequests, jobCallsNotes, job, jobIdParam]);

  // Draft inline row for active Job Note editing (at bottom row)
  const [draftJobNote, setDraftJobNote] = useState<{
    user: string;
    dateTime: string;
    text: string;
  } | null>(null);

  const handleStartNewJobNote = () => {
    const now = new Date();
    const formattedDate = '8/14/2026';
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${formattedDate}, ${displayHours}:${minutes} ${ampm}`;

    setDraftJobNote({
      user: currentUser?.name || 'Staff',
      dateTime: formattedTime,
      text: '',
    });
  };

  const handleCancelJobNote = () => {
    setDraftJobNote(null);
  };

  const handleSaveJobNote = async () => {
    if (!draftJobNote || !draftJobNote.text.trim()) return;
    const noteText = draftJobNote.text.trim();
    if (persistNote) {
      try {
        await persistNote({
          id: `note-${Date.now()}`,
          customerId: job.customerId || 'cust-1',
          jobId: job.id,
          jobNumber: parseInt(job.jobNumber.replace(/[^0-9]/g, ''), 10) || 134100,
          authorId: 'user-1',
          authorRole: 'Staff',
          authorName: draftJobNote.user || currentUser?.name || 'Staff',
          title: 'Job Note',
          content: noteText,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('Note saved successfully.');
      } catch (e) {
        console.error('Error saving note:', e);
      }
    }
    const newEntry = {
      id: `jn-${Date.now()}`,
      user: draftJobNote.user,
      dateTime: draftJobNote.dateTime,
      notes: noteText,
    };
    setJobCallsNotes((prev) => [...prev, newEntry]);
    setDraftJobNote(null);
  };

  // Data for Other Calls & Notes for this Location Tab
  const [locationCallsNotes, setLocationCallsNotes] = useState<
    Array<{ id: string; user: string; dateTime: string; notes: string }>
  >([]);

  // Draft inline row for active Location Note editing (at bottom row)
  const [draftLocationNote, setDraftLocationNote] = useState<{
    user: string;
    dateTime: string;
    text: string;
  } | null>(null);

  const handleStartNewLocationNote = () => {
    const now = new Date();
    const formattedDate = '8/14/2026';
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${formattedDate}, ${displayHours}:${minutes} ${ampm}`;

    setDraftLocationNote({
      user: currentUser?.name || 'Staff',
      dateTime: formattedTime,
      text: '',
    });
  };

  const handleCancelLocationNote = () => {
    setDraftLocationNote(null);
  };

  const handleSaveLocationNote = () => {
    if (!draftLocationNote || !draftLocationNote.text.trim()) return;
    const newEntry = {
      id: `ln-${Date.now()}`,
      user: draftLocationNote.user,
      dateTime: draftLocationNote.dateTime,
      notes: draftLocationNote.text.trim(),
    };
    setLocationCallsNotes((prev) => [...prev, newEntry]);
    setDraftLocationNote(null);
  };

  // Appointment & Technicians State (Supports multiple technicians per appointment)
  const [appointmentStatus, setAppointmentStatus] = useState<'Scheduled' | 'En Route' | 'Working' | 'Completed' | 'Cancelled' | 'Unscheduled' | 'Missed' | 'In Progress' | 'Incomplete'>('Scheduled');
  const [appointmentTechnicians, setAppointmentTechnicians] = useState([
    {
      id: 'tech-1',
      name: 'Alex Reynolds',
      scheduledTime: '2:00 pm - 4:00 pm',
      actual: 'N/A',
      jobTime: '(00:00:00)',
      techStatus: 'Idle',
      tags: '',
    },
    {
      id: 'tech-2',
      name: 'Marcus Vance',
      scheduledTime: '2:00 pm - 4:00 pm',
      actual: 'N/A',
      jobTime: '(00:00:00)',
      techStatus: 'Idle',
      tags: '',
    },
  ]);

  // Checklists Tab Data (Typed with shared JobChecklistInstance)
  const [checklists, setChecklists] = useState<JobChecklistInstance[]>([]);

  const displayChecklists = useMemo(() => {
    if (instances && instances.length > 0) {
      return instances.map((inst: any) => ({
        id: inst.id,
        definitionId: inst.templateId || inst.id,
        name: inst.title || 'Checklist',
        templateName: inst.title || 'Checklist',
        category: inst.category || 'General',
        jobId: inst.jobId || jobIdParam,
        status: (inst.status === 'completed' ? 'Complete' : 'Incomplete') as 'Complete' | 'Incomplete' | 'In Progress',
        updatedAt: inst.updatedAt || inst.createdAt || 'Today',
        items: (inst.items || []).map((i: any) => ({
          id: i.id,
          label: i.label,
          type: 'yes_no' as const,
          value: i.completed ? 'Yes' : 'No',
        })),
      }));
    }
    if (databaseMode === 'mock') {
      return [
        {
          id: 'chk-1',
          definitionId: 'chk-gas-pm',
          name: 'Gas Systems PM Checklist',
          templateName: 'Gas Systems PM Checklist',
          category: 'Maintenance',
          jobId: jobIdParam,
          status: 'Complete' as const,
          updatedAt: '8/13/2026',
          items: defaultChecklistDefinitions[0].items.map((i) => ({ ...i, value: 'Yes' as const })),
        },
      ];
    }
    return checklists;
  }, [instances, databaseMode, checklists, jobIdParam]);

  const [selectedChecklistForModal, setSelectedChecklistForModal] = useState<JobChecklistInstance | null>(null);
  const [jobAddedEquipment, setJobAddedEquipment] = useState<any[]>([]);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);

  const equipmentList = useMemo(() => {
    // Show only equipment tied to this job/appt location saved during the appt/job creation process
    const rawJobLoc = (
      job.address?.street ||
      job.address?.locationName ||
      (job as any)?.locationAddress ||
      (job as any)?.location ||
      (jobAppointments[0] as any)?.location ||
      (jobAppointments[0] as any)?.locationAddress ||
      ''
    ).toLowerCase().trim();

    // Clean location string and extract meaningful street tokens
    const stClean = rawJobLoc
      .replace(/^(best beach getaways|southern vacation rentals|360 blue|beachwalk vacation rentals)[\s\n-]+/i, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .toLowerCase()
      .trim();
    const tokens = stClean.split(/\s+/).filter((t: string) => t.length > 2 && !['florida', 'beach', 'destin', 'street', 'road', 'drive', 'lane', 'court', 'boulevard', 'avenue'].includes(t));

    const locationFilteredDbEquipment = dbEquipment.filter((eq: any) => {
      const eqLoc = (eq.locationAddress || eq.locationStreet || eq.location?.street || '').toLowerCase().trim();
      if (!eqLoc) return false;
      if (rawJobLoc && (eqLoc.includes(rawJobLoc) || rawJobLoc.includes(eqLoc))) return true;
      if (stClean && (eqLoc.includes(stClean) || stClean.includes(eqLoc))) return true;
      if (tokens.length > 0) {
        return tokens.some((t: string) => eqLoc.includes(t));
      }
      return false;
    });

    const combined = [...locationFilteredDbEquipment, ...jobAddedEquipment];

    const jobEq: any[] = Array.isArray((job as any).equipment) ? (job as any).equipment : [];
    combined.push(...jobEq);
    for (const appt of jobAppointments) {
      if (Array.isArray((appt as any).equipment)) {
        combined.push(...(appt as any).equipment);
      }
      if (Array.isArray((appt as any).selectedEquipment)) {
        combined.push(...(appt as any).selectedEquipment);
      }
    }

    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of combined) {
      const id = item.id || item.equipmentId;
      if (id && !seen.has(id)) {
        seen.add(id);
        unique.push({
          id,
          name: item.equipmentName || item.name || item.equipmentType || item.systemName || 'Equipment',
          mfg: item.manufacturer || item.mfg || 'Unknown',
          serial: item.serialNumber || item.serialNo || item.serial || 'N/A',
          model: item.modelNumber || item.modelNo || item.model || 'N/A',
          status: item.equipmentStatus || item.status || (item.isArchived ? 'Inactive' : 'Active'),
        });
      }
    }

    return unique;
  }, [dbEquipment, jobAddedEquipment, job, jobAppointments]);
  const [equipmentLocationFilter, setEquipmentLocationFilter] = useState('All Locations');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  interface JobAttachment {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    date: string;
    type: 'image' | 'pdf' | 'doc';
    accentColor: string;
    url?: string;
    fileBlob?: Blob | File;
  }

  const [attachments, setAttachments] = useState<JobAttachment[]>(() => {
    if (databaseMode !== 'mock') return [];
    return [
      {
        id: 'att-1',
        name: 'Inspection_Photos.jpg',
        size: '2.4 MB',
        uploadedBy: 'Marcus Vance',
        date: '8/13/2026',
        type: 'image',
        accentColor: 'from-blue-600 to-sky-400',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'att-2',
        name: 'HVAC_Wiring_Diagram.png',
        size: '1.8 MB',
        uploadedBy: 'Sarah Jenkins',
        date: '8/13/2026',
        type: 'image',
        accentColor: 'from-amber-600 to-orange-400',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'att-3',
        name: 'Pre_Service_Diagnostic.pdf',
        size: '840 KB',
        uploadedBy: 'Alex Reynolds',
        date: '8/12/2026',
        type: 'pdf',
        accentColor: 'from-red-600 to-rose-400',
      },
      {
        id: 'att-4',
        name: 'Refrigerant_Pressure_Log.png',
        size: '1.2 MB',
        uploadedBy: 'Carlos Mendez',
        date: '8/11/2026',
        type: 'image',
        accentColor: 'from-emerald-600 to-teal-400',
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'att-5',
        name: 'Customer_Signoff.pdf',
        size: '420 KB',
        uploadedBy: 'David Ross',
        date: '8/10/2026',
        type: 'pdf',
        accentColor: 'from-indigo-600 to-blue-400',
      },
    ];
  });

  React.useEffect(() => {
    if (databaseMode === 'live' || databaseMode === 'sandbox') {
      setAttachments(
        dbAttachments.map((a: any) => ({
          id: a.id,
          name: a.name || a.filename || 'Attachment',
          size: a.size || '1.0 MB',
          uploadedBy: a.uploadedBy || a.authorName || 'Staff',
          date: a.date || (a.createdAt ? a.createdAt.slice(0, 10) : 'Today'),
          type: a.type || (a.name?.endsWith('.pdf') ? 'pdf' : 'image'),
          accentColor: 'from-blue-600 to-sky-400',
          url: a.url || a.previewUrl,
        }))
      );
    }
  }, [dbAttachments, databaseMode]);

  const [activeMenuAttId, setActiveMenuAttId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<JobAttachment | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Single file download handler (supports real blob, object URL, and fallback content)
  const handleDownloadSingleAttachment = (att: JobAttachment) => {
    if (att.fileBlob) {
      const url = URL.createObjectURL(att.fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${att.name}`);
      return;
    }

    if (att.url && att.url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = att.url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded ${att.name}`);
      return;
    }

    if (att.url && (att.url.startsWith('http://') || att.url.startsWith('https://'))) {
      fetch(att.url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = att.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          showToast(`Downloaded ${att.name}`);
        })
        .catch(() => {
          const content = `Attachment: ${att.name}\nJob: #${job.jobNumber}`;
          const fallbackBlob = new Blob([content], { type: 'application/octet-stream' });
          const fallbackUrl = URL.createObjectURL(fallbackBlob);
          const link = document.createElement('a');
          link.href = fallbackUrl;
          link.download = att.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(fallbackUrl);
          showToast(`Downloaded ${att.name}`);
        });
      return;
    }

    const content = `Apex Field Solutions Attachment: ${att.name}\nJob: #${job.jobNumber}\nCustomer: ${job.customerName}\nUploaded: ${att.date} by ${att.uploadedBy}`;
    const blob = new Blob([content], { type: att.type === 'image' ? 'image/jpeg' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${att.name}`);
  };

  // Download all attachments in a single zip folder named "Job#attachments" (e.g. 134375attachments.zip)
  const handleDownloadAllAttachments = async () => {
    if (attachments.length === 0) {
      showToast('No attachments available to download');
      return;
    }
    try {
      setIsDownloadingZip(true);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Folder naming format requested by user: "Job#attachments" or "130481attachments"
      const folderName = `${job.jobNumber}attachments`;
      const folder = zip.folder(folderName) || zip;

      attachments.forEach((att) => {
        const content = `Apex Field Solutions - Attachment Document
=========================================
File Name: ${att.name}
Job Number: #${job.jobNumber}
Job Type: ${job.jobType}
Customer Name: ${job.customerName}
Service Location: ${job.address.street}, ${job.address.cityStateZip}
Uploaded By: ${att.uploadedBy} on ${att.date}
Original File Size: ${att.size}
Status: Verified & Archived
=========================================`;
        folder.file(att.name, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Downloaded all ${attachments.length} attachments as "${folderName}.zip"!`);
    } catch (err) {
      console.error('Error generating attachments zip:', err);
      showToast('Failed to download attachments zip');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // File Upload Reference & Real File Handling
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: JobAttachment[] = Array.from(files).map((file, idx) => {
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      return {
        id: `att-upload-${Date.now()}-${idx}`,
        name: file.name,
        size: sizeStr,
        uploadedBy: currentUser?.name || 'Alex Reynolds',
        date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        type: isImg ? 'image' : isPdf ? 'pdf' : 'doc',
        accentColor: isImg ? 'from-blue-600 to-sky-400' : 'from-red-600 to-rose-400',
        url: previewUrl,
        fileBlob: file,
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    showToast(`Uploaded ${newAttachments.length} file${newAttachments.length > 1 ? 's' : ''} successfully!`);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Populated Invoice & Payment Records
  const [invoicesList, setInvoicesList] = useState([
    {
      id: 'inv-92607',
      invoiceNumber: 'I-92607',
      issueDate: '6/29/2018',
      lastModified: '2/07/2025',
      billToCustomer: 'American Home Shield',
      invoiceStatus: 'Closed',
      paymentStatus: 'Paid',
      amount: '$54.00',
    },
  ]);

  const [paymentsList, setPaymentsList] = useState([
    {
      id: 'pay-1',
      payerName: 'American Home Shield',
      date: 'Jun 30th 2018',
      type: 'Recorded',
      method: 'Other',
      status: 'Entered',
      amount: '$54.00',
      invoiceNumber: '92607',
      amountApplied: '$54.00',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStatusChange = (newStatus: 'Opened' | 'Closed' | 'Abandoned') => {
    setJob((prev) => ({ ...prev, status: newStatus }));
    showToast(`Job status updated to ${newStatus}`);
  };

  const handleJobTypeChange = (newType: string) => {
    setJob((prev) => ({ ...prev, jobType: newType }));
    showToast(`Job type updated to ${newType}`);
  };

  const handleJobPriceChange = (newPrice: string) => {
    setJob((prev) => ({ ...prev, jobPrice: newPrice }));
  };

  const toggleStar = () => {
    setJob((prev) => ({ ...prev, isStarred: !prev.isStarred }));
  };

  // Check conditions to determine if job can be deleted
  // Condition: All active notes, payments, appointments, service requests, proposals, invoices, purchase orders, proposal comparisons, and checklists must be cleared
  const activeNotesCount = jobCallsNotes.length;
  const paymentsCount = paymentsList.length;
  const appointmentsCount = appointmentTechnicians.length;
  const serviceRequestsCount = 0;
  const proposalsCount = 0;
  const invoicesCount = invoicesList.length;
  const purchaseOrdersCount = 0;
  const proposalComparisonsCount = 0;
  const checklistsCount = checklists.length;

  const hasTiedRecords =
    activeNotesCount > 0 ||
    paymentsCount > 0 ||
    appointmentsCount > 0 ||
    serviceRequestsCount > 0 ||
    proposalsCount > 0 ||
    invoicesCount > 0 ||
    purchaseOrdersCount > 0 ||
    proposalComparisonsCount > 0 ||
    checklistsCount > 0;

  const handleDeleteJobClick = () => {
    if (hasTiedRecords) {
      setActiveModal('cannot-delete');
    } else {
      setActiveModal('delete-confirm');
    }
  };

  const handleDeleteJob = async () => {
    setIsDeletingJob(true);
    try {
      const rawJobId = jobIdParam.replace(/^job-/, '');
      await client.deleteJob(job.id || jobIdParam, databaseMode);
      if (jobIdParam !== job.id) {
        await client.deleteJob(jobIdParam, databaseMode);
      }
      if (rawJobId && rawJobId !== jobIdParam) {
        await client.deleteJob(rawJobId, databaseMode);
      }

      // Also delete any associated appointments for this job
      for (const appt of allJobAppointments) {
        if (appt.id) {
          await client.deleteAppointment(appt.id, databaseMode);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['calls'] });

      setActiveModal(null);
      router.push('/jobs/list');
    } catch (err) {
      console.error('Failed to delete job:', err);
      setIsDeletingJob(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-slate-800 pb-16 font-sans">
      {/* 1. CUSTOMER INFO & APPOINTMENT TIMELINE CARD (White box above Job Summary) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
        {/* Left Side: Customer & Job Info with Uniform Spacing */}
        <div className="space-y-1.5 text-xs">
          {/* Row 1: Job # - Job Type with Dot Indicator and Hyphen */}
          <div className="flex items-center gap-2 font-bold text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0 inline-block shadow-2xs"
              style={{ backgroundColor: getJobTripTypeColorHex(job.jobType) }}
              title={job.jobType}
            />
            <span className="text-slate-800 text-sm font-bold">
              #{job.jobNumber} - {job.jobType}
            </span>
          </div>

          {/* Row 2: Customer Name */}
          <div className="font-bold text-sm">
            <Link
              href={customerProfileLink}
              className="text-[#be4646] hover:underline cursor-pointer"
            >
              {job.customerName && job.customerName !== 'Customer'
                ? job.customerName
                : (directCustomer ? formatCustomerDisplayName(directCustomer) : (directJob?.customerName ? formatCustomerDisplayName(directJob.customerName) : (job.customerName || 'Customer')))}
            </Link>
          </div>

          {/* Row 3: Location Line (Matching phone and email color, non-clickable) */}
          <div className="text-xs text-slate-600">
            {job.address.cityStateZip && !job.address.street.includes(job.address.cityStateZip)
              ? `${job.address.street}, ${job.address.cityStateZip}`
              : job.address.street}
          </div>

          {/* Row 4: Phone & Email on the Same Row */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {job.phone && <span>{formatPhoneNumber(job.phone)}</span>}
            {job.email && <span>{job.email}</span>}
          </div>
        </div>

        {/* Center: Persistent Red Follow Up Banner (Between customer info & timeline stepper) */}
        {job.isFlagged && !job.isFlagComplete && (
          <div className="flex-1 flex justify-center px-2">
            <div className="w-full max-w-sm px-4 py-2.5 bg-[#be4646] text-white rounded-md shadow-sm font-bold text-xs flex items-center justify-between gap-3 ">
              <div className="flex items-center gap-2 text-left">
                <Flag className="w-4 h-4 fill-white text-white shrink-0" />
                <span className="font-bold text-xs leading-tight">Follow Up Required</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('flag-modal')}
                className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer"
                title="View Follow Up Flag"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Right Side: Appointment Timeline Stepper Module (Centered vertically in the white box) */}
        <div className="w-full lg:w-auto lg:min-w-[480px] shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium relative">
            {stagesList.map((stageName, idx) => {
              const isCurrent = job.stage === stageName;
              const isPast = idx < stagesList.indexOf(job.stage);

              return (
                <div key={stageName} className="flex flex-col items-center relative z-10">
                  <span className={`text-[11px] mb-1.5 ${isCurrent ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                    {stageName}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-[#3b82f6] text-white ring-4 ring-[#3b82f6]/20 font-bold shadow-xs'
                        : isPast
                        ? 'bg-slate-300 text-slate-700'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-transparent'}`} />
                  </div>
                </div>
              );
            })}

            {/* Connecting Track Line */}
            <div className="absolute top-[31px] left-6 right-6 h-[2px] bg-slate-200 -z-0" />
          </div>
        </div>
      </div>

      {/* 2. JOB SUMMARY SECTION */}
      <div className="space-y-2 pt-2">
        {/* Title Header with Reduced Job Summary Font Size and Delete Job Link */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-700 tracking-tight">Job Summary</h2>
          <button
            type="button"
            onClick={handleDeleteJobClick}
            className="text-xs text-[#be4646] hover:underline cursor-pointer font-medium"
          >
            Delete Job
          </button>
        </div>

        {/* Job Summary White Container with Tabs & Inline Expandable Content */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {/* Top Row: Dropdowns & Uncollected & Flag Button */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Job Status Dropdown */}
              <div className="flex flex-col">
                <label className="text-[11px] font-semibold text-slate-600 mb-1">
                  Job Status
                </label>
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none min-w-[130px] cursor-pointer shadow-2xs font-medium"
                >
                  <option value="Opened">Opened</option>
                  <option value="Closed">Closed</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>



              {/* Job Price Dropdown */}
              <div className="flex flex-col">
                <label className="text-[11px] font-semibold text-slate-600 mb-1">
                  Job Price
                </label>
                <select
                  value={job.jobPrice === 'Standard Rate' || job.jobPrice === 'Flat Rate' ? 'Standard Price' : job.jobPrice}
                  onChange={(e) => handleJobPriceChange(e.target.value)}
                  className="h-8 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none min-w-[200px] cursor-pointer shadow-2xs font-medium"
                >
                  {JOB_PRICE_OPTIONS.map((pOpt) => (
                    <option key={pOpt} value={pOpt}>
                      {pOpt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Uncollected Amount Display */}
              <div className="flex flex-col justify-center pl-2">
                <span className="text-[11px] font-semibold text-slate-600">Uncollected</span>
                <span className="text-sm font-bold text-slate-800">{job.uncollected}</span>
              </div>
            </div>

            {/* Flag for Follow Up Button (Hidden when job already has an active follow-up) */}
            {(!job.isFlagged || job.isFlagComplete) && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveModal('flag-modal')}
                  className="px-4 py-2 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer bg-[#a82e2e] hover:bg-[#8f2525] text-white"
                >
                  <Flag className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Flag for Follow Up</span>
                </button>
              </div>
            )}
          </div>

          {/* Customer Profile Tab Bar Design */}
          <div className="flex items-center gap-1 px-4 border-b border-slate-200 text-xs font-sans pt-2 bg-slate-50/50">
            {/* Tab 1: Calls & Notes */}
            <button
              type="button"
              onClick={() => handleTabClick('calls-notes')}
              className={`px-4 pt-2 pb-3.5 rounded-t-md transition-colors cursor-pointer ${
                activeSummaryTab === 'calls-notes'
                  ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                  : 'text-[#be4646] hover:underline font-medium'
              }`}
            >
              Calls & Notes{displayJobCallsNotes.length > 0 ? ` (${displayJobCallsNotes.length})` : ''}
            </button>

            {/* Tab 2: Checklists */}
            <button
              type="button"
              onClick={() => handleTabClick('checklists')}
              className={`px-4 pt-2 pb-3.5 rounded-t-md transition-colors cursor-pointer ${
                activeSummaryTab === 'checklists'
                  ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                  : 'text-[#be4646] hover:underline font-medium'
              }`}
            >
              Checklists{displayChecklists.length > 0 ? ` (${displayChecklists.length})` : ''}
            </button>

            {/* Tab 3: Equipment */}
            <button
              type="button"
              onClick={() => handleTabClick('equipment')}
              className={`px-4 pt-2 pb-3.5 rounded-t-md transition-colors cursor-pointer ${
                activeSummaryTab === 'equipment'
                  ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                  : 'text-[#be4646] hover:underline font-medium'
              }`}
            >
              Equipment{equipmentList.length > 0 ? ` (${equipmentList.length})` : ''}
            </button>

            {/* Tab 4: Attachments */}
            <button
              type="button"
              onClick={() => handleTabClick('attachments')}
              className={`px-4 pt-2 pb-3.5 rounded-t-md transition-colors cursor-pointer ${
                activeSummaryTab === 'attachments'
                  ? 'border border-slate-300 border-b-white bg-white text-slate-900 font-bold -mb-px shadow-2xs'
                  : 'text-[#be4646] hover:underline font-medium'
              }`}
            >
              Attachments{attachments.length > 0 ? ` (${attachments.length})` : ''}
            </button>
          </div>

          {/* INLINE EXPANDABLE TAB CONTENT SECTIONS */}
          {activeSummaryTab && (
            <div className="p-4 bg-white animate-in fade-in duration-150 text-xs">
              {/* ========================================================
                  TAB 1: Calls & Notes (Columns: User, Date/Time, Note)
                 ======================================================== */}
              {activeSummaryTab === 'calls-notes' && (
                <div className="space-y-4">
                  {/* Top Bar: Header + + New Button (No Search Bar) */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">
                      <span>Job Calls & Notes ({displayJobCallsNotes.length + (draftJobNote ? 1 : 0)})</span>
                    </div>

                    {/* + New Button */}
                    <button
                      type="button"
                      onClick={handleStartNewJobNote}
                      disabled={draftJobNote !== null}
                      className="text-xs font-bold text-[#be4646] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New</span>
                    </button>
                  </div>

                  {/* Job Calls & Notes Table */}
                  <div className="overflow-x-auto border-t border-b border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold">
                          <th className="py-2.5 pr-4 text-slate-700 w-36 whitespace-nowrap">User</th>
                          <th className="py-2.5 px-4 text-slate-700 font-semibold w-44 whitespace-nowrap">Date/Time</th>
                          <th className="py-2.5 pl-4 text-slate-700">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {/* Existing Saved Note Rows in Chronological Order */}
                        {displayJobCallsNotes.length === 0 && !draftJobNote && (
                          <tr>
                            <td colSpan={3} className="py-3 text-slate-400 italic">
                              There are no calls or notes for this job at this time.
                            </td>
                          </tr>
                        )}
                        {displayJobCallsNotes.map((entry) => (
                          <tr key={entry.id} className="bg-white group hover:bg-slate-50">
                            <td className="py-3 pr-4 font-semibold text-slate-800 whitespace-nowrap">
                              {entry.user}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {entry.dateTime}
                            </td>
                            <td className="py-3 pl-4 text-slate-800">
                              <div className="flex items-center justify-between gap-2">
                                <span>{entry.notes}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setJobCallsNotes((prev) => prev.filter((n) => n.id !== entry.id))
                                  }
                                  title="Delete Note"
                                  className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* Inline Editable Draft Row at Bottom */}
                        {draftJobNote && (
                          <tr className="bg-slate-50/80">
                            <td className="py-2 pr-4 font-semibold text-slate-800 whitespace-nowrap align-middle">
                              {draftJobNote.user}
                            </td>
                            <td className="py-2 px-4 text-slate-600 whitespace-nowrap align-middle">
                              {draftJobNote.dateTime}
                            </td>
                            <td className="py-2 pl-4">
                              <input
                                autoFocus
                                type="text"
                                value={draftJobNote.text}
                                onChange={(e) =>
                                  setDraftJobNote((prev) =>
                                    prev ? { ...prev, text: e.target.value } : null
                                  )
                                }
                                className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Cancel and Save Action Buttons below table when draft row is active */}
                  {draftJobNote && (
                    <div className="flex items-center justify-end gap-2.5 pt-1 animate-in fade-in duration-100">
                      <button
                        type="button"
                        onClick={handleCancelJobNote}
                        className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveJobNote}
                        disabled={!draftJobNote.text.trim()}
                        className="h-8 px-6 bg-[#be4646] hover:bg-[#a63a3a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Section 2: Other Calls & Notes for this Location */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-800">
                        <span>Other Calls & Notes for this Location ({locationCallsNotes.length + (draftLocationNote ? 1 : 0)})</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartNewLocationNote}
                        disabled={draftLocationNote !== null}
                        className="text-xs font-bold text-[#be4646] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>New</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto border-t border-b border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-700">
                            <th className="py-2.5 pr-4 w-36 whitespace-nowrap">User</th>
                            <th className="py-2.5 px-4 w-44 whitespace-nowrap">Date/Time</th>
                            <th className="py-2.5 pl-4">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {locationCallsNotes.length === 0 && !draftLocationNote && (
                            <tr>
                              <td colSpan={3} className="py-3 text-slate-400 italic">
                                There are no Other Notes for this location
                              </td>
                            </tr>
                          )}

                          {locationCallsNotes.map((entry) => (
                            <tr key={entry.id} className="bg-white">
                              <td className="py-3 pr-4 font-semibold text-slate-800 whitespace-nowrap">
                                {entry.user}
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                {entry.dateTime}
                              </td>
                              <td className="py-3 pl-4 text-slate-800">{entry.notes}</td>
                            </tr>
                          ))}

                          {/* Inline Editable Draft Row at Bottom for Location Note */}
                          {draftLocationNote && (
                            <tr className="bg-slate-50/80">
                              <td className="py-2 pr-4 font-semibold text-slate-800 whitespace-nowrap align-middle">
                                {draftLocationNote.user}
                              </td>
                              <td className="py-2 px-4 text-slate-600 whitespace-nowrap align-middle">
                                {draftLocationNote.dateTime}
                              </td>
                              <td className="py-2 pl-4">
                                <input
                                  autoFocus
                                  type="text"
                                  value={draftLocationNote.text}
                                  onChange={(e) =>
                                    setDraftLocationNote((prev) =>
                                      prev ? { ...prev, text: e.target.value } : null
                                    )
                                  }
                                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Cancel and Save Action Buttons below table when draft location row is active */}
                    {draftLocationNote && (
                      <div className="flex items-center justify-end gap-2.5 pt-1 animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={handleCancelLocationNote}
                          className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveLocationNote}
                          disabled={!draftLocationNote.text.trim()}
                          className="h-8 px-6 bg-[#be4646] hover:bg-[#a63a3a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 2: Checklists (Section title removed, PDF/Email buttons removed)
                 ======================================================== */}
              {activeSummaryTab === 'checklists' && (
                <div className="space-y-3">
                  {/* Top Action: + New button aligned right (Section title removed) */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => showToast('New Checklist form opened')}
                      className="text-xs font-bold text-[#be4646] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New</span>
                    </button>
                  </div>

                  {/* Checklists Table (No PDF/Email buttons, only Delete) */}
                  <div className="overflow-x-auto border-t border-b border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-700">
                          <th className="py-2.5 pr-4">Checklist Name</th>
                          <th className="py-2.5 px-4 text-center"># of Items Complete</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 pl-4 text-right w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {displayChecklists.map((chk: any) => (
                          <tr key={chk.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="py-3 pr-4 font-semibold text-[#be4646]">
                              <button
                                type="button"
                                onClick={() => setSelectedChecklistForModal(chk)}
                                className="hover:underline text-left cursor-pointer font-bold"
                              >
                                {chk.name}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 font-medium">{chk.itemsCompleted}</td>
                            <td className="py-3 px-4 text-center text-slate-600 font-medium">{chk.status}</td>
                            <td className="py-3 pl-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChecklists((prev) => prev.filter((c) => c.id !== chk.id));
                                    showToast('Checklist removed');
                                  }}
                                  title="Delete Checklist"
                                  className="hover:text-red-600 p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 3: Equipment (Added during appts/job)
                 ======================================================== */}
              {activeSummaryTab === 'equipment' && (
                <div className="space-y-4">
                  {/* Top Bar: Header + + Add Equipment Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">
                      <span>Job Equipment ({equipmentList.length})</span>
                    </div>

                    {/* + Add Equipment Button */}
                    <button
                      type="button"
                      onClick={() => setShowAddEquipmentModal(true)}
                      className="text-xs font-bold text-[#be4646] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Add Equipment</span>
                    </button>
                  </div>

                  {equipmentList.length === 0 ? (
                    <div className="bg-[#f0f7ff] border border-[#d0e3ff] rounded-lg p-6 text-center">
                      <p className="text-xs text-slate-700 font-medium">No equipment is registered at this location at this time.</p>
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
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {equipmentList.map((eq) => (
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
                              <td className="p-2.5 text-emerald-700 font-semibold">{eq.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  TAB 4: Attachments (Thumbnails + Filenames Only & Functional Upload/Download)
                 ======================================================== */}
              {activeSummaryTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Top Bar: Attachments Title + Upload + Download All Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">Job Attachments ({attachments.length})</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Hidden File Input for Real Uploads */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        className="hidden"
                      />

                      {/* Functional Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload</span>
                      </button>

                      {/* Download All Attachments into a Single Folder (.zip) */}
                      <button
                        type="button"
                        onClick={handleDownloadAllAttachments}
                        disabled={isDownloadingZip || attachments.length === 0}
                        className="px-3.5 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] disabled:bg-slate-300 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title={`Download all attachments as "${job.jobNumber}attachments.zip"`}
                      >
                        {isDownloadingZip ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Zipping...</span>
                          </>
                        ) : (
                          <>
                            <FolderDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Download All ({attachments.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Evenly Spaced Row of Thumbnails */}
                  {attachments.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-300 rounded-lg text-center space-y-2 bg-slate-50">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">No attachments uploaded yet</p>
                      <p className="text-[11px] text-slate-400">Click &quot;Upload&quot; above to add inspection photos or diagnostic PDFs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="bg-white border border-slate-200 rounded-lg overflow-visible shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative"
                        >
                          {/* Thumbnail Visual Container (Click opens preview) */}
                          <div
                            onClick={() => {
                              if (att.url || att.type === 'image') {
                                setPreviewAttachment(att);
                              } else {
                                showToast(`Document: ${att.name}`);
                              }
                            }}
                            className="h-32 bg-slate-100 rounded-t-lg relative flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer group"
                            title={`Click to preview ${att.name}`}
                          >
                            {/* Actual Image if available */}
                            {att.type === 'image' && att.url ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : att.type === 'image' ? (
                              <div className="w-full h-full bg-linear-to-br from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center p-3">
                                <div className="p-3 bg-white/90 rounded-full shadow-2xs group-hover:scale-110 transition-transform">
                                  <ImageIcon className="w-7 h-7 text-[#2d82b7]" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-linear-to-br from-red-50 via-slate-50 to-red-50/40 flex items-center justify-center p-3">
                                <div className="p-3 bg-white/90 rounded-full shadow-2xs group-hover:scale-110 transition-transform">
                                  <FileText className="w-7 h-7 text-red-600" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Thumbnail Details Card Footer: Left-aligned Filename + Right-aligned (...) button */}
                          <div className="p-2.5 flex items-center justify-between gap-1.5 relative bg-white rounded-b-lg">
                            <span
                              className="font-semibold text-xs text-slate-800 truncate text-left flex-1 cursor-pointer hover:text-[#be4646] transition-colors"
                              title={att.name}
                              onClick={() => {
                                if (att.url || att.type === 'image') {
                                  setPreviewAttachment(att);
                                }
                              }}
                            >
                              {att.name}
                            </span>

                            {/* (...) More Actions Menu */}
                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                              <MenuTrigger>
                                <MenuButton
                                  variant="icon"
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  aria-label="Attachment options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </MenuButton>
                                <Menu placement="bottom end">
                                  <MenuItem onAction={() => handleDownloadSingleAttachment(att)}>
                                    <Download className="w-3.5 h-3.5 text-[#be4646]" />
                                    <span>Download</span>
                                  </MenuItem>
                                  <MenuItem onAction={() => setPreviewAttachment(att)}>
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Preview</span>
                                  </MenuItem>
                                  <MenuSeparator />
                                  <MenuItem
                                    variant="danger"
                                    onAction={() => {
                                      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
                                      showToast(`Removed ${att.name}`);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    <span>Delete</span>
                                  </MenuItem>
                                </Menu>
                              </MenuTrigger>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Standalone Floating Yellow Alert Banner Below Job Summary Module */}
      {pinnedAlertNote && (
        <div className="bg-[#fef8e7] border border-[#f5e6b8] rounded-md px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 fill-[#b8860b] text-[#b8860b] shrink-0" />
            <div className="font-semibold leading-relaxed space-y-0.5">
              {pinnedAlertNote.split('\n').map((line, idx) => {
                const parts = line.split(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                return (
                  <div key={idx}>
                    {parts.map((p, pIdx) =>
                      p.includes('@') ? (
                        <span key={pIdx} className="text-[#be4646] font-bold">
                          {p}
                        </span>
                      ) : (
                        <span key={pIdx}>{p}</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPinnedAlertNote(null)}
            className="text-amber-700/60 hover:text-amber-900 p-0.5 rounded cursor-pointer transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. FOUR RED ACCORDION SECTIONS (Unexpanded by default, matching screenshot structure) */}
      <div className="space-y-4 pt-2">
        {/* ========================================================
            CATEGORY 1: Appointments & Service Requests (Populated matching Screenshot 1!)
           ======================================================== */}
        <div id="section-appointments" className="space-y-3">
          <button
            type="button"
            onClick={() => toggleSection('appointments')}
            className="flex items-center gap-1.5 text-base font-bold text-[#a82e2e] hover:text-[#8f2525] cursor-pointer transition-colors"
          >
            <span>Appointments & Service Requests</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSections.includes('appointments') ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.includes('appointments') && (
            <div className="space-y-6 pl-1 animate-in fade-in duration-150 text-xs">
              {/* Sub-item: Appointments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    Appointments ({jobAppointments.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApptForEdit(null);
                      setAppointmentScheduleMode('schedule');
                      setActiveModal('new-appointment');
                    }}
                    className="text-xs font-bold text-[#be4646] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>New</span>
                  </button>
                </div>

                {jobAppointments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">There are no appointments at this time.</p>
                ) : (
                  <div className="space-y-3">
                    {jobAppointments.map((appt: any) => {
                      const { dateStr, timeWindowStr, durationStr } = formatAppointmentSchedule(appt);
                      return (
                      <div key={appt.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        {/* Top Bar of Appointment Card with date in black and time in gray matching screenshot */}
                        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs font-normal flex items-center">
                            <span className="text-slate-900 font-semibold">{dateStr}</span>
                            <span className="text-slate-500 font-normal ml-2">{timeWindowStr}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-[#5bc0de] text-white font-semibold text-xs px-3.5 py-1 rounded shadow-2xs">
                              {appt.status || 'Scheduled'}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedApptForEdit(appt);
                                setActiveModal('edit-appointment');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Edit Appointment"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (deleteAppointment) {
                                  await deleteAppointment(appt.id);
                                }
                                showToast('Appointment removed.');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                              title="Remove Appointment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Table of Technicians */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-700 font-bold">
                              <tr>
                                <th className="px-3 py-2.5 whitespace-nowrap">Technicians</th>
                                <th className="px-3 py-2.5 whitespace-nowrap">Scheduled</th>
                                <th className="px-3 py-2.5 whitespace-nowrap">Actual</th>
                                <th className="px-3 py-2.5 whitespace-nowrap">
                                  Job Time <span className="text-slate-400 font-normal cursor-help">ⓘ</span>
                                </th>
                                <th className="px-3 py-2.5 whitespace-nowrap">Tech Status</th>
                                <th className="px-3 py-2.5 whitespace-nowrap">Tags</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                              <tr className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-3 font-semibold text-[#be4646] whitespace-nowrap">
                                  <Link href="/schedule" className="hover:underline">
                                    {appt.assignedTech || appt.primaryTech || appt.technician || 'Unassigned'}
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                                  {timeWindowStr.replace(/\s*CDT|EDT/gi, '')}
                                </td>
                                <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{appt.hoursWorked || appt.actualTime || 'N/A'}</td>
                                <td className="px-3 py-3 text-slate-500 whitespace-nowrap ">{computeJobElapsedTime(appt)}</td>
                                <td className="px-3 py-3 font-semibold text-[#be4646] whitespace-nowrap">{appt.techStatus || appt.status || 'Idle'}</td>
                                <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{appt.tags || ''}</td>
                              </tr>
                              {appt.additionalTech &&
                                appt.additionalTech.trim() !== '' &&
                                appt.additionalTech.toLowerCase() !== 'user' &&
                                appt.additionalTech.toLowerCase() !== (appt.assignedTech || appt.primaryTech || appt.technician || '').toLowerCase() && (
                                <tr className="bg-white hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-3 font-semibold text-[#be4646] whitespace-nowrap">
                                    <Link href="/schedule" className="hover:underline">
                                      {appt.additionalTech}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                                    {timeWindowStr.replace(/\s*CDT|EDT/gi, '')}
                                  </td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">N/A</td>
                                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap ">(00:00:00)</td>
                                  <td className="px-3 py-3 font-semibold text-[#be4646] whitespace-nowrap">Idle</td>
                                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap"></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </div>

              {/* Sub-item: Service Requests */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    Service Requests ({jobServiceRequests.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApptForEdit(null);
                      setAppointmentScheduleMode('request');
                      setActiveModal('new-appointment');
                    }}
                    className="text-xs font-bold text-[#be4646] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>New</span>
                  </button>
                </div>

                {jobServiceRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    There are no service requests at this time.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {jobServiceRequests.map((sr: any) => {
                      const dur = sr.expectedDurationHours || sr.durationHours || 1;
                      return (
                        <div key={sr.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs font-normal flex items-center gap-2">
                              <span className="text-slate-900 font-semibold">{sr.jobType || 'Service Request'}</span>
                              <span className="text-slate-500 font-normal">Expected Length: {dur}:00 hrs</span>
                              {sr.minSkillLevel && (
                                <span className="text-slate-500 font-normal">Min. Skill Level: {sr.minSkillLevel}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="bg-amber-500 text-white font-semibold text-xs px-3.5 py-1 rounded shadow-2xs">
                                Unscheduled
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApptForEdit(sr);
                                  setAppointmentScheduleMode('request');
                                  setActiveModal('edit-appointment');
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit Service Request"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (deleteAppointment) {
                                    await deleteAppointment(sr.id);
                                  }
                                  showToast('Service Request removed.');
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove Service Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50/50 text-xs text-slate-600 space-y-1">
                            <div><span className="font-semibold text-slate-700">Location:</span> {sr.locationAddress || ''}</div>
                            {sr.serviceNotes && (
                              <div><span className="font-semibold text-slate-700">Notes:</span> {sr.serviceNotes}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            CATEGORY 2: Proposals & Financing
           ======================================================== */}
        <div id="section-proposals" className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => toggleSection('proposals')}
            className="flex items-center gap-1.5 text-base font-bold text-[#a82e2e] hover:text-[#8f2525] cursor-pointer transition-colors"
          >
            <span>Proposals & Financing</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSections.includes('proposals') ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.includes('proposals') && (
            <div className="space-y-4 pl-1 animate-in fade-in duration-150">
              {/* Sub-item: Proposals */}
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Proposals ({jobProposals.length})</span>
                  <div className="flex items-center gap-3 text-xs font-bold text-[#be4646]">
                    <Link
                      href="/jobs/proposal-list"
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New</span>
                    </Link>
                  </div>
                </div>
                {jobProposals.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    There are no proposals for this job at this time.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg mt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[#be4646]">
                        <tr>
                          <th className="px-3 py-2.5 whitespace-nowrap">Proposal #</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Issue Date</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                        {jobProposals.map((p: any) => (
                          <tr key={p.id} className="bg-white">
                            <td className="px-3 py-3 font-semibold text-[#be4646] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingPdfProposal(p)}
                                  className="text-[#be4646] font-semibold hover:underline cursor-pointer text-left"
                                  title="View PDF Proposal"
                                >
                                  {p.proposalNumber || p.id}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingPdfProposal(p)}
                                  className="cursor-pointer text-[#be4646] hover:opacity-80 transition-opacity shrink-0"
                                  title="View PDF Proposal"
                                >
                                  <AdobePdfIcon className="w-3.5 h-3.5 shadow-2xs rounded-xs" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.issueDate || p.createdAt?.slice(0, 10) || 'N/A'}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{p.status || 'Draft'}</td>
                            <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                              ${((typeof p.total === 'number' ? p.total : parseFloat(p.total || p.amount || p.totalAmount || p.options?.[0]?.total || '0') || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-item: Financing (0) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Financing (0)</span>
                  <button
                    type="button"
                    onClick={() => showToast('New loan application')}
                    className="text-xs font-bold text-[#be4646] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>New Loan</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 italic">
                  There are no financial applications for this job at this time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            CATEGORY 3: Invoices & Payments (Populated with matching screenshot layout!)
           ======================================================== */}
        <div id="section-invoices" className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => toggleSection('invoices')}
            className="flex items-center gap-1.5 text-base font-bold text-[#a82e2e] hover:text-[#8f2525] cursor-pointer transition-colors"
          >
            <span>Invoices & Payments</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSections.includes('invoices') ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.includes('invoices') && (
            <div className="space-y-6 pl-1 animate-in fade-in duration-150 text-xs">
              {/* Sub-section 1: Invoices */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    Invoices ({jobInvoices.length})
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold text-[#be4646]">
                    <Link
                      href="/jobs/invoice-list"
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>New</span>
                    </Link>
                  </div>
                </div>

                {/* Invoices Table */}
                {jobInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">There are no invoices for this job at this time.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[#be4646]">
                        <tr>
                          <th className="px-3 py-2.5 whitespace-nowrap">Invoice #</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Issue Date</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Last Modified</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Bill To Customer</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Invoice Status</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Payment Status</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Amount</th>
                          <th className="px-3 py-2.5 text-center w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                        {jobInvoices.map((inv: any) => (
                          <tr key={inv.id} className="bg-white">
                            <td className="px-3 py-3 font-bold text-[#be4646] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingPdfInvoice(inv)}
                                  className="text-[#be4646] font-bold hover:underline cursor-pointer text-left"
                                  title="View PDF Invoice"
                                >
                                  {inv.invoiceNumber || inv.id}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingPdfInvoice(inv)}
                                  className="cursor-pointer text-[#be4646] hover:opacity-80 transition-opacity shrink-0"
                                  title="View PDF Invoice"
                                >
                                  <AdobePdfIcon className="w-3.5 h-3.5 shadow-2xs rounded-xs" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{inv.issueDate || inv.date || 'N/A'}</td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{inv.lastModified || inv.updatedAt?.slice(0, 10) || 'N/A'}</td>
                            <td className="px-3 py-3 text-slate-800 font-medium whitespace-nowrap">{inv.billToCustomer || job.customerName}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{inv.invoiceStatus || inv.status || 'Closed'}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{inv.paymentStatus || 'Unpaid'}</td>
                            <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">${(typeof inv.total === 'number' ? inv.total : parseFloat(inv.total || inv.amount || inv.totalAmount || '0') || 0).toFixed(2)}</td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => setViewingPdfInvoice(inv)}
                                  className="cursor-pointer hover:text-slate-600"
                                  title="View PDF"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <Send className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-section 2: Payments & Credits */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    Payments & Credits ({jobPayments.length})
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold text-[#be4646]">
                    <Link
                      href="/payment-options/payments/process-payment"
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Process Payment</span>
                    </Link>
                    <Link
                      href="/jobs/payment-list"
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Record Payment</span>
                    </Link>
                  </div>
                </div>

                {/* Payments & Credits Table */}
                {jobPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">There are no payments for this job at this time.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[#be4646]">
                        <tr>
                          <th className="px-3 py-2.5 whitespace-nowrap">Payer Name</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              Date <span className="text-[10px]">▲</span>
                            </span>
                          </th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Type</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Method</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Amount</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Invoice #</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Amount Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                        {jobPayments.map((pay: any) => (
                          <tr key={pay.id} className="bg-white">
                            <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">{pay.payerName || pay.customerName || job.customerName}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{pay.date || pay.paymentDate || 'N/A'}</td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{pay.type || pay.paymentType || 'Processed'}</td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{pay.method || pay.paymentMethod || 'Credit Card'}</td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{pay.status || pay.paymentStatus || 'Settled'}</td>
                            <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">${(typeof pay.amount === 'number' ? pay.amount : parseFloat(pay.amount || pay.total || '0') || 0).toFixed(2)}</td>
                            <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">{pay.invoiceNumber || 'N/A'}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">${(typeof pay.amountApplied === 'number' ? pay.amountApplied : parseFloat(pay.amountApplied || pay.amount || '0') || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          TOP ACTION MODALS
         ======================================================== */}

      {/* 1. Shared Edit Follow Up Flag Modal */}
      <EditFollowUpFlagModal
        job={activeModal === 'flag-modal' ? job : null}
        isOpen={activeModal === 'flag-modal'}
        onClose={() => setActiveModal(null)}
        onSave={async (updatedData) => {
          const isComplete = updatedData.isFlagComplete;
          setJob((prev) => ({
            ...prev,
            isFlagged: !isComplete,
            followUpType: updatedData.followUpType,
            assignee: updatedData.assignee,
            dueDate: updatedData.dueDate,
            isFlagComplete: isComplete,
            notes: updatedData.notes,
          }));

          const flagDoc: CanonicalFollowUpFlag = {
            id: `flag-${job.id}`,
            jobId: job.id,
            jobNumber: parseInt(job.jobNumber.replace(/[^0-9]/g, ''), 10) || 134100,
            customerId: job.customerId || 'cust-1',
            customerName: job.customerName || '',
            followUpType: (updatedData.followUpType as any) || 'Part Quote',
            reason: updatedData.notes?.[0]?.text || 'Follow up required',
            assignedTo: updatedData.assignee || 'Alex Reynolds',
            dueDate: updatedData.dueDate || '2026-08-20',
            isComplete: !!updatedData.isFlagComplete,
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

          // Sync Job Calls & Notes with any updated/added notes
          if (updatedData.notes && updatedData.notes.length > 0) {
            const latestNote = updatedData.notes[updatedData.notes.length - 1];
            setJobCallsNotes((prev) => {
              const existingIndex = prev.findIndex((n) => n.hasFlag);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  notes: latestNote.text,
                  lastModified: '8/14/2026',
                  hasFlag: !isComplete,
                };
                return updated;
              } else {
                return [
                  {
                    id: `n-${Date.now()}`,
                    type: 'Job',
                    hasFlag: !isComplete,
                    createdDate: '8/14/2026',
                    lastModified: '8/14/2026',
                    notes: latestNote.text,
                  },
                  ...prev,
                ];
              }
            });
          }
          setActiveModal(null);
          showToast(isComplete ? 'Follow up marked complete!' : 'Follow up flag updated successfully!');
        }}
        onRemoveFlag={async () => {
          setJob((prev) => ({
            ...prev,
            isFlagged: false,
            followUpType: undefined,
            assignee: undefined,
            dueDate: undefined,
            isFlagComplete: true,
          }));
          setJobCallsNotes((prev) =>
            prev.map((n) => (n.hasFlag ? { ...n, hasFlag: false } : n))
          );

          const flagDoc: CanonicalFollowUpFlag = {
            id: `flag-${job.id}`,
            jobId: job.id,
            jobNumber: parseInt(job.jobNumber.replace(/[^0-9]/g, ''), 10) || 134100,
            customerId: job.customerId || 'cust-1',
            customerName: job.customerName || '',
            followUpType: (job.followUpType as any) || 'Need Quote/Autho',
            reason: '',
            assignedTo: job.assignee || 'Alex Reynolds',
            dueDate: job.dueDate || new Date().toISOString(),
            isComplete: true,
            completedAt: new Date().toISOString(),
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveFollowUp(flagDoc);

          setActiveModal(null);
          showToast('Follow up flag removed.');
        }}
      />

      {/* 2. Cannot Delete Modal (Matches WEX screenshot exactly) */}
      {activeModal === 'cannot-delete' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#f5f5f5] px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-[#555555]">Cannot Delete</h3>
            </div>

            {/* Modal Body with Centered Light Lavender Box */}
            <div className="p-6 bg-white flex items-center justify-center">
              <div className="bg-[#eeedf5] border border-[#e0dde9] rounded-md p-6 w-full text-center">
                <p className="text-xs text-[#484257] font-normal leading-relaxed">
                  You may not delete this job until you have removed all active notes, payments, appointments, service requests, proposals, invoices, purchase orders, proposal comparisons, and checklists.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#f5f5f5] px-5 py-3 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium px-5 py-1.5 rounded shadow-2xs transition-colors cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. Delete Confirmation Modal (When all conditions are met) */}
      {activeModal === 'delete-confirm' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#f5f5f5] px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#555555]">Delete Confirmation</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 bg-white space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed">
                Are you sure you want to delete Job <span className="font-bold text-slate-900">#{job.jobNumber}</span> for <span className="font-bold text-slate-900">{job.customerName}</span>? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#f5f5f5] px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingJob}
                onClick={() => setActiveModal(null)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded shadow-2xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingJob}
                onClick={handleDeleteJob}
                className="bg-[#be4646] hover:bg-[#a63a3a] disabled:opacity-50 text-white text-xs font-bold px-5 py-1.5 rounded shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {isDeletingJob ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Real Prepopulated Appointment Modal (Shared with Schedule module) */}
      <UpdateAppointmentModal
        isOpen={activeModal === 'edit-appointment' || activeModal === 'new-appointment'}
        onClose={() => {
          setActiveModal(null);
          setSelectedApptForEdit(null);
        }}
        customer={{
          id: job.customerId,
          name: job.customerName,
          phone: job.phone,
          email: job.email,
          address: job.address.cityStateZip && !job.address.street.includes(job.address.cityStateZip)
            ? `${job.address.street}, ${job.address.cityStateZip}`
            : job.address.street,
          locations: Array.isArray((directCustomer as any)?.locations)
            ? (directCustomer as any).locations.map((l: any) => typeof l === 'string' ? l : `${l.street || ''}${l.addressLine2 ? ` ${l.addressLine2}` : ''}, ${l.city || ''}, ${l.state || 'FL'} ${l.zipCode || ''}`)
            : undefined,
          balance: '$0.00',
        }}
        editingJobId={activeModal === 'new-appointment' ? null : job.id}
        editingAppointmentId={activeModal === 'new-appointment' ? undefined : selectedApptForEdit?.id}
        initialValues={
          activeModal === 'new-appointment'
            ? {
                scheduleMode: appointmentScheduleMode,
                appointmentStatus: appointmentScheduleMode === 'request' ? 'Unscheduled' : 'Scheduled',
                assignLater: appointmentScheduleMode === 'request',
                frequency: 'one time',
                primaryTech: '',
                startTime: '08:00',
                endTime: '09:00',
                appointmentDate: formatEasternDate(new Date()),
                appointmentConfirmation: 'Not Confirmed',
                jobType: '',
                callNotes: '',
                locationAddress:
                  job.address.cityStateZip && !job.address.street.includes(job.address.cityStateZip)
                    ? `${job.address.street}, ${job.address.cityStateZip}`
                    : job.address.street,
              }
            : (() => {
                const parsedTimes = extractLiveApptTimes(selectedApptForEdit);
                const isReq =
                  selectedApptForEdit?.scheduleMode === 'request' ||
                  selectedApptForEdit?.isScheduled === false ||
                  selectedApptForEdit?.status === 'Unscheduled';
                return {
                  id: selectedApptForEdit?.id,
                  jobNumber: job.jobNumber,
                  jobType: selectedApptForEdit?.jobType || job.jobType,
                  startTime: parsedTimes.startTime,
                  endTime: parsedTimes.endTime,
                  appointmentDate: parsedTimes.appointmentDate,
                  frequency: selectedApptForEdit?.frequency || 'one time',
                  primaryTech:
                    selectedApptForEdit?.assignedTech ||
                    selectedApptForEdit?.primaryTech ||
                    selectedApptForEdit?.technician ||
                    '',
                  additionalTech: selectedApptForEdit?.additionalTech || '',
                  additionalTechs: selectedApptForEdit?.additionalTechs || (selectedApptForEdit?.technicians && selectedApptForEdit.technicians.length > 1 ? selectedApptForEdit.technicians.slice(1) : undefined),
                  technicians: selectedApptForEdit?.technicians,
                  assignLater: isReq ? true : false,
                  appointmentStatus: (selectedApptForEdit?.status as any) || (isReq ? 'Unscheduled' : 'Scheduled'),
                  appointmentConfirmation: 'Confirmed',
                  scheduleMode: isReq ? 'request' : 'schedule',
                  callNotes: selectedApptForEdit?.serviceNotes || selectedApptForEdit?.callNotes || '',
                  locationAddress: selectedApptForEdit?.locationAddress,
                };
              })()
        }
        onSave={(savedData) => {
          if (savedData.appointmentStatus) {
            setAppointmentStatus(savedData.appointmentStatus as any);
          }
          if (savedData.primaryTech) {
            const startH = savedData.startTime || '14:00';
            const endH = savedData.endTime || '16:00';

            const format12h = (t24: string) => {
              const [hStr, mStr] = t24.split(':');
              let h = parseInt(hStr, 10);
              const ampm = h >= 12 ? 'pm' : 'am';
              h = h % 12;
              if (h === 0) h = 12;
              return `${h}:${mStr || '00'} ${ampm}`;
            };

            const timeRange = `${format12h(startH)} - ${format12h(endH)}`;

            const techs = [
              {
                id: 'tech-1',
                name: savedData.primaryTech,
                scheduledTime: timeRange,
                actual: 'N/A',
                jobTime: '(00:00:00)',
                techStatus: 'Idle',
                tags: '',
              },
            ];
            if (savedData.additionalTech && savedData.additionalTech !== 'None' && savedData.additionalTech !== '') {
              techs.push({
                id: 'tech-2',
                name: savedData.additionalTech,
                scheduledTime: timeRange,
                actual: 'N/A',
                jobTime: '(00:00:00)',
                techStatus: 'Idle',
                tags: '',
              });
            }
            setAppointmentTechnicians(techs);
          }
          if (savedData.location) {
            const parts = savedData.location.split(',');
            const street = parts[0]?.trim() || savedData.location;
            const cityStateZip = parts.slice(1).join(',').trim() || '';
            setJob((prev) => ({
              ...prev,
              address: {
                ...prev.address,
                locationName: savedData.location || '',
                street,
                cityStateZip,
              },
            }));
          }
          if (savedData.jobType) {
            setJob((prev) => ({ ...prev, jobType: savedData.jobType || prev.jobType }));
          }
          setActiveModal(null);
          showToast('Appointment updated successfully!');
        }}
        onUnschedule={() => {
          setAppointmentStatus('Unscheduled');
          setAppointmentTechnicians([]);
          setActiveModal(null);
          showToast('Appointment converted to Unscheduled Service Request.');
        }}
        onCancelAppointment={(_id, cancelAllPast) => {
          setAppointmentStatus('Cancelled');
          setActiveModal(null);
          showToast(cancelAllPast ? 'All appointments for this job marked as Cancelled.' : 'Appointment marked as Cancelled.');
        }}
        onDeleteAppointment={() => {
          setAppointmentStatus('Unscheduled');
          setAppointmentTechnicians([]);
          setActiveModal(null);
          showToast('Appointment deleted.');
        }}
      />

      {/* 5. Attachment Preview Modal / Lightbox */}
      {previewAttachment && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl w-full animate-in zoom-in-95 duration-150 relative text-xs font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewAttachment.type === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                ) : (
                  <FileText className="w-4 h-4 text-red-400" />
                )}
                <span className="font-bold text-xs">{previewAttachment.name}</span>
                <span className="text-[10px] text-slate-400">({previewAttachment.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleAttachment(previewAttachment)}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-xs"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[75vh] overflow-auto">
              {previewAttachment.type === 'image' && previewAttachment.url ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-16 h-16 text-red-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">{previewAttachment.name}</p>
                  <p className="text-xs text-slate-400">Document / PDF Attachment</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingleAttachment(previewAttachment)}
                    className="px-4 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Document</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. View & Edit Checklist Modal (Matching WEX screenshot) */}
      <ViewChecklistModal
        isOpen={!!selectedChecklistForModal}
        onClose={() => setSelectedChecklistForModal(null)}
        checklist={selectedChecklistForModal}
        onSave={(updatedChecklist) => {
          setChecklists((prev) =>
            prev.map((chk) => (chk.id === updatedChecklist.id ? updatedChecklist : chk))
          );
          setSelectedChecklistForModal(null);
          showToast(`Checklist "${updatedChecklist.name}" saved!`);
        }}
      />

      {/* 7. Edit Location Modal (Matching Screenshot) */}
      {activeModal === 'edit-location' && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-xs font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Edit Location</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 bg-white">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] shadow-2xs font-medium cursor-pointer"
              >
                {mockCustomerSavedLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  const parts = selectedLocation.split(',');
                  const street = parts[0]?.trim() || selectedLocation;
                  const cityStateZip = parts.slice(1).join(',').trim() || '';
                  setJob((prev) => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      locationName: selectedLocation,
                      street,
                      cityStateZip,
                    },
                  }));
                  setActiveModal(null);
                  showToast('Location updated!');
                }}
                className="px-6 py-2 bg-[#be4646] hover:bg-[#a63a3a] text-white font-bold rounded text-xs shadow-2xs cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Shared New Note Modal with Bell Pin button & tooltip */}
      <NewNoteModal
        isOpen={activeModal === 'new-note'}
        onClose={() => setActiveModal(null)}
        locations={[
          `${job.address.street}, ${job.address.cityStateZip}`,
          ...mockCustomerSavedLocations,
        ]}
        defaultLocation={`${job.address.street}, ${job.address.cityStateZip}`}
        onSave={(data) => {
          const newEntry = {
            id: `jn-${Date.now()}`,
            user: currentUser?.name || 'Staff',
            dateTime: '8/14/2026, 10:25 pm',
            notes: data.text,
          };
          setJobCallsNotes([newEntry, ...jobCallsNotes]);
          if (data.isPinned) {
            setPinnedAlertNote(data.text);
          }
          setActiveModal(null);
          showToast(data.isPinned ? 'Note pinned and saved successfully!' : 'Note added successfully!');
        }}
      />

      {/* 9. Add Equipment Modal for Job */}
      <AddEquipmentModal
        isOpen={showAddEquipmentModal}
        onClose={() => setShowAddEquipmentModal(false)}
        customer={{
          id: job.customerId,
          name: job.customerName,
          phone: job.phone,
          email: job.email,
        } as any}
        locations={[
          {
            id: 'job-loc',
            addr1: job.address.street,
            city: job.address.cityStateZip?.split(',')[0]?.trim() || '',
            state: 'FL',
            zipCode: job.address.cityStateZip?.split(',')[1]?.trim() || '',
          },
        ]}
        onSave={async (newEq) => {
          const eqRecord: any = {
            ...newEq,
            id: newEq.id || `eq-${Date.now()}`,
            customerId: job.customerId,
            customerName: job.customerName,
            locationStreet: job.address.street,
            locationAddress: `${job.address.street}, ${job.address.cityStateZip}`,
          };
          setJobAddedEquipment((prev) => [...prev, eqRecord]);
          setShowAddEquipmentModal(false);
          showToast(`Equipment "${eqRecord.name || eqRecord.equipmentName}" added to job!`);
        }}
      />

      {/* 10. Shared Official PDF Viewer Modal for Job Invoices */}
      {viewingPdfInvoice && (
        <PdfDocumentViewerModal
          isOpen={viewingPdfInvoice !== null}
          onClose={() => setViewingPdfInvoice(null)}
          documentType="Invoice"
          documentNumber={viewingPdfInvoice.invoiceNumber || viewingPdfInvoice.id}
          customerName={viewingPdfInvoice.customerName || job.customerName}
          billToCustomer={viewingPdfInvoice.billToCustomer || job.customerName}
          billingAddress={viewingPdfInvoice.billingAddress || job.address?.street}
          jobLocation={viewingPdfInvoice.jobLocation || job.address?.street}
          issueDate={viewingPdfInvoice.issueDate || viewingPdfInvoice.date}
          dueDate={viewingPdfInvoice.dueDate || viewingPdfInvoice.issueDate}
          lastModified={viewingPdfInvoice.lastModified}
          amount={`$${(typeof viewingPdfInvoice.total === 'number' ? viewingPdfInvoice.total : parseFloat(viewingPdfInvoice.total || viewingPdfInvoice.amount || '0') || 0).toFixed(2)}`}
          subtotal={viewingPdfInvoice.subtotal}
          tax={viewingPdfInvoice.taxAmount}
          total={viewingPdfInvoice.total}
          balanceDue={viewingPdfInvoice.balanceDue}
          jobNumber={String(viewingPdfInvoice.jobNumber || job.jobNumber)}
          status={viewingPdfInvoice.invoiceStatus || viewingPdfInvoice.status}
          paymentStatus={viewingPdfInvoice.paymentStatus || 'Unpaid'}
          paymentTerms={viewingPdfInvoice.paymentTerms || 'Due upon Receipt'}
          paymentsCredits={viewingPdfInvoice.payments}
          technician={viewingPdfInvoice.technician || job.assignee || 'Marcus Vance'}
          lineItems={viewingPdfInvoice.lineItems}
        />
      )}

      {/* 11. Shared Official PDF Viewer Modal for Job Proposals */}
      {viewingPdfProposal && (
        <PdfDocumentViewerModal
          isOpen={viewingPdfProposal !== null}
          onClose={() => setViewingPdfProposal(null)}
          documentType="Proposal"
          documentNumber={viewingPdfProposal.proposalNumber || viewingPdfProposal.id}
          customerName={viewingPdfProposal.customerName || job.customerName}
          billToCustomer={viewingPdfProposal.billToCustomer || job.customerName}
          jobLocation={viewingPdfProposal.jobLocation || viewingPdfProposal.locationAddress || job.address?.street}
          issueDate={viewingPdfProposal.issueDate || viewingPdfProposal.lastModified}
          lastModified={viewingPdfProposal.lastModified}
          amount={`$${(typeof viewingPdfProposal.total === 'number' ? viewingPdfProposal.total : parseFloat(viewingPdfProposal.total || viewingPdfProposal.amount || viewingPdfProposal.totalAmount || '0') || 0).toFixed(2)}`}
          jobNumber={String(viewingPdfProposal.jobNumber || job.jobNumber)}
          status={viewingPdfProposal.status}
          technician={viewingPdfProposal.technician || job.assignee || 'Alex Reynolds'}
        />
      )}
    </div>
  );
}
