/**
 * Canonical Price Book Domain Models for Murphy's FSM Platform.
 * Reconciles sku/productNumber and standardPrice/sellingPrice across Mobile & Web.
 */

export type CanonicalProductType =
  | 'Product - Single Part Only'
  | 'Product - Labor/Service Only'
  | 'Product Bundle - Multi Item Group'
  | 'Discount';

export interface CanonicalPriceBookItem {
  id: string;
  name: string;
  sku: string;
  productNumber?: string;
  description?: string;
  incomeAccount: string;
  isTaxable: boolean;
  laborHours: number;
  sellingPrice: number;
  standardPrice?: number;
  maintenancePlanPrice?: number;
  categoryPaths: string[];
  categoryId?: string;
  categoryIds?: string[];
  productType?: CanonicalProductType;
  bundlePartIds?: string[];
  bundleLaborIds?: string[];
  unitCost?: number;
}

export interface CanonicalPriceBookCategory {
  id: string;
  name: string;
  fullPath: string;
  designationCode?: string;
  subcategories?: CanonicalPriceBookCategory[];
  items?: CanonicalPriceBookItem[];
}
