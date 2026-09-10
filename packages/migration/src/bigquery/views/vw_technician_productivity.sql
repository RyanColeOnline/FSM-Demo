-- ==============================================================================
-- View: vw_technician_productivity
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
