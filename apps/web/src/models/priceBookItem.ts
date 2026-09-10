/**
 * Pure Price Book Domain Models.
 */

export type ProductType = 
  | 'Product - Single Part Only'
  | 'Product - Labor/Service Only'
  | 'Product Bundle - Multi Item Group'
  | 'Discount';

export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  itemCount: number;
  description?: string;
  account?: string;
  children?: CategoryNode[];
}

export interface BundlePartItem {
  id: string;
  partName: string;
  productName: string;
  unitPrice: number;
  cost: number;
  manufacturerNumber: string;
  productNumber: string;
  source: string;
  selected?: boolean;
}

export interface BundleLaborItem {
  id: string;
  serviceName: string;
  laborRate: number;
  hours: number;
  source: string;
  selected?: boolean;
}

export interface PriceBookItem {
  id: string;
  categoryId: string;
  productType: ProductType;
  sku: string;
  name: string;
  description: string;
  unitCost: number;
  sellingPrice: number;
  isTaxable: boolean;
  categoryName?: string;
  accountName?: string;
  qbAccount?: string;
  imageUrl?: string;
  maintPlanOverride?: boolean;
  maintPlanPrice?: number;
  isFavorite?: boolean;
  // Labor / Service Specific
  isServiceFee?: boolean;
  laborRate?: number;
  laborHours?: number;
  // Bundle Specific
  bundlePartIds?: string[];
  bundleLaborIds?: string[];
  // Discount Specific
  discountType?: 'percent' | 'fixed';
}
