-- RLS policy updates for collaborator access
-- Run AFTER create_project_collaborators.sql
-- These add collaborator access to project-related tables

-- code_files: allow collaborators to SELECT, INSERT, UPDATE, DELETE
-- Note: If policies have different names in your Supabase project, adjust accordingly.
-- You may need to DROP existing policies first: DROP POLICY IF EXISTS <policy_name> ON <table>;

-- Add collaborator SELECT policy (OR with existing owner policy)
CREATE POLICY code_files_select_collaborator ON code_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = code_files.project_id AND user_id = auth.uid())
  );

-- Add collaborator INSERT policy
CREATE POLICY code_files_insert_collaborator ON code_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = code_files.project_id AND user_id = auth.uid())
  );

-- Add collaborator UPDATE policy
CREATE POLICY code_files_update_collaborator ON code_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = code_files.project_id AND user_id = auth.uid())
  );

-- Add collaborator DELETE policy
CREATE POLICY code_files_delete_collaborator ON code_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = code_files.project_id AND user_id = auth.uid())
  );

-- conversations
CREATE POLICY conversations_select_collaborator ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = conversations.project_id AND user_id = auth.uid())
  );

CREATE POLICY conversations_insert_collaborator ON conversations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = conversations.project_id AND user_id = auth.uid())
  );

CREATE POLICY conversations_update_collaborator ON conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = conversations.project_id AND user_id = auth.uid())
  );

CREATE POLICY conversations_delete_collaborator ON conversations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = conversations.project_id AND user_id = auth.uid())
  );

-- project_assets
CREATE POLICY project_assets_select_collaborator ON project_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_assets.project_id AND user_id = auth.uid())
  );

CREATE POLICY project_assets_insert_collaborator ON project_assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_assets.project_id AND user_id = auth.uid())
  );

CREATE POLICY project_assets_update_collaborator ON project_assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_assets.project_id AND user_id = auth.uid())
  );

CREATE POLICY project_assets_delete_collaborator ON project_assets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_assets.project_id AND user_id = auth.uid())
  );

-- project_versions
CREATE POLICY project_versions_select_collaborator ON project_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_versions.project_id AND user_id = auth.uid())
  );

CREATE POLICY project_versions_insert_collaborator ON project_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_versions.project_id AND user_id = auth.uid())
  );

CREATE POLICY project_versions_delete_collaborator ON project_versions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_versions.project_id AND user_id = auth.uid())
  );
