-- Agent File Operations Audit Table
-- Tracks all file operations performed by AI agents for auditing and debugging

CREATE TABLE IF NOT EXISTS agent_file_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_type text NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  file_path text NOT NULL,
  reason text,
  user_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_file_ops_project 
  ON agent_file_operations(project_id);

CREATE INDEX IF NOT EXISTS idx_agent_file_ops_created 
  ON agent_file_operations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_file_ops_type 
  ON agent_file_operations(operation_type);

-- Enable Row Level Security
ALTER TABLE agent_file_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view operations for their own projects
CREATE POLICY agent_file_ops_select_own ON agent_file_operations
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Service role can insert (for server-side logging)
-- Note: This policy allows authenticated users to insert, but the actual inserts
-- should be done via service role in the application code to bypass RLS
CREATE POLICY agent_file_ops_insert ON agent_file_operations
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies - audit logs are immutable

COMMENT ON TABLE agent_file_operations IS 'Audit log for all file operations performed by AI agents';
COMMENT ON COLUMN agent_file_operations.operation_type IS 'Type of operation: create, update, or delete';
COMMENT ON COLUMN agent_file_operations.file_path IS 'Path of the file that was operated on';
COMMENT ON COLUMN agent_file_operations.reason IS 'AI agent explanation for why this operation was performed';
COMMENT ON COLUMN agent_file_operations.user_confirmed IS 'Whether the user explicitly approved this operation';
