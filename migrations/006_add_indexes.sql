-- =====================================================
-- 006_add_indexes.sql
-- Additional indexes for query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_station_is_active
  ON station (is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_measurement_ts
  ON measurement (ts DESC);
