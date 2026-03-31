-- Project collaborators: users who have access to a project (owner + invited collaborators)
-- Run this migration in Supabase SQL editor

-- 1. project_collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON project_collaborators(user_id);

-- 2. project_invites table: invite links (anyone with link can join as collaborator)
CREATE TABLE IF NOT EXISTS project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invite_token text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_project_invites_token ON project_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_project_invites_project ON project_invites(project_id);

-- 3. Helper function: user has access to project (owner or collaborator)
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS for project_collaborators
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- Owners and collaborators can view collaborators for projects they have access to
CREATE POLICY project_collaborators_select ON project_collaborators
  FOR SELECT USING (user_has_project_access(project_id));

-- Only project owners can insert collaborators
CREATE POLICY project_collaborators_insert ON project_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

-- Owners can remove collaborators; collaborators can remove themselves
CREATE POLICY project_collaborators_delete ON project_collaborators
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- 5. RLS for project_invites
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- Owners and collaborators can view invites for projects they have access to
CREATE POLICY project_invites_select ON project_invites
  FOR SELECT USING (user_has_project_access(project_id));

-- Only project owners can create invites
CREATE POLICY project_invites_insert ON project_invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

-- Only project owners can update/delete invites
CREATE POLICY project_invites_update ON project_invites
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY project_invites_delete ON project_invites
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

-- 6. Update projects RLS: allow collaborators to SELECT projects they have access to
-- Multiple SELECT policies are OR'd - this adds collaborator access to existing owner policy
CREATE POLICY projects_select_collaborator ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = projects.id AND user_id = auth.uid())
  );
