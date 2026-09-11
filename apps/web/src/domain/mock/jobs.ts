import { CanonicalJob } from "../types/appointment";
import jobsJson from "./jobs.json";
import { DEMO_JOBS_SEPT_2026 } from "./demo-appointments-dataset";

export const CANONICAL_MOCK_JOBS: CanonicalJob[] = [
  ...DEMO_JOBS_SEPT_2026,
  ...(jobsJson as unknown as CanonicalJob[]),
];
