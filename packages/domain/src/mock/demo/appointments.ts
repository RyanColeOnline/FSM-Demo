import { CanonicalAppointment } from '../../types/appointment';
import { DEMO_JOBS } from './jobs';

export const DEMO_APPOINTMENTS: CanonicalAppointment[] = DEMO_JOBS.flatMap(
  (job) => job.appointments || []
);
