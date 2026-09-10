-- ==============================================================================
-- View: vw_all_jobs
-- Description: Unified analytical view of all jobs (2015-Present).
-- Combines Live (Jan 10, 2025+) and Archive (Pre-Jan 10, 2025) datasets.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_all_jobs` AS
SELECT
  document_id,
  'live' AS data_tier,
  SAFE_CAST(JSON_VALUE(data, '$.jobNumber') AS INT64) AS job_number,
  JSON_VALUE(data, '$.wexJobId') AS wex_job_id,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.customerNumber') AS customer_number,
  JSON_VALUE(data, '$.customerName') AS customer_name,
  JSON_VALUE(data, '$.jobName') AS job_name,
  COALESCE(JSON_VALUE(data, '$.status'), 'Opened') AS status,
  COALESCE(JSON_VALUE(data, '$.jobType'), 'Diagnostic') AS job_type,
  JSON_VALUE(data, '$.stage') AS stage,
  JSON_VALUE(data, '$.assignedTech') AS assigned_tech,
  JSON_VALUE(data, '$.assignee') AS assignee,
  SAFE_CAST(JSON_VALUE(data, '$.jobPrice') AS FLOAT64) AS job_price,
  SAFE_CAST(JSON_VALUE(data, '$.invoicesTotal') AS FLOAT64) AS invoices_total,
  SAFE_CAST(JSON_VALUE(data, '$.balance') AS FLOAT64) AS balance,
  SAFE_CAST(JSON_VALUE(data, '$.uncollected') AS FLOAT64) AS uncollected,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.locationCity') AS location_city,
  JSON_VALUE(data, '$.locationState') AS location_state,
  JSON_VALUE(data, '$.locationZip') AS location_zip,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.jobCreationDate')) AS job_creation_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')) AS due_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.jobs_raw_latest`

UNION ALL

SELECT
  document_id,
  'archive' AS data_tier,
  SAFE_CAST(JSON_VALUE(data, '$.jobNumber') AS INT64) AS job_number,
  COALESCE(JSON_VALUE(data, '$.wexJobId'), JSON_VALUE(data, '$.job_id')) AS wex_job_id,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.customerNumber') AS customer_number,
  JSON_VALUE(data, '$.customerName') AS customer_name,
  JSON_VALUE(data, '$.jobName') AS job_name,
  COALESCE(JSON_VALUE(data, '$.status'), 'Closed') AS status,
  COALESCE(JSON_VALUE(data, '$.jobType'), 'Diagnostic') AS job_type,
  JSON_VALUE(data, '$.stage') AS stage,
  JSON_VALUE(data, '$.assignedTech') AS assigned_tech,
  JSON_VALUE(data, '$.assignee') AS assignee,
  SAFE_CAST(JSON_VALUE(data, '$.jobPrice') AS FLOAT64) AS job_price,
  SAFE_CAST(JSON_VALUE(data, '$.invoicesTotal') AS FLOAT64) AS invoices_total,
  SAFE_CAST(JSON_VALUE(data, '$.balance') AS FLOAT64) AS balance,
  SAFE_CAST(JSON_VALUE(data, '$.uncollected') AS FLOAT64) AS uncollected,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.locationCity') AS location_city,
  JSON_VALUE(data, '$.locationState') AS location_state,
  JSON_VALUE(data, '$.locationZip') AS location_zip,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.jobCreationDate')) AS job_creation_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')) AS due_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.archive_jobs_raw_latest`;
