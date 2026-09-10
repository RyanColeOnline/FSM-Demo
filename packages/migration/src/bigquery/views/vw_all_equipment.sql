-- ==============================================================================
-- View: vw_all_equipment
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
  SAFE.PARSE_DATE('%m/%d/%Y', JSON_VALUE(data, '$.installationDate')) AS installation_date,
  SAFE.PARSE_DATE('%m/%d/%Y', JSON_VALUE(data, '$.manufacturerWarrantyEffectiveEnd')) AS warranty_end_date,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.createdAt')) AS created_at
FROM `murphys-fsm-staging.fsm_analytics.equipment_raw_latest`;
