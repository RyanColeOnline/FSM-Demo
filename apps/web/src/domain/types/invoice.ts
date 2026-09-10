/**
 * Canonical Domain Interfaces for Invoices, Line Items, and Billing.
 */

export type CanonicalInvoiceStatus =
  | 'Draft'
  | 'Presented'
  | 'Sent'
  | 'Approved'
  | 'Paid'
  | 'Partially Paid'
  | 'Overdue'
  | 'Void';

export interface CanonicalInvoiceLineItem {
  id: string;
  priceBookItemId?: string | null;
  sku?: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isTaxable: boolean;
  laborHours?: number | null;
  incomeAccount?: string | null;
}

export interface CanonicalInstallmentSchedule {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Failed';
  paidAt?: string | null;
  transactionId?: string | null;
}

export interface CanonicalPaymentPlan {
  id: string;
  totalAmount: number;
  downPayment: number;
  monthlyAmount: number;
  interestRate: number;
  installmentCount: number;
  status: 'Active' | 'Completed' | 'Defaulted';
  schedule: CanonicalInstallmentSchedule[];
}

export interface CanonicalInvoice {
  id: string;
  invoiceNumber: string; // e.g. #I-130086
  customerId: string;
  jobId?: string | null;
  jobNumber?: number | null;
  appointmentId?: string | null;
  status: CanonicalInvoiceStatus;
  issueDate: string;
  dueDate: string;
  paymentTerms: string; // "Due Upon Receipt", "Net 30", etc.
  acceptedPaymentMethods: string[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  lineItems: CanonicalInvoiceLineItem[];
  paymentPlan?: CanonicalPaymentPlan | null;
  billToCustomer: string;
  billingAddress: string;
  jobLocation: string;
  technician: string;
  soldByUserId?: string | null;
  createdById?: string | null;
  notes?: string | null;
  signatureUrl?: string | null;
  signatureName?: string | null;
  signatureDate?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
