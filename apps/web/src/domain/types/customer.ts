/**
 * Canonical Customer Domain Models for Murphy's FSM Platform.
 * Aligns 1:1 between Swift (apps/mobile) and TypeScript (apps/web).
 */

export type CanonicalAddressType = 'residential' | 'commercial';

export interface CanonicalAddress {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  type: CanonicalAddressType;
  billingType?: string;
  addr2?: string;
  addressLine2?: string;
  street2?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CanonicalAuthorizedPerson {
  id: string;
  contactId?: string;
  customerId?: string;
  customerNumber?: string;
  positionLabel: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone: string;
  homePhone?: string;
  mobilePhone?: string;
  email?: string;
  assignedLocation?: string;
  locationId?: string;
  isPrimary: boolean;
  hidden?: boolean;
}

export interface CanonicalStoredPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}

export interface CanonicalCustomerFinancials {
  totalInvoiced: number;
  totalProposed: number;
  currency?: string;
}

export interface CanonicalCustomer {
  id: string;
  customerNumber?: string;
  accountNumber?: string;
  wexCustomerId?: string;
  legacyId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  qbName?: string;
  phone: string;
  homePhone?: string | null;
  mobilePhone?: string | null;
  email: string | null;
  address: CanonicalAddress;
  customerType: CanonicalAddressType;
  referralSource?: string;
  taxGroup?: 'FL (7%)' | 'Exempt (0%)' | string;
  acceptedPaymentMethods?: string;
  preferredCommunicationMethod?: 'Email' | 'Text';
  preferredCommunication?: string;
  preferredTechnician?: string;
  spanishSpeaking?: boolean;
  spanishPreferred?: boolean;
  optOutText?: boolean;
  optOutEmail?: boolean;
  locations: CanonicalAddress[];
  billingAddress?: CanonicalAddress | null;
  paymentTerms?: string | null;
  maintenancePlanStatus?: string;
  lastVisitDate?: string | null;
  financials?: CanonicalCustomerFinancials;
  wexMetadata?: Record<string, any>;
  authorizedPersons?: CanonicalAuthorizedPerson[];
  storedPaymentMethods?: CanonicalStoredPaymentMethod[];
  autoSyncStatus?: 'Synced' | 'Pending' | 'Failed';
  customerStatus?: 'Active' | 'Inactive' | 'Account on Hold';
  createdAt: string;
  updatedAt?: string;
}
