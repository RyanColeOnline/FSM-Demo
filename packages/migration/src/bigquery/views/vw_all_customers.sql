-- ==============================================================================
-- View: vw_all_customers
-- Description: Flattened dimensions for customers, contacts, and lifetime metrics.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_all_customers` AS
SELECT
  document_id AS customer_id,
  JSON_VALUE(data, '$.customerNumber') AS customer_number,
  JSON_VALUE(data, '$.name') AS full_name,
  JSON_VALUE(data, '$.businessName') AS business_name,
  JSON_VALUE(data, '$.qbName') AS qb_name,
  JSON_VALUE(data, '$.phone') AS phone,
  JSON_VALUE(data, '$.email') AS email,
  COALESCE(JSON_VALUE(data, '$.customerType'), 'residential') AS customer_type,
  COALESCE(JSON_VALUE(data, '$.customerStatus'), 'Active') AS customer_status,
  JSON_VALUE(data, '$.address.street') AS street,
  JSON_VALUE(data, '$.address.city') AS city,
  JSON_VALUE(data, '$.address.state') AS state,
  JSON_VALUE(data, '$.address.zipCode') AS zip_code,
  JSON_VALUE(data, '$.maintenancePlanStatus') AS maintenance_plan_status,
  SAFE_CAST(JSON_VALUE(data, '$.financials.totalInvoiced') AS FLOAT64) AS total_invoiced,
  SAFE_CAST(JSON_VALUE(data, '$.financials.totalProposed') AS FLOAT64) AS total_proposed,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.lastVisitDate')) AS last_visit_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.customers_raw_latest`;
