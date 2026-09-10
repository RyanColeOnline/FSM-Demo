import { CanonicalJob } from "../types/appointment";
import jobsJson from "./jobs.json";

export const CANONICAL_MOCK_JOBS: CanonicalJob[] = jobsJson as unknown as CanonicalJob[];
