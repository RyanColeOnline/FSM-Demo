import { CanonicalTimeClockEntry } from '../../types/timeClock';

export const DEMO_TIME_RECORDS: CanonicalTimeClockEntry[] = [
  // Marcus Vance (Today - Sept 9)
  {
    id: 'tc-mv-09-1',
    userId: 'demo-tech-hvac-1',
    userName: 'Marcus Vance',
    type: 'Clocked In',
    timestamp: '2026-09-09T07:00:00.000Z',
    clockInTime: '2026-09-09T07:00:00.000Z',
    shiftType: 'Regular Shift',
  },
  {
    id: 'tc-mv-09-2',
    userId: 'demo-tech-hvac-1',
    userName: 'Marcus Vance',
    type: 'On Break',
    timestamp: '2026-09-09T12:00:00.000Z',
    shiftType: 'Lunch Break',
  },
  {
    id: 'tc-mv-09-3',
    userId: 'demo-tech-hvac-1',
    userName: 'Marcus Vance',
    type: 'Clocked In',
    timestamp: '2026-09-09T12:30:00.000Z',
    shiftType: 'Regular Shift',
  },

  // Marcus Vance (Yesterday - Sept 8)
  {
    id: 'tc-mv-08-1',
    userId: 'demo-tech-hvac-1',
    userName: 'Marcus Vance',
    type: 'Clocked In',
    timestamp: '2026-09-08T07:15:00.000Z',
    clockInTime: '2026-09-08T07:15:00.000Z',
    clockOutTime: '2026-09-08T16:00:00.000Z',
    shiftType: 'Regular Shift',
  },
  {
    id: 'tc-mv-08-2',
    userId: 'demo-tech-hvac-1',
    userName: 'Marcus Vance',
    type: 'Clocked Out',
    timestamp: '2026-09-08T16:00:00.000Z',
    clockInTime: '2026-09-08T07:15:00.000Z',
    clockOutTime: '2026-09-08T16:00:00.000Z',
    shiftType: 'Regular Shift',
  },

  // Carlos Mendez (Today - Sept 9)
  {
    id: 'tc-cm-09-1',
    userId: 'demo-tech-hvac-2',
    userName: 'Carlos Mendez',
    type: 'Clocked In',
    timestamp: '2026-09-09T07:30:00.000Z',
    clockInTime: '2026-09-09T07:30:00.000Z',
    shiftType: 'Regular Shift',
  },

  // Carlos Mendez (Yesterday - Sept 8)
  {
    id: 'tc-cm-08-1',
    userId: 'demo-tech-hvac-2',
    userName: 'Carlos Mendez',
    type: 'Clocked In',
    timestamp: '2026-09-08T07:30:00.000Z',
    clockInTime: '2026-09-08T07:30:00.000Z',
    clockOutTime: '2026-09-08T16:15:00.000Z',
    shiftType: 'Regular Shift',
  },
  {
    id: 'tc-cm-08-2',
    userId: 'demo-tech-hvac-2',
    userName: 'Carlos Mendez',
    type: 'Clocked Out',
    timestamp: '2026-09-08T16:15:00.000Z',
    clockInTime: '2026-09-08T07:30:00.000Z',
    clockOutTime: '2026-09-08T16:15:00.000Z',
    shiftType: 'Regular Shift',
  },

  // David Ross (Today - Sept 9)
  {
    id: 'tc-dr-09-1',
    userId: 'demo-tech-appliance-1',
    userName: 'David Ross',
    type: 'Clocked In',
    timestamp: '2026-09-09T08:00:00.000Z',
    clockInTime: '2026-09-09T08:00:00.000Z',
    shiftType: 'Commercial Appliance Route',
  },

  // David Ross (Yesterday - Sept 8)
  {
    id: 'tc-dr-08-1',
    userId: 'demo-tech-appliance-1',
    userName: 'David Ross',
    type: 'Clocked In',
    timestamp: '2026-09-08T08:00:00.000Z',
    clockInTime: '2026-09-08T08:00:00.000Z',
    clockOutTime: '2026-09-08T17:00:00.000Z',
    shiftType: 'Regular Shift',
  },
  {
    id: 'tc-dr-08-2',
    userId: 'demo-tech-appliance-1',
    userName: 'David Ross',
    type: 'Clocked Out',
    timestamp: '2026-09-08T17:00:00.000Z',
    clockInTime: '2026-09-08T08:00:00.000Z',
    clockOutTime: '2026-09-08T17:00:00.000Z',
    shiftType: 'Regular Shift',
  },

  // Tyler Reed (Yesterday - Sept 8)
  {
    id: 'tc-tr-08-1',
    userId: 'demo-tech-appliance-2',
    userName: 'Tyler Reed',
    type: 'Clocked In',
    timestamp: '2026-09-08T08:30:00.000Z',
    clockInTime: '2026-09-08T08:30:00.000Z',
    clockOutTime: '2026-09-08T15:30:00.000Z',
    shiftType: 'Residential Route',
  },
  {
    id: 'tc-tr-08-2',
    userId: 'demo-tech-appliance-2',
    userName: 'Tyler Reed',
    type: 'Clocked Out',
    timestamp: '2026-09-08T15:30:00.000Z',
    clockInTime: '2026-09-08T08:30:00.000Z',
    clockOutTime: '2026-09-08T15:30:00.000Z',
    shiftType: 'Residential Route',
  },
];
