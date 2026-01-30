/**
 * Generate a URL-safe slug from project name
 * @param {string} projectName - The project name
 * @param {string} projectId - The project ID for uniqueness
 * @returns {string} - URL-safe slug
 */
export function generatePrivacySlug(projectName, projectId) {
  // Sanitize and convert to lowercase
  let slug = String(projectName || 'privacy')
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 50)

  // Fallback if slug is empty
  if (!slug) {
    slug = 'privacy'
  }

  // Add short random suffix from project ID for uniqueness
  const suffix = projectId.split('-')[0].slice(0, 8)
  return `${slug}-${suffix}`
}

/**
 * Check if privacy policy slug is available
 * @param {string} slug - The slug to check
 * @param {Object} supabase - Supabase client
 * @param {string} excludeProjectId - Project ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if available
 */
export async function isPrivacySlugAvailable(slug, supabase, excludeProjectId = null) {
  let query = supabase
    .from('projects')
    .select('id')
    .eq('privacy_slug', slug)
    .limit(1)

  if (excludeProjectId) {
    query = query.neq('id', excludeProjectId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('Error checking slug availability:', error)
    return false
  }

  return !data
}

/**
 * Validate privacy policy content
 * @param {string} content - Markdown content
 * @returns {Object} - Validation result with isValid and error properties
 */
export function validatePrivacyPolicyContent(content) {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Privacy policy content is required' }
  }

  const trimmed = content.trim()

  if (trimmed.length < 100) {
    return { isValid: false, error: 'Privacy policy must be at least 100 characters' }
  }

  if (trimmed.length > 50000) {
    return { isValid: false, error: 'Privacy policy must be less than 50,000 characters' }
  }

  return { isValid: true, error: null }
}
