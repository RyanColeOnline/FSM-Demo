import { CanonicalMaintenancePlan } from "../types/maintenancePlan";
import maintenancePlansJson from "./maintenance_plans.json";

export const CANONICAL_MOCK_MAINTENANCE_PLANS: CanonicalMaintenancePlan[] = maintenancePlansJson as unknown as CanonicalMaintenancePlan[];
