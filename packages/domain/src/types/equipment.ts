import { CanonicalWarranty } from './warranty';

export interface CanonicalRebate {
  id: string;
  name: string;
  amount: number;
  provider: string;
  status: 'Submitted' | 'Approved' | 'Paid' | 'Rejected';
  submittedDate: string;
  approvedDate?: string | null;
}

export interface EquipmentWarrantyDetail {
  id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface CanonicalEquipment {
  id: string;
  customerId: string;
  customerNumber?: string;
  businessCustomerId?: string;
  customerName?: string;
  customerStatus?: string;
  phone?: string;
  customerType?: string;
  name?: string;
  equipmentName?: string;
  systemName?: string;
  equipmentDescription?: string;
  equipmentStatus?: string;
  systemAge?: string;
  installationDate?: string;
  locationId?: string | null;
  locationStreet?: string | null;
  locationAddress?: string | null;
  systemType?: 'HVAC' | 'Appliance' | 'Plumbing' | 'Electrical' | 'Other' | string;
  equipmentType?: string; // Air Handler, Condenser, Heat Pump, Refrigerator, Oven, etc.
  type?: string;
  manufacturer?: string;
  mfg?: string;
  modelNumber?: string;
  modelNo?: string;
  serialNumber?: string;
  serialNo?: string;
  installDate?: string;
  installedOn?: string;
  status?: 'active' | 'inactive' | 'replaced' | string;
  warranty?: string;
  manufacturerWarranty?: string;
  manufacturerWarrantyName?: string;
  manufacturerWarrantyStatus?: string;
  manufacturerWarrantyStartDate?: string;
  manufacturerWarrantyEndDate?: string;
  manufacturerWarrantyEffectiveDate?: string;
  manufacturerWarrantyEffectiveEnd?: string;
  manufacturerWarrantyDescription?: string;
  otherWarrantyName?: string;
  otherWarrantyEffectiveDate?: string;
  otherWarrantyEndDate?: string;
  otherWarrantyDescription?: string;
  otherWarranty?: EquipmentWarrantyDetail;
  additionalWarranty?: EquipmentWarrantyDetail;
  installedBy?: string | null;
  refrigerantType?: string | null;
  filterSize?: string | null;
  electricalSpecs?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  photos?: string[];
  warranties?: CanonicalWarranty[];
  rebates?: CanonicalRebate[];
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
