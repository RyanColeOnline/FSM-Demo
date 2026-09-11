/**
 * Canonical Appointment & Job Domain Models for Murphy's FSM Platform.
 * Aligns 1:1 between Swift (apps/mobile) and TypeScript (apps/web).
 */

import { CanonicalAddress } from './customer';

export type CanonicalAppointmentStatus =
  | 'Unscheduled'
  | 'Unassigned'
  | 'Assigned'
  | 'Dispatched'
  | 'En route'
  | 'In progress'
  | 'Completed'
  | 'Cancelled'
  | 'On hold';

export interface CanonicalAccessCode {
  id: string;
  label: string;
  code: string;
  isDeleteRevealed?: boolean;
}

export interface CanonicalAppointment {
  id: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: number | string;
  appointmentId?: string;
  wexJobId?: string;
  appointmentSequenceNumber?: number;
  dateTime: string;
  durationHours?: number;
  status: CanonicalAppointmentStatus | string;
  isScheduled?: boolean;
  scheduleMode?: 'schedule' | 'request';
  isServiceRequest?: boolean;
  minSkillLevel?: number | string;
  expectedDurationHours?: number;
  jobType: string;
  jobCategory?: 'Appliance' | 'HVAC';
  jobName?: string;
  tripType?: string;
  colorHex?: string;
  designationOverride?: string | null;
  assignedTech?: string | null;
  assignedTechId?: string | null;
  technician?: string;
  technicians?: string[];
  userId?: string | null;
  isFlaggedForFollowUp?: boolean;
  isConfirmed?: boolean;
  confirmed?: boolean | string;
  accessCodes?: CanonicalAccessCode[];
  serviceNotes?: string | null;
  appointmentNote?: string | null;
  callNotes?: string | null;
  customerName?: string | null;
  customerNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  locationAddress?: string | null;
  location?: string | null;
  locationStreet?: string | null;
  appointmentDate?: string | null;
  appointmentDateTime?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  coverageZone?: string;
  type?: string;
  createdDate?: string;
  hoursScheduled?: string;
  hoursWorked?: string;
  tags?: string;
  arrivedAt?: string | null;
  completedAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  actualDurationHours?: number | null;
  summaryNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CanonicalJobStage =
  | 'Appointment'
  | 'Proposal'
  | 'Purchase Order'
  | 'Invoice'
  | 'Payment';

export interface CanonicalJob {
  id: string;
  jobNumber: string;
  wexJobId?: string;
  wexLegacyId?: string;
  qbJobId?: string;
  customerId: string;
  customerNumber?: string;
  customerName: string;
  isStarred?: boolean;
  address?: CanonicalAddress;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationZip?: string;
  phone?: string;
  email?: string | null;
  status: 'Opened' | 'Closed' | 'Abandoned';
  jobType: string;
  jobName?: string;
  jobPrice?: string;
  uncollected?: string;
  isFlagged?: boolean;
  followUpFlag?: string;
  followUpType?: string;
  followUpDate?: string;
  assignee?: string;
  dueDate?: string;
  isFlagComplete?: boolean;
  jobCreationDate?: string;
  isHistoricalArchive?: boolean;
  createdAt?: string;
  stage?: CanonicalJobStage;
  appointments?: CanonicalAppointment[];
  accessCodes?: CanonicalAccessCode[];
  jobDescription?: string;
  serviceNotes?: string;
  assignedTech?: string | null;
  createdBy?: string;
  invoicesTotal?: number;
  balance?: number;
}
