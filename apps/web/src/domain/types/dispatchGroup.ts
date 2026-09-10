/**
 * Canonical Dispatch Group Definitions for Murphy's FSM Platform.
 */

export interface CanonicalDispatchGroup {
  id: string;
  name: string;
  members: string[]; // List of user names or user IDs in this dispatch group
  createdAt?: string;
  updatedAt?: string;
}
