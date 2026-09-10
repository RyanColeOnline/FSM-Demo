import { CanonicalAuthorizedPerson } from '../types/customer';
import authorizedPersonsData from './authorizedPersons.json';

export const CANONICAL_MOCK_AUTHORIZED_PERSONS: CanonicalAuthorizedPerson[] =
  authorizedPersonsData as unknown as CanonicalAuthorizedPerson[];
