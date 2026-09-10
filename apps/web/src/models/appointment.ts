/**
 * Pure Appointment and Schedule Domain Models.
 */

export interface ScheduledJob {
  id: string;
  jobNumber: string;
  customer: string;
  phone?: string;
  addressStreet: string;
  addressCityStateZip: string;
  isFlagged?: boolean;
  isCompleted?: boolean;
  status?: 'Scheduled' | 'Missed' | 'In Progress' | 'Complete' | 'Incomplete';
  confirmed?: 'Confirmed' | 'Not Confirmed';
  startTime: string;
  endTime?: string;
  actualStartTime?: string;
  durationHours: number;
  actualDurationHours?: number;
  color?: string;
  dotColor: string;
  jobType?: string;
  technicians?: string[];
  callNotes?: string;
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
