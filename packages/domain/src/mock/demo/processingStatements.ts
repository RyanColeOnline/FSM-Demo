export interface DemoProcessingStatement {
  id: string;
  fileId: string;
  filename: string;
  monthYear: string;
  provider: string;
  type: string;
  downloadUrl: string;
  viewUrl: string;
  fileSize: string;
  status: string;
  year: string;
  grossVolume: number;
  transactionCount: number;
  created: string;
}

export const DEMO_PROCESSING_STATEMENTS: DemoProcessingStatement[] = [
  {
    id: 'stmt-2026-08',
    fileId: 'file_apex_2026_08',
    filename: 'monthly_processing_statement_august_2026.pdf',
    monthYear: 'August 2026',
    provider: 'Stripe Payments',
    type: 'Monthly Processing',
    downloadUrl: '/assets/statements/monthly_processing_statement_august_2026.pdf',
    viewUrl: '/api/stripe/statements/file_apex_2026_08/view',
    fileSize: '1.4 MB',
    status: 'Ready',
    year: '2026',
    grossVolume: 48920.10,
    transactionCount: 142,
    created: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'stmt-2026-07',
    fileId: 'file_apex_2026_07',
    filename: 'monthly_processing_statement_july_2026.pdf',
    monthYear: 'July 2026',
    provider: 'Stripe Payments',
    type: 'Monthly Processing',
    downloadUrl: '/assets/statements/monthly_processing_statement_july_2026.pdf',
    viewUrl: '/api/stripe/statements/file_apex_2026_07/view',
    fileSize: '1.8 MB',
    status: 'Ready',
    year: '2026',
    grossVolume: 52140.80,
    transactionCount: 165,
    created: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'stmt-2026-06',
    fileId: 'file_apex_2026_06',
    filename: 'monthly_processing_statement_june_2026.pdf',
    monthYear: 'June 2026',
    provider: 'Stripe Payments',
    type: 'Monthly Processing',
    downloadUrl: '/assets/statements/monthly_processing_statement_june_2026.pdf',
    viewUrl: '/api/stripe/statements/file_apex_2026_06/view',
    fileSize: '1.5 MB',
    status: 'Ready',
    year: '2026',
    grossVolume: 44810.00,
    transactionCount: 130,
    created: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'stmt-1099k-2025',
    fileId: 'file_apex_1099k_2025',
    filename: '1099k_tax_form_2025.pdf',
    monthYear: 'Tax Year 2025',
    provider: 'Internal Revenue Service',
    type: '1099-K Tax Form',
    downloadUrl: '/assets/statements/1099k_tax_form_2025.pdf',
    viewUrl: '/api/stripe/statements/file_apex_1099k_2025/view',
    fileSize: '420 KB',
    status: 'Ready',
    year: '2025',
    grossVolume: 488250.00,
    transactionCount: 1420,
    created: '2026-01-31T00:00:00.000Z',
  },
];
