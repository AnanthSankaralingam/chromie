-- Update shared_links table to increase expiry time from 1 day to 7 days
-- This migration changes the default expires_at value from 24 hours to 7 days
-- Also adds view_count tracking

-- Update expiry default from 24 hours to 7 days
ALTER TABLE public.shared_links
  ALTER COLUMN expires_at
  SET DEFAULT (now() + '7 days'::interval);

-- Add view_count column to track how many times the share page was viewed
ALTER TABLE public.shared_links
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0 NOT NULL;

-- Add comments documenting the changes
COMMENT ON COLUMN public.shared_links.expires_at IS 'Share link expiration time - defaults to 7 days from creation';
COMMENT ON COLUMN public.shared_links.view_count IS 'Number of times the share page was viewed (separate from downloads)';

-- Optional: Update existing active shares to extend their expiry if needed
-- Uncomment the following lines if you want to extend existing non-expired shares
-- UPDATE public.shared_links
-- SET expires_at = created_at + '7 days'::interval
-- WHERE is_active = true
--   AND expires_at > now()
--   AND expires_at < (created_at + '7 days'::interval);
