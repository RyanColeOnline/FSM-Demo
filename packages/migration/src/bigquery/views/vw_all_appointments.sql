-- ==============================================================================
-- View: vw_all_appointments
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
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dateTime')) AS scheduled_date_time,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.arrivedAt')) AS arrived_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.completedAt')) AS completed_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.appointments_raw_latest`

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
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.dateTime')) AS scheduled_date_time,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.arrivedAt')) AS arrived_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.completedAt')) AS completed_at,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.archive_appointments_raw_latest`;
