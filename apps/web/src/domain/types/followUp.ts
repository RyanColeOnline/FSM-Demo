/**
 * Canonical Domain Interfaces for Follow-Up Flags.
 */

export interface CanonicalFlagNoteEntry {
  id: string;
  author: string;
  authorId?: string | null;
  text: string;
  timestamp: string;
}

export interface CanonicalFollowUpFlag {
  id: string;
  jobId: string;
  jobNumber: number;
  customerId: string;
  customerName: string;
  followUpType: 'Part Quote' | 'Proposal Approval' | 'Customer Callback' | 'Warranty Claim' | 'Return Visit' | 'Other';
  reason: string;
  assignedTo: string;
  assignedToId?: string | null;
  dueDate: string;
  isComplete: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  notes: CanonicalFlagNoteEntry[];
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
