import { CanonicalAttachment } from '../types/attachment';

export const CANONICAL_MOCK_ATTACHMENTS: CanonicalAttachment[] = [
  {
    id: 'att-1',
    customerId: 'cust-res-01',
    jobId: 'job-1001',
    jobNumber: 1001,
    fileName: 'Carrier_Condenser_Nameplate.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?fit=crop&w=400&h=300',
    fileType: 'image/jpeg',
    fileSize: 1024 * 340,
    category: 'Equipment',
    uploadedBy: 'Marcus Vance',
    createdAt: '2026-09-09T09:15:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'att-2',
    customerId: 'cust-res-01',
    jobId: 'job-1001',
    jobNumber: 1001,
    fileName: 'AirHandler_Wiring_Before.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?fit=crop&w=400&h=300',
    fileType: 'image/jpeg',
    fileSize: 1024 * 480,
    category: 'Electrical',
    uploadedBy: 'Marcus Vance',
    createdAt: '2026-09-09T09:18:00.000Z',
    updatedAt: new Date().toISOString()
  }
];
