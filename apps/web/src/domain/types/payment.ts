/**
 * Canonical Payment Record Domain Model for Murphy's FSM Platform.
 * Used for client-side transaction logs in Jobs > Payment List.
 */

export interface CanonicalPaymentRecord {
  id: string;
  referenceNumber?: string;
  paymentDate?: string;
  customerId?: string;
  customerNumber?: string;
  customerName: string;
  payerName: string;
  dateTime: string;
  type: 'Processed' | 'Recorded' | string;
  method: string;
  paymentNetwork?: string;
  status: 'Settled' | 'Entered' | 'Pending' | 'Failed' | string;
  amount: number;
  netAmount?: number;
  amountFormatted?: string;
  frequency?: 'One-time' | 'Recurring' | string;
  autoSyncStatus?: 'Synced' | 'Pending' | 'Failed';
  hasInvLink?: boolean;
  hasMpLink?: boolean;
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoiceBalance?: number;
  maintenancePlanId?: string;
  maintenancePlanName?: string;
  maintenancePlanAmountApplied?: number;
  stripePaymentIntentId?: string;
  takenBy?: string;
  memo?: string;
  last4?: string;
  settlementBatch?: string;
  batchTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}
