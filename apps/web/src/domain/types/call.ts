/**
 * Canonical Call Domain Model for Murphy's FSM Platform.
 * Aligns 1:1 between Swift (apps/mobile) and TypeScript (apps/web).
 */

export type CanonicalCallType = 'Inbound' | 'Outbound';
export type CanonicalCallActivityType = 'Call' | 'Email' | 'Note' | 'Meeting';

export interface CanonicalCall {
  id: string;
  customerId: string;
  customerName: string;
  contactName?: string;
  phoneCid?: string | null;
  callDate: string;
  callType: CanonicalCallType;
  activityType?: CanonicalCallActivityType;
  relatedLocation?: string | null;
  notes?: string | null;
  user: string;
  userId?: string | null;
  jobNumber?: number | string | null;
  appointmentId?: string | null;
  createdAt: string;
  updatedAt?: string;
}