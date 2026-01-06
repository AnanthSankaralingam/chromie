-- Update generate_api_key function to accept project_id and update the project
-- This replaces the previous version that just generated keys without storing them

DROP FUNCTION IF EXISTS generate_api_key();

CREATE OR REPLACE FUNCTION generate_api_key(p_project_id uuid)
RETURNS TABLE (
  api_key text
) AS $$
DECLARE
  v_timestamp text;
  v_random text;
  v_key text;
  v_key_hash text;
  v_key_prefix text;
BEGIN
  -- Generate key components
  v_timestamp := encode(gen_random_bytes(8), 'base64');
  v_random := encode(gen_random_bytes(16), 'base64');
  v_key := 'chromie_live_' || replace(replace(v_timestamp, '/', '_'), '+', '-') || '_' || replace(replace(v_random, '/', '_'), '+', '-');

  -- Hash the key using SHA-256
  v_key_hash := encode(digest(v_key, 'sha256'), 'hex');

  -- Create display prefix (first 15 chars + ... + last 5 chars)
  IF length(v_key) > 20 THEN
    v_key_prefix := substring(v_key, 1, 15) || '...' || substring(v_key, length(v_key) - 4);
  ELSE
    v_key_prefix := v_key;
  END IF;

  -- Update the project with the key hash and prefix
  UPDATE public.projects
  SET
    api_key_hash = v_key_hash,
    api_key_prefix = v_key_prefix,
    api_key_last_used_at = now()
  WHERE id = p_project_id;

  -- Return the full API key (only time it will be shown)
  RETURN QUERY SELECT v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION generate_api_key(uuid) IS 'Generates a new secure API key for a project, stores hash and prefix, returns full key (shown only once)';
