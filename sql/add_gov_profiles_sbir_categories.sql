-- Internal SBIR Tech Marketplace category filters per gov profile (not shown in user UI).
ALTER TABLE gov_profiles
  ADD COLUMN IF NOT EXISTS sbir_categories text[];

COMMENT ON COLUMN gov_profiles.sbir_categories IS
  'Internal SBIR Tech Marketplace category filters; not shown in user UI.';
