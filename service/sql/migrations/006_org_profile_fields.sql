-- Adds location + pulse metadata to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS state_province TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS pulse_score NUMERIC(5,2);

UPDATE organizations
SET state_province = COALESCE(state_province, 'Ontario'),
    country = COALESCE(country, 'Canada'),
    pulse_score = COALESCE(pulse_score, 82.0)
WHERE slug = 'demo-org';
