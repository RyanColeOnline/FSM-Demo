/**
 * Canonical Dispatch Group Category definitions for Murphy's platform.
 * Strict snake_case on the wire: 'hvac_techs' | 'appliance_techs' | 'installer' | 'office_staff'
 */

export type DispatchGroupCategory = 
  | 'hvac_techs' 
  | 'appliance_techs' 
  | 'installer' 
  | 'office_staff';

export interface DispatchGroupMetadata {
  id: DispatchGroupCategory;
  name: string;
  displayName: string;
  mockTechnicians: string[];
}

export const DISPATCH_GROUPS: Record<DispatchGroupCategory, DispatchGroupMetadata> = {
  appliance_techs: {
    id: 'appliance_techs',
    name: 'Appliance Techs',
    displayName: 'Appliance Techs',
    mockTechnicians: ['Minor Cover', 'Justin Lung', 'Wes Rykoskey'],
  },
  hvac_techs: {
    id: 'hvac_techs',
    name: 'HVAC Techs',
    displayName: 'HVAC Techs',
    mockTechnicians: ['Joe Colacino', 'Robert Hudson', 'Ethan Mitchell', 'Andrew (Jr) Murphy'],
  },
  installer: {
    id: 'installer',
    name: 'Installer',
    displayName: 'Installer',
    mockTechnicians: ['Matt Curtsinger', 'Jon Martin', 'Ethan Murphy', 'Christian Nguyen'],
  },
  office_staff: {
    id: 'office_staff',
    name: 'Office Staff',
    displayName: 'Office Staff',
    mockTechnicians: ['Justin Dunlap', 'Amanda Hoover', 'Nancy Murphy', 'Danny Pardo'],
  },
};

export const ALL_DISPATCH_GROUPS: DispatchGroupCategory[] = [
  'appliance_techs',
  'hvac_techs',
  'installer',
  'office_staff',
];

export function getDispatchGroupDisplayName(group: DispatchGroupCategory): string {
  return DISPATCH_GROUPS[group]?.displayName || group;
}

export function getMockTechniciansForGroup(group: DispatchGroupCategory): string[] {
  return DISPATCH_GROUPS[group]?.mockTechnicians || [];
}

export function normalizeDispatchGroupCategory(raw: string | null | undefined): DispatchGroupCategory {
  if (!raw) return 'appliance_techs';
  const lower = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (lower.includes('hvac')) return 'hvac_techs';
  if (lower.includes('install')) return 'installer';
  if (lower.includes('office')) return 'office_staff';
  return 'appliance_techs';
}
