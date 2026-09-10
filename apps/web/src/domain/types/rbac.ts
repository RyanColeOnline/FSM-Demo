/**
 * Canonical RBAC, Roles, and Permission Models for Murphy's FSM Platform.
 */

import { CanonicalUserPermissions } from './user';

export type CanonicalAccountType = 'field' | 'office' | 'admin';

export type CanonicalDispatchGroupKey =
  | 'appliance_techs'
  | 'hvac_techs'
  | 'installer'
  | 'office_staff';

export interface CanonicalUserSession {
  id: string;
  name: string;
  email: string;
  accountType: CanonicalAccountType;
  dispatchGroup: CanonicalDispatchGroupKey;
  permissions: CanonicalUserPermissions;
  token: string;
}
