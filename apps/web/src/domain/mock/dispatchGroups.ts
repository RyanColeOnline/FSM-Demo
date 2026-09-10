import { CanonicalDispatchGroup } from '../types/dispatchGroup';

export const CANONICAL_OFFICIAL_DISPATCH_GROUPS: CanonicalDispatchGroup[] = [
  {
    id: 'dg-hvac-techs',
    name: 'HVAC Techs',
    members: ['Joe Colacino', 'Robert Hudson', 'Ethan Mitchell', 'Andrew (Jr) Murphy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dg-appliance-techs',
    name: 'Appliance Techs',
    members: ['Minor Cover', 'Justin Lung', 'Wes Rykoskey'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dg-installer',
    name: 'Installer',
    members: ['Matt Curtsinger', 'Jon Martin', 'Ethan Murphy', 'Christian Nguyen'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dg-office-staff',
    name: 'Office Staff',
    members: ['Justin Dunlap', 'Amanda Hoover', 'Nancy Murphy', 'Danny Pardo'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
