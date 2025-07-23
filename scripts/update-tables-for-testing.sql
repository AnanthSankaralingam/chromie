-- Add testing-related columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE;

-- Create test_sessions table to track active testing sessions
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  browserbase_session_id TEXT,
  iframe_url TEXT,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on test_sessions
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for test_sessions
CREATE POLICY "Users can view own test sessions" ON test_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create test sessions" ON test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own test sessions" ON test_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own test sessions" ON test_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_test_sessions_project_id ON test_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
