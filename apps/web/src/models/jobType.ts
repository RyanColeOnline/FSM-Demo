/**
 * Pure Job Type Definition Model.
 * Scoped directly to DispatchGroupCategory and mapped 1:1 with Murphy's Job Types Matrix.
 */

import { DispatchGroupCategory } from '@/rbac/dispatchGroups';
import { CanonicalJobCategory, CanonicalJobType, CanonicalTripType } from '@/domain/types/jobType';

export interface JobTypeDefinition {
  id: string;
  name: string;
  targetDispatchGroup: DispatchGroupCategory;
  category?: CanonicalJobCategory;
  jobType?: CanonicalJobType;
  tripType?: CanonicalTripType;
  defaultDurationHours: number;
  colorHex: string;
  description?: string;
  isTaxable?: boolean;
}
