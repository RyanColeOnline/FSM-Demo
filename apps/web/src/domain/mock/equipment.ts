import { CanonicalEquipment } from "../types/equipment";
import equipmentJson from "./equipment.json";

export const CANONICAL_MOCK_EQUIPMENT: CanonicalEquipment[] = (equipmentJson as unknown) as CanonicalEquipment[];
