/**
 * Canonical Domain Interfaces for Price Book Warranties.
 * Official Warranty Data Model for Murphy's FSM.
 */

export type CanonicalWarrantyType =
  | 'Contractor (Labor)'
  | 'Manufacturer (Parts)'
  | string;

export interface CanonicalWarranty {
  id: string;
  name: string;
  type: CanonicalWarrantyType;
  length: string; // e.g. "1 (years)", "5 (years)", "10 (years)"
  description: string;
  isextended: boolean;
  createdAt?: string;
  updatedAt?: string;
}
