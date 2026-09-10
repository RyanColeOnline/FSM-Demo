/**
 * Canonical Domain Interfaces for Maintenance Memberships and Contracts.
 */

export type CanonicalMaintenanceStatus =
  | 'Active'
  | 'Expired'
  | 'Pending Renewal'
  | 'Cancelled'
  | 'On Hold';

export interface CanonicalServiceWindow {
  id: string;
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'Bi-Annual' | string;
  windowStartDate?: string;
  windowEndDate?: string;
  dateRange?: string;
  jobSubtitle?: string;
  jobName?: string;
  jobNumber?: string;
  appointmentStatus?: 'Unscheduled' | 'Scheduled' | 'Completed' | string;
  windowNumber?: string; // e.g. "2 of 40"
  lastNotification?: string;
  beginningMonth?: string;
  endMonth?: string;
  isScheduled: boolean;
  isComplete?: boolean;
  appointmentId?: string | null;
  completedDate?: string | null;
  assignedTech?: string | null;
}

export interface CanonicalMaintenancePlan {
  id: string;
  customerId: string;
  customerNumber?: string;
  wexCustomerId?: string;
  customerName?: string;
  name: string; // e.g. "Hvac 1 system maintenance plan"
  status: CanonicalMaintenanceStatus | string;
  description: string;
  startDate: string;
  expiresDate: string;
  expirationDate?: string;
  contractTotal: number;
  annualPrice: number;
  balanceDue: number;
  paymentsApplied?: number;
  contractPrice?: string | number;
  contractBalance?: string | number;
  planPaymentStatus?: string;
  billingFrequency: 'Monthly' | 'Quarterly' | 'Bi-Annual' | 'Annual' | string;
  locationStreet: string;
  locationAddress?: string;
  locationId?: string;
  salesAgent?: string;
  accountName?: string;
  className?: string;
  collectTax?: boolean;
  taxGroup?: string;
  termsText?: string;
  termsAgreed?: boolean;
  customerSignature?: string;
  signatureType?: 'typed' | 'canvas';
  jobType?: string;
  includedVisitsTotal: number;
  includedVisitsRemaining: number;
  coveredEquipmentIds: string[];
  discountPercentage: number; // e.g. 15 for 15% discount
  serviceWindows: CanonicalServiceWindow[];
  sendReminders?: boolean;
  reminderRecipients?: Array<{ name: string; channel: 'Email' | 'Text' | string; destination?: string }>;
  paymentOption?: 'One-Time' | 'Not Now' | string;
  appliedAmount?: number;
  autoRenew: boolean;
  email?: string;
  phone?: string;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
