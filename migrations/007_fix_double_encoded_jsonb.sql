-- =====================================================
-- 007_fix_double_encoded_jsonb.sql
-- Oprava JSONB uloženého jako string (dvojí JSON.stringify přes postgres.js)
-- =====================================================

-- station.meta: rozbalit string zpět na objekt z meta1.json
UPDATE station
SET meta = (meta #>> '{}')::jsonb
WHERE jsonb_typeof(meta) = 'string';

-- ingest_run.details: totéž
UPDATE ingest_run
SET details = (details #>> '{}')::jsonb
WHERE jsonb_typeof(details) = 'string';

-- river.meta: string "{}" nebo pole vzniklé spojením stringu s objektem;
-- obsahuje jen cache geometrie, takže stačí reset
UPDATE river
SET meta = '{}'::jsonb
WHERE jsonb_typeof(meta) <> 'object';
