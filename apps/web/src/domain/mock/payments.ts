import { CanonicalPaymentRecord } from "../types/payment";
import { DEMO_PAYMENTS } from "./demo/payments";

export { DEMO_PAYMENTS };
export const CANONICAL_MOCK_PAYMENT_RECORDS: CanonicalPaymentRecord[] = [...DEMO_PAYMENTS];
export const MOCK_PAYMENTS_DATA: CanonicalPaymentRecord[] = CANONICAL_MOCK_PAYMENT_RECORDS;
