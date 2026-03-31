-- Add is_admin column to profiles for admin console access
-- Grant admin via: UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
