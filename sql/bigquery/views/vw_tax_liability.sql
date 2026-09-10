-- ==============================================================================
-- View: vw_tax_liability
-- Description: Sales tax liability aggregation by period and jurisdiction.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_tax_liability` AS
SELECT
  DATE_TRUNC(DATE(issue_date), MONTH) AS tax_month,
  status AS invoice_status,
  COUNT(DISTINCT invoice_number) AS total_invoices,
  ROUND(SUM(subtotal), 2) AS total_taxable_sales,
  ROUND(SUM(tax_amount), 2) AS total_tax_collected,
  ROUND(SUM(total_amount), 2) AS gross_sales
FROM `murphys-fsm-staging.fsm_analytics.vw_all_invoices`
WHERE status NOT IN ('Void', 'Draft') AND issue_date IS NOT NULL
GROUP BY 1, 2;
