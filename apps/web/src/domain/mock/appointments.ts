import { CanonicalAppointment } from "../types/appointment";
import appointmentsJson from "./appointments.json";

export const CANONICAL_MOCK_APPOINTMENTS: CanonicalAppointment[] = appointmentsJson as unknown as CanonicalAppointment[];
