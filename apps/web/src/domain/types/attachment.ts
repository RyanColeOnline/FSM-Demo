/**
 * Canonical Domain Interfaces for Attachments and Photos.
 */

export interface CanonicalAttachment {
  id: string;
  customerId: string;
  jobId?: string | null;
  jobNumber?: number | null;
  appointmentId?: string | null;
  fileName: string;
  fileUrl: string; // Cloud Storage URI / CDN
  thumbnailUrl?: string | null;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf' | 'application/msword' | 'other';
  fileSize: number; // in bytes
  category: 'Before' | 'After' | 'Diagnostic' | 'Equipment' | 'Electrical' | 'Invoice' | 'Signature' | 'Other';
  uploadedBy: string;
  uploadedById?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
