/**
 * Canonical Time Clock & Shift Domain Models for Murphy's FSM Platform.
 */

export type CanonicalShiftAction =
  | 'Clocked In'
  | 'Clocked Out'
  | 'On Break'
  | 'Ended Break';

export interface CanonicalClockInSession {
  id: string;
  userId: string;
  userName?: string;
  clockInTime: string;
  clockOutTime?: string | null;
  shiftType?: string;
}

export interface CanonicalShiftActivity {
  id: string;
  userId: string;
  userName?: string;
  type: CanonicalShiftAction;
  timestamp: string;
  clockInTime?: string;
  clockOutTime?: string | null;
  shiftType?: string;
}

export interface CanonicalTimeClockEntry {
  id: string;
  userId?: string;
  userName?: string;
  type: string;
  timestamp: string;
  clockInTime?: string;
  clockOutTime?: string | null;
  shiftType?: string;
  updatedAt?: string;
}
