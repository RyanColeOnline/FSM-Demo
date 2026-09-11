import { CanonicalFollowUpFlag } from '../types/followUp';

export const CANONICAL_MOCK_FOLLOW_UPS: CanonicalFollowUpFlag[] = [
  {
    id: 'flag-1',
    jobId: 'job-1001',
    jobNumber: 1001,
    customerId: 'cust-res-01',
    customerName: 'Eleanor Vance',
    followUpType: 'Part Quote',
    reason: 'Quote dual capacitor (45/5 uF) and 2-pole contactor replacement.',
    assignedTo: 'Marcus Vance',
    dueDate: '2026-09-15T00:00:00.000Z',
    isComplete: false,
    notes: [
      {
        id: 'fn-1',
        author: 'Marcus Vance',
        text: 'Checked supplier availability for Carrier OEM parts.',
        timestamp: '2026-09-09T14:00:00.000Z'
      }
    ],
    createdAt: '2026-09-09T14:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'flag-2',
    jobId: 'job-1005',
    jobNumber: 1005,
    customerId: 'cust-res-02',
    customerName: 'Dr. Aris Thorne',
    followUpType: 'Proposal Approval',
    reason: 'Customer reviewing 18 SEER Carrier Infinity inverter proposal.',
    assignedTo: 'Alex Reynolds',
    dueDate: '2026-09-18T00:00:00.000Z',
    isComplete: false,
    notes: [],
    createdAt: '2026-09-08T15:30:00.000Z',
    updatedAt: new Date().toISOString()
  }
];
