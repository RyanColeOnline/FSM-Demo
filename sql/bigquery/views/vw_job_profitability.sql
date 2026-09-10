-- ==============================================================================
-- View: vw_job_profitability
-- Description: Profitability by job, job type, and trade category across 2015-Present.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_job_profitability` AS
SELECT
  j.job_number,
  j.wex_job_id,
  j.data_tier,
  j.customer_name,
  j.job_type,
  j.status AS job_status,
  j.assigned_tech,
  DATE(j.job_creation_date) AS job_date,
  COALESCE(j.invoices_total, j.job_price, 0.0) AS billed_revenue,
  COALESCE(j.balance, j.uncollected, 0.0) AS outstanding_balance,
  (COALESCE(j.invoices_total, j.job_price, 0.0) - COALESCE(j.balance, j.uncollected, 0.0)) AS collected_revenue
FROM `murphys-fsm-staging.fsm_analytics.vw_all_jobs` j;
