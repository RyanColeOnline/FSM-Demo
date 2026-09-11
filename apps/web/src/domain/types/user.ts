/**
 * Canonical User & Granular Permission Definitions for Murphy's FSM Platform.
 */

export interface CanonicalUserPermissions {
  accountType: 'Admin' | 'Office' | 'Field';
  appointmentVisibility: string;
  allCustomerVisibility: boolean;
  reportingTabVisibility: boolean;
  moreAppsAndSettingsVisibility: boolean;
  manuallyEnterCards: boolean;
  manageRecurringPayments: boolean;
  performCreditsAndVoids: boolean;
  performFinancingActions: boolean;
  receiptCopyRecipients: string[];
  scheduleEventsPermission: string;
  editPricesAndTaxOnMobile: boolean;
  createCustomLineItems: boolean;
  viewJobPnL: boolean;
}

export interface CanonicalDeviceProfile {
  mapsPreference: 'Apple Maps' | 'Google Maps' | 'Waze' | string;
  appTheme: 'System' | 'Light' | 'Dark' | string;
}

export interface CanonicalUser {
  id: string;
  uid?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  name?: string;
  initials?: string;
  email: string;
  mobilePhone: string;
  homePhone: string;
  accessNumber: string;
  techSkillLevel: string;
  dispatchGroups: string[];
  isActive: boolean;
  accountType?: 'admin' | 'office' | 'field';
  role?: 'Admin' | 'Office' | 'Field' | string;
  permissions: CanonicalUserPermissions;
  deviceProfile?: CanonicalDeviceProfile;
  currentShiftId?: string | null;
  clockStatus?: 'Clocked In' | 'Clocked Out' | 'On Break';
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Strips role suffixes such as (Admin), (Dispatch), (Office), (Field), etc. site-wide.
 */
export function cleanUserDisplayName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*\((admin|office|field|technician|dispatch|master|veteran|apprentice)[^)]*\)/gi, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim();
}
