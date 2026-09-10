-- ==============================================================================
-- Murphy's FSM - Production BigQuery Analytical Views
-- Dataset: murphys-fsm-staging.fsm_analytics
-- Bridges Live (Jan 10, 2025+) and Historical Archive (2015 - Jan 9, 2025) Data
-- ==============================================================================

-- ==============================================================================
-- View 1: vw_all_jobs
-- Description: Unified analytical view of all jobs (2015-Present).
-- Combines Live and Archive datasets.
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
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.jobPrice'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.jobPrice') AS FLOAT64)
  ) AS job_price,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.invoicesTotal'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.invoicesTotal') AS FLOAT64)
  ) AS invoices_total,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.balance'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.balance') AS FLOAT64)
  ) AS balance,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.uncollected'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.uncollected') AS FLOAT64)
  ) AS uncollected,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.locationCity') AS location_city,
  JSON_VALUE(data, '$.locationState') AS location_state,
  JSON_VALUE(data, '$.locationZip') AS location_zip,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.jobCreationDate._seconds') AS INT64))
  ) AS job_creation_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.dueDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.dueDate._seconds') AS INT64))
  ) AS due_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.updatedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.updatedAt._seconds') AS INT64))
  ) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.jobs_raw_latest`
WHERE document_id != '_archive_metadata'

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
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.jobPrice'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.jobPrice') AS FLOAT64)
  ) AS job_price,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.invoicesTotal'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.invoicesTotal') AS FLOAT64)
  ) AS invoices_total,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.balance'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.balance') AS FLOAT64)
  ) AS balance,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.uncollected'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.uncollected') AS FLOAT64)
  ) AS uncollected,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.locationCity') AS location_city,
  JSON_VALUE(data, '$.locationState') AS location_state,
  JSON_VALUE(data, '$.locationZip') AS location_zip,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.jobCreationDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.jobCreationDate._seconds') AS INT64))
  ) AS job_creation_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.dueDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.dueDate._seconds') AS INT64))
  ) AS due_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.updatedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.updatedAt._seconds') AS INT64))
  ) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.archive_jobs_raw_latest`
WHERE document_id != '_archive_metadata';


-- ==============================================================================
-- View 2: vw_all_invoices
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
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.subtotal'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.subtotal') AS FLOAT64)
  ) AS subtotal,
  SAFE_CAST(JSON_VALUE(data, '$.taxRate') AS FLOAT64) AS tax_rate,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.taxAmount'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.taxAmount') AS FLOAT64)
  ) AS tax_amount,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.total'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.total') AS FLOAT64)
  ) AS total_amount,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.amountPaid'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.amountPaid') AS FLOAT64)
  ) AS amount_paid,
  COALESCE(
    SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.balanceDue'), r'[^\d.-]', '') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.balanceDue') AS FLOAT64),
    CASE
      WHEN COALESCE(JSON_VALUE(data, '$.status'), 'Draft') IN ('Open - draft', 'Presented', 'Signed', 'Pending', 'Unpaid')
        THEN (COALESCE(SAFE_CAST(JSON_VALUE(data, '$.total') AS FLOAT64), 0.0) - COALESCE(SAFE_CAST(JSON_VALUE(data, '$.amountPaid') AS FLOAT64), 0.0))
      ELSE 0.0
    END
  ) AS balance_due,
  JSON_VALUE(data, '$.billToCustomer') AS bill_to_customer,
  JSON_VALUE(data, '$.billingAddress') AS billing_address,
  JSON_VALUE(data, '$.jobLocation') AS job_location,
  JSON_VALUE(data, '$.technician') AS technician,
  JSON_VALUE(data, '$.stripePaymentIntentId') AS stripe_payment_intent_id,
  JSON_VALUE(data, '$.qbInvoiceId') AS qb_invoice_id,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.issueDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.issueDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.issueDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.issueDate._seconds') AS INT64))
  ) AS issue_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.dueDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.dueDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.dueDate._seconds') AS INT64))
  ) AS due_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.updatedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.updatedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.updatedAt._seconds') AS INT64))
  ) AS updated_at
FROM `murphys-fsm-staging.fsm_analytics.invoices_raw_latest`
WHERE document_id != '_archive_metadata';


-- ==============================================================================
-- View 3: vw_all_appointments
-- Description: Unified appointments view bridging live and archive records.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_all_appointments` AS
SELECT
  document_id,
  'live' AS data_tier,
  COALESCE(JSON_VALUE(data, '$.appointmentId'), document_id) AS appointment_id,
  JSON_VALUE(data, '$.jobId') AS job_id,
  SAFE_CAST(JSON_VALUE(data, '$.jobNumber') AS INT64) AS job_number,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.customerName') AS customer_name,
  COALESCE(JSON_VALUE(data, '$.status'), 'Assigned') AS status,
  COALESCE(JSON_VALUE(data, '$.jobType'), 'Diagnostic') AS job_type,
  JSON_VALUE(data, '$.assignedTech') AS assigned_tech,
  SAFE_CAST(JSON_VALUE(data, '$.durationHours') AS FLOAT64) AS duration_hours,
  SAFE_CAST(JSON_VALUE(data, '$.actualDurationHours') AS FLOAT64) AS actual_duration_hours,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.coverageZone') AS coverage_zone,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dateTime')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.dateTime')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.dateTime._seconds') AS INT64))
  ) AS scheduled_date_time,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.arrivedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.arrivedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.arrivedAt._seconds') AS INT64))
  ) AS arrived_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.completedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.completedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.completedAt._seconds') AS INT64))
  ) AS completed_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.appointments_raw_latest`
