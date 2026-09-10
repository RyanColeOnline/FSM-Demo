/**
 * Canonical Account Type definitions for Murphy's platform.
 * Strict snake_case on the wire: 'field' | 'office' | 'admin'
 */

export type AccountType = 'field' | 'office' | 'admin';

export interface AccountTypeMetadata {
  id: AccountType;
  displayName: string;
  description: string;
  badgeClass: string;
}

export const ACCOUNT_TYPES: Record<AccountType, AccountTypeMetadata> = {
  field: {
    id: 'field',
    displayName: 'Field',
    description: 'Field Service Technician (Mobile App Access Only)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  office: {
    id: 'office',
    displayName: 'Office',
    description: 'Office Staff & Dispatcher (Full Web & Scheduling Access)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  admin: {
    id: 'admin',
    displayName: 'Admin',
    description: 'System Administrator (Full Platform & Settings Access)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
  },
};

export const ALL_ACCOUNT_TYPES: AccountType[] = ['field', 'office', 'admin'];

export function getAccountTypeDisplayName(accountType: AccountType): string {
  return ACCOUNT_TYPES[accountType]?.displayName || accountType;
}

export function normalizeAccountType(raw: string | null | undefined): AccountType {
  if (!raw) return 'field';
  const lower = raw.trim().toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('office')) return 'office';
  return 'field';
}
