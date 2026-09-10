import { CanonicalDispatchGroup } from '../types/dispatchGroup';

export const DEMO_DISPATCH_GROUPS: CanonicalDispatchGroup[] = [
  {
    id: 'grp-hvac',
    name: 'HVAC Techs',
    members: ['Marcus Vance', 'Carlos Mendez', 'Alex Reynolds'],
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'grp-appliance',
    name: 'Appliance Techs',
    members: ['David Ross', 'Tyler Reed'],
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'grp-office',
    name: 'Office Staff',
    members: ['Alex Reynolds', 'Sarah Jenkins'],
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];

export const CANONICAL_OFFICIAL_DISPATCH_GROUPS: CanonicalDispatchGroup[] = [...DEMO_DISPATCH_GROUPS];
