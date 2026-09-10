import { CanonicalInvoice } from '../types/invoice';
import invoicesJson from './invoices.json';

export const CANONICAL_MOCK_INVOICES: CanonicalInvoice[] = invoicesJson as unknown as CanonicalInvoice[];
