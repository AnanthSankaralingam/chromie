-- Create project_assets table for storing user-uploaded files (including custom icons)
CREATE TABLE IF NOT EXISTS public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content_base64 text NOT NULL,
  file_type text NOT NULL, -- 'icon', 'asset', 'data', etc.
  mime_type text NOT NULL DEFAULT 'image/png',
  file_size integer NOT NULL, -- Size in bytes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique file paths per project
  UNIQUE(project_id, file_path)
);

-- Create index for faster project lookups
CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON public.project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_file_type ON public.project_assets(project_id, file_type);

-- Enable RLS
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access assets for projects they own

-- SELECT: Users can view assets for their own projects
CREATE POLICY project_assets_select_own_projects
  ON public.project_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- INSERT: Users can add assets to their own projects
CREATE POLICY project_assets_insert_own_projects
  ON public.project_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update assets in their own projects
CREATE POLICY project_assets_update_own_projects
  ON public.project_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete assets from their own projects
CREATE POLICY project_assets_delete_own_projects
  ON public.project_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_project_assets_updated_at_trigger
  BEFORE UPDATE ON public.project_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_project_assets_updated_at();

-- Add comment
COMMENT ON TABLE public.project_assets IS 'Stores user-uploaded files and custom icons for Chrome extensions';

