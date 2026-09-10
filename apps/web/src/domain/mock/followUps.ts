import { CanonicalFollowUpFlag } from '../types/followUp';

export const CANONICAL_MOCK_FOLLOW_UPS: CanonicalFollowUpFlag[] = [
  {
    id: 'flag-1',
    jobId: '140019',
    jobNumber: 140019,
    customerId: '00000000-0000-0000-0000-000000000002',
    customerName: 'Evan Williams',
    followUpType: 'Part Quote',
    reason: 'Quote dual capacitor (45/5 uF) and 2-pole contactor replacement.',
    assignedTo: 'Ryan Cole',
    dueDate: '2026-08-25T00:00:00.000Z',
    isComplete: false,
    notes: [
      {
        id: 'fn-1',
        author: 'Ryan Cole',
        text: 'Checked supplier availability for Trane OEM parts.',
        timestamp: '2026-08-22T14:00:00.000Z'
      }
    ],
    createdAt: '2026-08-22T14:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'flag-2',
    jobId: '140020',
    jobNumber: 140020,
    customerId: '00000000-0000-0000-0000-000000000001',
    customerName: 'Tammy Cohen',
    followUpType: 'Proposal Approval',
    reason: 'Customer reviewing 18 SEER Carrier Infinity inverter proposal.',
    assignedTo: 'Justin Lung',
    dueDate: '2026-08-26T00:00:00.000Z',
    isComplete: false,
    notes: [],
    createdAt: '2026-08-22T15:30:00.000Z',
    updatedAt: new Date().toISOString()
  }
];
