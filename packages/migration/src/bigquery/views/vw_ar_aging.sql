-- ==============================================================================
-- View: vw_ar_aging
-- Description: Accounts Receivable aging analysis by customer, invoice, and age tier.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_ar_aging` AS
WITH invoice_base AS (
  SELECT
    invoice_number,
    customer_id,
    bill_to_customer,
    status,
    total_amount,
    amount_paid,
    balance_due,
    due_date,
    issue_date,
    DATE_DIFF(CURRENT_DATE(), DATE(COALESCE(due_date, issue_date)), DAY) AS days_outstanding
  FROM `murphys-fsm-staging.fsm_analytics.vw_all_invoices`
  WHERE balance_due > 0 AND status NOT IN ('Void', 'Draft')
)
SELECT
  invoice_number,
  customer_id,
  bill_to_customer,
  status,
  total_amount,
  amount_paid,
  balance_due,
  due_date,
  days_outstanding,
  CASE
    WHEN days_outstanding <= 0 THEN 'Current (Not Due)'
    WHEN days_outstanding BETWEEN 1 AND 30 THEN '1-30 Days'
    WHEN days_outstanding BETWEEN 31 AND 60 THEN '31-60 Days'
    WHEN days_outstanding BETWEEN 61 AND 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END AS aging_bucket,
  CASE
    WHEN days_outstanding <= 0 THEN 1
    WHEN days_outstanding BETWEEN 1 AND 30 THEN 2
    WHEN days_outstanding BETWEEN 31 AND 60 THEN 3
    WHEN days_outstanding BETWEEN 61 AND 90 THEN 4
    ELSE 5
  END AS aging_bucket_order
FROM invoice_base;
