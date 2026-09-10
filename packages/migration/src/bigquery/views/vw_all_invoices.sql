-- ==============================================================================
-- View: vw_all_invoices
-- Description: Flattened analytical view of all customer invoices.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_all_invoices` AS
SELECT
  document_id,
  JSON_VALUE(data, '$.invoiceNumber') AS invoice_number,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.jobId') AS job_id,
  SAFE_CAST(JSON_VALUE(data, '$.jobNumber') AS INT64) AS job_number,
  JSON_VALUE(data, '$.appointmentId') AS appointment_id,
  COALESCE(JSON_VALUE(data, '$.status'), 'Draft') AS status,
  JSON_VALUE(data, '$.paymentTerms') AS payment_terms,
  SAFE_CAST(JSON_VALUE(data, '$.subtotal') AS FLOAT64) AS subtotal,
  SAFE_CAST(JSON_VALUE(data, '$.taxRate') AS FLOAT64) AS tax_rate,
  SAFE_CAST(JSON_VALUE(data, '$.taxAmount') AS FLOAT64) AS tax_amount,
  SAFE_CAST(JSON_VALUE(data, '$.total') AS FLOAT64) AS total_amount,
  SAFE_CAST(JSON_VALUE(data, '$.amountPaid') AS FLOAT64) AS amount_paid,
  SAFE_CAST(JSON_VALUE(data, '$.balanceDue') AS FLOAT64) AS balance_due,
  JSON_VALUE(data, '$.billToCustomer') AS bill_to_customer,
  JSON_VALUE(data, '$.billingAddress') AS billing_address,
  JSON_VALUE(data, '$.jobLocation') AS job_location,
  JSON_VALUE(data, '$.technician') AS technician,
  JSON_VALUE(data, '$.stripePaymentIntentId') AS stripe_payment_intent_id,
  JSON_VALUE(data, '$.qbInvoiceId') AS qb_invoice_id,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.issueDate')) AS issue_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')) AS due_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.invoices_raw_latest`;
