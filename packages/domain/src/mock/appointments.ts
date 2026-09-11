import { CanonicalAppointment } from "../types/appointment";
import appointmentsJson from "./appointments.json";
import { DEMO_APPOINTMENTS_SEPT_2026 } from "./demo/demo-appointments-dataset";

export const CANONICAL_MOCK_APPOINTMENTS: CanonicalAppointment[] = [
  ...DEMO_APPOINTMENTS_SEPT_2026,
  ...(appointmentsJson as unknown as CanonicalAppointment[]),
];
