import { CanonicalAppointment } from '../../types/appointment';
import { DEMO_JOBS } from './jobs';
import { DEMO_APPOINTMENTS_SEPT_2026 } from './demo-appointments-dataset';

export { DEMO_APPOINTMENTS_SEPT_2026 };

export const DEMO_APPOINTMENTS: CanonicalAppointment[] = [
  ...DEMO_APPOINTMENTS_SEPT_2026,
  ...DEMO_JOBS.flatMap((job) => job.appointments || []),
];
