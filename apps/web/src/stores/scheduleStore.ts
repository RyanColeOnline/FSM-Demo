/**
 * ScheduleStore: Manages technician schedules, dispatch groups, and appointment scoping.
 */

import { DispatchGroupCategory, DISPATCH_GROUPS, getMockTechniciansForGroup } from '@/rbac/dispatchGroups';
import { TechUser, ScheduledJob } from '@/models/appointment';

export interface DispatchGroupTechnicians {
  group: DispatchGroupCategory;
  displayName: string;
  technicians: string[];
}

class ScheduleStoreManager {
  public getTechniciansForGroup(group: DispatchGroupCategory): string[] {
    return getMockTechniciansForGroup(group);
  }

  public getAllDispatchGroupTechnicians(): DispatchGroupTechnicians[] {
    const groups: DispatchGroupCategory[] = ['appliance_techs', 'hvac_techs', 'installer', 'office_staff'];
    return groups.map((g) => ({
      group: g,
      displayName: DISPATCH_GROUPS[g].displayName,
      technicians: DISPATCH_GROUPS[g].mockTechnicians,
    }));
  }

  public getAllTechnicianNames(): string[] {
    const groups: DispatchGroupCategory[] = ['appliance_techs', 'hvac_techs', 'installer', 'office_staff'];
    const names = new Set<string>();
    for (const g of groups) {
      for (const t of DISPATCH_GROUPS[g].mockTechnicians) {
        names.add(t);
      }
    }
    return Array.from(names);
  }
}

export const ScheduleStore = new ScheduleStoreManager();
