/**
 * Canonical Domain Interfaces for Job Checklists and Verification Workflows.
 */

export type ChecklistValueType =
  | 'boolean'
  | 'number'
  | 'text'
  | 'photo'
  | 'signature'
  | 'multiple_choice';

export interface CanonicalChecklistStep {
  id: string;
  title: string;
  description?: string | null;
  required: boolean;
  valueType: ChecklistValueType;
  options?: string[]; // For multiple choice
  unit?: string | null; // e.g. "PSI", "V", "A", "°F"
  value?: string | number | boolean | null;
  photoUrl?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface CanonicalChecklistTemplate {
  id: string;
  title: string;
  category: 'Appliance Inspection' | 'HVAC Startup & Commissioning' | 'Electrical Safety' | 'Pre-Installation Walkthrough' | 'Maintenance Tune-Up';
  dispatchGroup: string;
  version: number;
  steps: CanonicalChecklistStep[];
  isArchived?: boolean;
}

export interface CanonicalChecklistInstance {
  id: string;
  templateId: string;
  jobId: string;
  jobNumber?: number | null;
  customerId: string;
  appointmentId?: string | null;
  title: string;
  category: string;
  isCompleted: boolean;
  completedBy?: string | null;
  completedById?: string | null;
  completedAt?: string | null;
  steps: CanonicalChecklistStep[];
  signatureUrl?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
