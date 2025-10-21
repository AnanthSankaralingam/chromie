-- RLS Policies for Public Share Access
-- Run these in your Supabase SQL editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS shared_links_public_read ON public.shared_links;
DROP POLICY IF EXISTS projects_public_read_shared ON public.projects;
DROP POLICY IF EXISTS profiles_public_read_shared ON public.profiles;
DROP POLICY IF EXISTS code_files_public_read_shared ON public.code_files;
DROP POLICY IF EXISTS shared_icons_read_global ON public.shared_icons;

-- 1. Allow public read access to shared_links for active, non-expired links
CREATE POLICY shared_links_public_read
  ON public.shared_links
  FOR SELECT
  USING (
    is_active = true 
    AND expires_at > now()
  );

-- 2. Allow public read access to projects that are referenced by active shared links
CREATE POLICY projects_public_read_shared
  ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.shared_links 
      WHERE shared_links.project_id = projects.id 
        AND shared_links.is_active = true 
        AND shared_links.expires_at > now()
    )
  );

-- 3. Allow public read access to profiles that own projects referenced by active shared links
CREATE POLICY profiles_public_read_shared
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.shared_links 
      JOIN public.projects ON projects.id = shared_links.project_id
      WHERE projects.user_id = profiles.id 
        AND shared_links.is_active = true 
        AND shared_links.expires_at > now()
    )
  );

-- 4. Allow public read access to code_files for projects referenced by active shared links
CREATE POLICY code_files_public_read_shared
  ON public.code_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.shared_links 
      WHERE shared_links.project_id = code_files.project_id 
        AND shared_links.is_active = true 
        AND shared_links.expires_at > now()
    )
  );

-- 5. Allow public read access to shared_icons (already exists but ensuring it's correct)
CREATE POLICY shared_icons_read_global
  ON public.shared_icons
  FOR SELECT
  USING (visibility = 'global');
