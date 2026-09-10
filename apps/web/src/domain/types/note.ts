/**
 * Canonical Domain Interfaces for Notes.
 */

export interface CanonicalNote {
  id: string;
  customerId: string;
  jobId?: string | null;
  jobNumber?: number | null;
  appointmentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string; // "Field Technician", "Office Admin", "System"
  title: string;
  content: string;
  isPinned: boolean;
  locationStreet?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
