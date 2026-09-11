import { CanonicalAuthorizedPerson } from '../types/customer';
import { DEMO_CUSTOMERS } from './customers';

export const CANONICAL_MOCK_AUTHORIZED_PERSONS: CanonicalAuthorizedPerson[] =
  DEMO_CUSTOMERS.flatMap((c) => c.authorizedPersons || []);
