import { CanonicalAttachment } from '../types/attachment';

export const CANONICAL_MOCK_ATTACHMENTS: CanonicalAttachment[] = [
  {
    id: 'att-1',
    customerId: '00000000-0000-0000-0000-000000000001',
    jobId: '140020',
    jobNumber: 140020,
    fileName: 'Condenser_Nameplate.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?fit=crop&w=400&h=300',
    fileType: 'image/jpeg',
    fileSize: 1024 * 340,
    category: 'Equipment',
    uploadedBy: 'Justin Lung',
    createdAt: '2026-08-08T10:15:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'att-2',
    customerId: '00000000-0000-0000-0000-000000000001',
    jobId: '140020',
    jobNumber: 140020,
    fileName: 'AirHandler_Wiring_Before.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?fit=crop&w=400&h=300',
    fileType: 'image/jpeg',
    fileSize: 1024 * 480,
    category: 'Electrical',
    uploadedBy: 'Justin Lung',
    createdAt: '2026-08-08T10:18:00.000Z',
    updatedAt: new Date().toISOString()
  }
];
