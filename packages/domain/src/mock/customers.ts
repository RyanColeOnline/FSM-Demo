import { CanonicalCustomer } from '../types/customer';
import customersJson from './customers.json';

export const CANONICAL_MOCK_CUSTOMERS: CanonicalCustomer[] = customersJson as unknown as CanonicalCustomer[];
