/**
 * JobTypeRegistry: Pre-indexed O(1) Job Type catalog per DispatchGroupCategory.
 * Aligned 1:1 with Murphy's Job Types Matrix & Trip Color System.
 */

import { DispatchGroupCategory } from '@/rbac/dispatchGroups';
import { JobTypeDefinition } from '@/models/jobType';
import { extractTripType, getTripTypeWebHex, CANONICAL_TRIP_COLORS } from '@/domain/types/jobType';

export const INITIAL_JOB_TYPES: JobTypeDefinition[] = [
  // Appliance Techs
  { id: 'jt-app-r-diag', name: 'Residential (R) - Diagnostic', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Residential (R)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  { id: 'jt-app-c-diag', name: 'Commercial (C) - Diagnostic', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  { id: 'jt-app-hw-diag', name: 'Home Warranty (HW) - Diagnostic', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  
  { id: 'jt-app-r-inst', name: 'Residential (R) - Install', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Residential (R)', tripType: 'Install', defaultDurationHours: 2.5, colorHex: '#6255f5' },
  { id: 'jt-app-c-inst', name: 'Commercial (C) - Install', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'Install', defaultDurationHours: 2.5, colorHex: '#6255f5' },
  { id: 'jt-app-hw-inst', name: 'Home Warranty (HW) - Install', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'Install', defaultDurationHours: 2.5, colorHex: '#6255f5' },
  
  { id: 'jt-app-r-parts', name: 'Residential (R) - Parts', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Residential (R)', tripType: 'Parts', defaultDurationHours: 1.0, colorHex: '#cb30e0' },
  { id: 'jt-app-c-parts', name: 'Commercial (C) - Parts', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'Parts', defaultDurationHours: 1.0, colorHex: '#cb30e0' },
  { id: 'jt-app-hw-parts', name: 'Home Warranty (HW) - Parts', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'Parts', defaultDurationHours: 1.0, colorHex: '#cb30e0' },
  
  { id: 'jt-app-r-pm', name: 'Residential (R) - PM', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Residential (R)', tripType: 'PM', defaultDurationHours: 1.0, colorHex: '#34c759' },
  { id: 'jt-app-c-pm', name: 'Commercial (C) - PM', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'PM', defaultDurationHours: 1.0, colorHex: '#34c759' },
  { id: 'jt-app-hw-pm', name: 'Home Warranty (HW) - PM', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'PM', defaultDurationHours: 1.0, colorHex: '#34c759' },
  
  { id: 'jt-app-r-recall', name: 'Residential (R) - Recall', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Residential (R)', tripType: 'Recall', defaultDurationHours: 1.0, colorHex: '#FF3B30' },
  { id: 'jt-app-c-recall', name: 'Commercial (C) - Recall', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'Recall', defaultDurationHours: 1.0, colorHex: '#FF3B30' },
  { id: 'jt-app-hw-recall', name: 'Home Warranty (HW) - Recall', targetDispatchGroup: 'appliance_techs', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'Recall', defaultDurationHours: 1.0, colorHex: '#FF3B30' },

  // HVAC Techs
  { id: 'jt-hvac-hw-ahs', name: 'Home Warranty (HW) - AHS', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'AHS', defaultDurationHours: 1.5, colorHex: '#ff9500' },
  { id: 'jt-hvac-hw-diag', name: 'Home Warranty (HW) - Diagnostic', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  { id: 'jt-hvac-c-diag', name: 'Commercial (C) - Diagnostic', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  { id: 'jt-hvac-res-diag', name: 'Resort (RES) - Diagnostic', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  { id: 'jt-hvac-cod-diag', name: 'COD - Diagnostic', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'COD', tripType: 'Diagnostic', defaultDurationHours: 1.5, colorHex: '#0088ff' },
  
  { id: 'jt-hvac-hw-fi', name: 'Home Warranty (HW) - FI', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'FI', defaultDurationHours: 1.5, colorHex: '#ff9500' },
  { id: 'jt-hvac-hw-inst', name: 'Home Warranty (HW) - Install', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Install', defaultDurationHours: 4.0, colorHex: '#6255f5' },
  { id: 'jt-hvac-c-inst', name: 'Commercial (C) - Install', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'Install', defaultDurationHours: 4.0, colorHex: '#6255f5' },
  { id: 'jt-hvac-res-inst', name: 'Resort (RES) - Install', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'Install', defaultDurationHours: 4.0, colorHex: '#6255f5' },
  { id: 'jt-hvac-cod-inst', name: 'COD - Install', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'COD', tripType: 'Install', defaultDurationHours: 4.0, colorHex: '#6255f5' },
  
  { id: 'jt-hvac-hw-or', name: 'Home Warranty (HW) - O.R.', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'O.R.', defaultDurationHours: 1.5, colorHex: '#ff9500' },
  { id: 'jt-hvac-hw-parts', name: 'Home Warranty (HW) - Parts', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Parts', defaultDurationHours: 1.5, colorHex: '#cb30e0' },
  { id: 'jt-hvac-c-parts', name: 'Commercial (C) - Parts', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'Parts', defaultDurationHours: 1.5, colorHex: '#cb30e0' },
  { id: 'jt-hvac-res-parts', name: 'Resort (RES) - Parts', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'Parts', defaultDurationHours: 1.5, colorHex: '#cb30e0' },
  { id: 'jt-hvac-cod-parts', name: 'COD - Parts', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'COD', tripType: 'Parts', defaultDurationHours: 1.5, colorHex: '#cb30e0' },
  
  { id: 'jt-hvac-hw-pm', name: 'Home Warranty (HW) - PM', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'PM', defaultDurationHours: 1.5, colorHex: '#34c759' },
  { id: 'jt-hvac-c-pm', name: 'Commercial (C) - PM', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'PM', defaultDurationHours: 1.5, colorHex: '#34c759' },
  { id: 'jt-hvac-res-pm', name: 'Resort (RES) - PM', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'PM', defaultDurationHours: 1.5, colorHex: '#34c759' },
  { id: 'jt-hvac-cod-pm', name: 'COD - PM', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'COD', tripType: 'PM', defaultDurationHours: 1.5, colorHex: '#34c759' },
  
  { id: 'jt-hvac-hw-recall', name: 'Home Warranty (HW) - Recall', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Recall', defaultDurationHours: 1.5, colorHex: '#FF3B30' },
  { id: 'jt-hvac-c-recall', name: 'Commercial (C) - Recall', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'Recall', defaultDurationHours: 1.5, colorHex: '#FF3B30' },
  { id: 'jt-hvac-res-recall', name: 'Resort (RES) - Recall', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'Recall', defaultDurationHours: 1.5, colorHex: '#FF3B30' },
  { id: 'jt-hvac-cod-recall', name: 'COD - Recall', targetDispatchGroup: 'hvac_techs', category: 'HVAC', jobType: 'COD', tripType: 'Recall', defaultDurationHours: 1.5, colorHex: '#FF3B30' },

  // Installers
  { id: 'jt-inst-hvac-hw', name: 'HVAC Home Warranty (HW) - Install', targetDispatchGroup: 'installer', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Install', defaultDurationHours: 5.0, colorHex: '#6255f5' },
  { id: 'jt-inst-hvac-c', name: 'HVAC Commercial (C) - Install', targetDispatchGroup: 'installer', category: 'HVAC', jobType: 'Commercial (C)', tripType: 'Install', defaultDurationHours: 5.0, colorHex: '#6255f5' },
  { id: 'jt-inst-hvac-res', name: 'HVAC Resort (RES) - Install', targetDispatchGroup: 'installer', category: 'HVAC', jobType: 'Resort (RES)', tripType: 'Install', defaultDurationHours: 5.0, colorHex: '#6255f5' },
  { id: 'jt-inst-hvac-cod', name: 'HVAC COD - Install', targetDispatchGroup: 'installer', category: 'HVAC', jobType: 'COD', tripType: 'Install', defaultDurationHours: 5.0, colorHex: '#6255f5' },
  { id: 'jt-inst-app-r', name: 'Appliance Residential (R) - Install', targetDispatchGroup: 'installer', category: 'Appliance', jobType: 'Residential (R)', tripType: 'Install', defaultDurationHours: 3.0, colorHex: '#6255f5' },
  { id: 'jt-inst-app-c', name: 'Appliance Commercial (C) - Install', targetDispatchGroup: 'installer', category: 'Appliance', jobType: 'Commercial (C)', tripType: 'Install', defaultDurationHours: 3.0, colorHex: '#6255f5' },
  { id: 'jt-inst-app-hw', name: 'Appliance Home Warranty (HW) - Install', targetDispatchGroup: 'installer', category: 'Appliance', jobType: 'Home Warranty (HW)', tripType: 'Install', defaultDurationHours: 3.0, colorHex: '#6255f5' },
];

class JobTypeRegistryStore {
  private indexedByGroup: Record<DispatchGroupCategory, JobTypeDefinition[]>;
  private indexedNamesByGroup: Record<DispatchGroupCategory, string[]>;
  private allJobTypes: JobTypeDefinition[];

  constructor() {
    this.allJobTypes = INITIAL_JOB_TYPES;
    this.indexedByGroup = {
      appliance_techs: [],
      hvac_techs: [],
      installer: [],
      office_staff: [],
    };
    this.indexedNamesByGroup = {
      appliance_techs: [],
      hvac_techs: [],
      installer: [],
      office_staff: [],
    };
    this.rebuildIndexes();
  }

  private rebuildIndexes() {
    const groups: DispatchGroupCategory[] = ['appliance_techs', 'hvac_techs', 'installer', 'office_staff'];
    
    for (const group of groups) {
      if (group === 'office_staff') {
        this.indexedByGroup[group] = [...this.allJobTypes];
        this.indexedNamesByGroup[group] = Array.from(new Set(this.allJobTypes.map((j) => j.name)));
      } else {
        const filtered = this.allJobTypes.filter((j) => j.targetDispatchGroup === group);
        this.indexedByGroup[group] = filtered;
        this.indexedNamesByGroup[group] = Array.from(new Set(filtered.map((j) => j.name)));
      }
    }
  }

  public getJobTypesForGroup(group: DispatchGroupCategory): JobTypeDefinition[] {
    return this.indexedByGroup[group] || this.allJobTypes;
  }

  public getJobTypeNamesForGroup(group: DispatchGroupCategory): string[] {
    return this.indexedNamesByGroup[group] || this.indexedNamesByGroup.office_staff;
  }

  public getAllJobTypes(): JobTypeDefinition[] {
    return this.allJobTypes;
  }

  public getHexForJobType(jobType: string): string {
    return getTripTypeWebHex(jobType);
  }

  public importJobTypes(newTypes: JobTypeDefinition[]) {
    this.allJobTypes = [...this.allJobTypes, ...newTypes];
    this.rebuildIndexes();
  }
}

export const JobTypeRegistry = new JobTypeRegistryStore();
