import { CanonicalProposal } from "../types/proposal";
import proposalsJson from "./proposals.json";

export const CANONICAL_MOCK_PROPOSALS: CanonicalProposal[] = proposalsJson as unknown as CanonicalProposal[];
