-- Enable pgcrypto extension for cryptographic functions (hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add API key columns to projects table
-- API keys are hashed for security and never stored in plaintext
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS api_key_prefix text,
  ADD COLUMN IF NOT EXISTS api_key_last_used_at timestamptz;

-- Create index on api_key_hash for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_projects_api_key_hash ON public.projects(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- Function to generate a secure API key
-- Returns: { key: 'chromie_live_...', keyHash: 'sha256_hash', keyPrefix: 'chromie_live_abc...xyz' }
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TABLE (
  key text,
  key_hash text,
  key_prefix text
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
  
  RETURN QUERY SELECT v_key, v_key_hash, v_key_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate an API key and return project_id
-- Used by metrics ingestion endpoints to authenticate requests
CREATE OR REPLACE FUNCTION validate_api_key(p_key text)
RETURNS TABLE (
  project_id uuid,
  project_name text
) AS $$
DECLARE
  v_key_hash text;
  v_result RECORD;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(digest(p_key, 'sha256'), 'hex');
  
  -- Look up the project by key hash
  SELECT 
    p.id,
    p.name
  INTO v_result
  FROM public.projects p
  WHERE p.api_key_hash = v_key_hash
    AND p.archived = false;
  
  IF v_result IS NULL THEN
    RETURN; -- No matching key found
  END IF;
  
  -- Update last_used_at
  UPDATE public.projects
  SET api_key_last_used_at = now()
  WHERE id = v_result.id;
  
  -- Return the project info
  RETURN QUERY SELECT v_result.id, v_result.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN public.projects.api_key_hash IS 'SHA-256 hash of the API key (never stored in plaintext)';
COMMENT ON COLUMN public.projects.api_key_prefix IS 'Display prefix for showing truncated key in UI (e.g., chromie_live_abc...xyz)';
COMMENT ON COLUMN public.projects.api_key_last_used_at IS 'Timestamp of last successful API key authentication';
COMMENT ON FUNCTION generate_api_key() IS 'Generates a new secure API key with hash and prefix';
COMMENT ON FUNCTION validate_api_key(text) IS 'Validates an API key and returns associated project_id';
