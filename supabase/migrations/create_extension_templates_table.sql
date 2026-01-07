-- Create extension_templates table for storing template files
CREATE TABLE IF NOT EXISTS public.extension_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  frontend_type text NOT NULL,
  file_path text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique file paths per template/frontend combination
  UNIQUE(template_name, frontend_type, file_path)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_extension_templates_template_name ON public.extension_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_extension_templates_template_frontend ON public.extension_templates(template_name, frontend_type);

-- Enable RLS
ALTER TABLE public.extension_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read all templates (templates are shared resources)

-- SELECT: Authenticated users can view all templates
CREATE POLICY extension_templates_select_authenticated
  ON public.extension_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: INSERT/UPDATE/DELETE are not granted to regular users
-- These operations should be performed via service role (migration scripts)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extension_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_extension_templates_updated_at_trigger
  BEFORE UPDATE ON public.extension_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_extension_templates_updated_at();

-- Add comment
COMMENT ON TABLE public.extension_templates IS 'Stores template files for Chrome extension templates. Templates are shared resources accessible to all authenticated users.';
