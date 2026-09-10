/**
 * Canonical Domain Interfaces for Proposals, Tiered Estimates, and Options.
 */

import { CanonicalInvoiceLineItem } from './invoice';

export type CanonicalProposalStatus =
  | 'Draft'
  | 'Presented'
  | 'Sent'
  | 'Approved'
  | 'Declined'
  | 'Expired';

export type CanonicalProposalTier = 'Option A' | 'Option B' | 'Option C' | 'Option D' | 'Custom';

export interface CanonicalProposalOption {
  id: string;
  tier: CanonicalProposalTier;
  title: string; // e.g. "Good", "Better", "Best", "Premium System"
  description: string;
  lineItems: CanonicalInvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  monthlyFinancingEstimate?: number | null;
  isSelected?: boolean;
}

export interface CanonicalProposal {
  id: string;
  proposalNumber: string; // e.g. #P-10492
  customerId: string;
  jobId?: string | null;
  jobNumber?: number | null;
  appointmentId?: string | null;
  status: CanonicalProposalStatus;
  issueDate: string;
  expirationDate: string;
  options: CanonicalProposalOption[];
  selectedOptionId?: string | null;
  notes?: string | null;
  billToCustomer: string;
  jobLocation: string;
  technician: string;
  soldByUserId?: string | null;
  createdById?: string | null;
  signatureUrl?: string | null;
  signatureName?: string | null;
  signatureDate?: string | null;
  convertedToInvoiceId?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
