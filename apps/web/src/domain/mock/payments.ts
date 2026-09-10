import { CanonicalPaymentRecord } from "../types/payment";
import paymentsJson from "./payments.json";

export const CANONICAL_MOCK_PAYMENT_RECORDS: CanonicalPaymentRecord[] = paymentsJson as unknown as CanonicalPaymentRecord[];
export const MOCK_PAYMENTS_DATA: CanonicalPaymentRecord[] = CANONICAL_MOCK_PAYMENT_RECORDS;