WHERE document_id != '_archive_metadata'

UNION ALL

SELECT
  document_id,
  'archive' AS data_tier,
  COALESCE(JSON_VALUE(data, '$.appointmentId'), document_id) AS appointment_id,
  JSON_VALUE(data, '$.jobId') AS job_id,
  SAFE_CAST(JSON_VALUE(data, '$.jobNumber') AS INT64) AS job_number,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.customerName') AS customer_name,
  COALESCE(JSON_VALUE(data, '$.status'), 'Completed') AS status,
  COALESCE(JSON_VALUE(data, '$.jobType'), 'Diagnostic') AS job_type,
  JSON_VALUE(data, '$.assignedTech') AS assigned_tech,
  SAFE_CAST(JSON_VALUE(data, '$.durationHours') AS FLOAT64) AS duration_hours,
  SAFE_CAST(JSON_VALUE(data, '$.actualDurationHours') AS FLOAT64) AS actual_duration_hours,
  JSON_VALUE(data, '$.locationAddress') AS location_address,
  JSON_VALUE(data, '$.coverageZone') AS coverage_zone,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dateTime')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.dateTime')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.dateTime._seconds') AS INT64))
  ) AS scheduled_date_time,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.arrivedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.arrivedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.arrivedAt._seconds') AS INT64))
  ) AS arrived_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.completedAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.completedAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.completedAt._seconds') AS INT64))
  ) AS completed_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.archive_appointments_raw_latest`
WHERE document_id != '_archive_metadata';


-- ==============================================================================
-- View 4: vw_all_customers
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
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.lastVisitDate')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.lastVisitDate')),
    SAFE.PARSE_TIMESTAMP('%m/%d/%Y', JSON_VALUE(data, '$.lastVisitDate')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.lastVisitDate._seconds') AS INT64))
  ) AS last_visit_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.customers_raw_latest`
WHERE document_id != '_archive_metadata';


-- ==============================================================================
-- View 5: vw_all_equipment
-- Description: Installed equipment, systems, and warranty coverage tracking.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_all_equipment` AS
SELECT
  document_id AS equipment_id,
  JSON_VALUE(data, '$.customerId') AS customer_id,
  JSON_VALUE(data, '$.customerName') AS customer_name,
  JSON_VALUE(data, '$.systemName') AS system_name,
  COALESCE(JSON_VALUE(data, '$.equipmentName'), JSON_VALUE(data, '$.name')) AS equipment_name,
  COALESCE(JSON_VALUE(data, '$.equipmentStatus'), 'active') AS equipment_status,
  JSON_VALUE(data, '$.systemAge') AS system_age,
  JSON_VALUE(data, '$.modelNumber') AS model_number,
  JSON_VALUE(data, '$.serialNumber') AS serial_number,
  JSON_VALUE(data, '$.manufacturer') AS manufacturer,
  JSON_VALUE(data, '$.systemType') AS system_type,
  JSON_VALUE(data, '$.manufacturerWarrantyName') AS manufacturer_warranty_name,
  JSON_VALUE(data, '$.manufacturerWarrantyStatus') AS manufacturer_warranty_status,
  COALESCE(
    SAFE.PARSE_DATE('%m/%d/%Y', JSON_VALUE(data, '$.installationDate')),
    SAFE.PARSE_DATE('%Y-%m-%d', JSON_VALUE(data, '$.installationDate'))
  ) AS installation_date,
  COALESCE(
    SAFE.PARSE_DATE('%m/%d/%Y', JSON_VALUE(data, '$.manufacturerWarrantyEffectiveEnd')),
    SAFE.PARSE_DATE('%Y-%m-%d', JSON_VALUE(data, '$.manufacturerWarrantyEffectiveEnd'))
  ) AS warranty_end_date,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S', JSON_VALUE(data, '$.createdAt')),
    SAFE.TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64))
  ) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.equipment_raw_latest`
WHERE document_id != '_archive_metadata';


-- ==============================================================================
-- View 6: vw_ar_aging
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


-- ==============================================================================
-- View 7: vw_job_profitability
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


-- ==============================================================================
-- View 8: vw_technician_productivity
-- Description: Technician performance metrics: completed appointments, hours, revenue.
-- ==============================================================================
CREATE OR REPLACE VIEW `murphys-fsm-staging.fsm_analytics.vw_technician_productivity` AS
SELECT
  a.assigned_tech AS technician_name,
  DATE(a.scheduled_date_time) AS work_date,
  COUNT(DISTINCT a.appointment_id) AS total_appointments,
  COUNTIF(a.status = 'Completed') AS completed_appointments,
  COUNTIF(a.status IN ('Cancelled', 'On hold')) AS cancelled_or_held,
  ROUND(SUM(COALESCE(a.actual_duration_hours, a.duration_hours, 0.0)), 2) AS total_hours_worked,
  ROUND(SAFE_DIVIDE(COUNTIF(a.status = 'Completed'), COUNT(DISTINCT a.appointment_id)) * 100, 1) AS completion_rate_pct
FROM `murphys-fsm-staging.fsm_analytics.vw_all_appointments` a
WHERE a.assigned_tech IS NOT NULL AND a.assigned_tech != ''
GROUP BY 1, 2;


-- ==============================================================================
-- View 9: vw_tax_liability
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
