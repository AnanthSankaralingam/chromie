// service.js
// Secure helper for creating Supabase service role clients
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role key for server-side operations
 * This client has full database access and bypasses RLS policies
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient|null} Supabase client or null if credentials are missing
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.warn('[supabase/service] Missing Supabase credentials - service client disabled')
    return null
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

