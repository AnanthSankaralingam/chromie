/**
 * Validation utilities for API endpoints
 */

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Share token validation regex (64 character hex string)
const SHARE_TOKEN_REGEX = /^[a-f0-9]{64}$/i

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map()

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID
 */
export function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid)
}

/**
 * Validate share token format
 * @param {string} token - Share token to validate
 * @returns {boolean} - True if valid share token
 */
export function isValidShareToken(token) {
  return typeof token === 'string' && SHARE_TOKEN_REGEX.test(token)
}

/**
 * Validate project ID
 * @param {string} projectId - Project ID to validate
 * @returns {Object} - Validation result with isValid and error
 */
export function validateProjectId(projectId) {
  if (!projectId) {
    return { isValid: false, error: 'Project ID is required' }
  }
  
  if (typeof projectId !== 'string') {
    return { isValid: false, error: 'Project ID must be a string' }
  }
  
  if (!isValidUUID(projectId)) {
    return { isValid: false, error: 'Invalid project ID format' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate share token
 * @param {string} token - Share token to validate
 * @returns {Object} - Validation result with isValid and error
 */
export function validateShareToken(token) {
  if (!token) {
    return { isValid: false, error: 'Share token is required' }
  }
  
  if (typeof token !== 'string') {
    return { isValid: false, error: 'Share token must be a string' }
  }
  
  if (!isValidShareToken(token)) {
    return { isValid: false, error: 'Invalid share token format' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Check if share has expired
 * @param {string} expiresAt - ISO date string
 * @returns {boolean} - True if expired
 */
export function isShareExpired(expiresAt) {
  if (!expiresAt) return false
  return new Date() > new Date(expiresAt)
}

/**
 * Rate limiting implementation
 * @param {string} key - Rate limit key (user ID, IP, etc.)
 * @param {number} limit - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - Rate limit result
 */
export function checkRateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.timestamp < windowStart) {
      rateLimitStore.delete(k)
    }
  }
  
  const userRequests = rateLimitStore.get(key) || { count: 0, timestamp: now }
  
  // Reset if outside window
  if (userRequests.timestamp < windowStart) {
    userRequests.count = 0
    userRequests.timestamp = now
  }
  
  // Check if limit exceeded
  if (userRequests.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userRequests.timestamp + windowMs
    }
  }
  
  // Increment counter
  userRequests.count++
  rateLimitStore.set(key, userRequests)
  
  return {
    allowed: true,
    remaining: limit - userRequests.count,
    resetTime: userRequests.timestamp + windowMs
  }
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length allowed
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
}

/**
 * Validate request headers
 * @param {Headers} headers - Request headers
 * @returns {Object} - Validation result
 */
export function validateHeaders(headers) {
  const contentType = headers.get('content-type')
  
  if (contentType && !contentType.includes('application/json')) {
    return { isValid: false, error: 'Content-Type must be application/json' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Security logging utility
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
export function securityLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata
  }
  
  // In production, send to proper logging service
  console.log(`[SECURITY ${level.toUpperCase()}] ${timestamp}: ${message}`, metadata)
  
  // TODO: Integrate with proper logging service (e.g., Sentry, DataDog)
}

/**
 * Validate user agent for suspicious patterns
 * @param {string} userAgent - User agent string
 * @returns {boolean} - True if suspicious
 */
export function isSuspiciousUserAgent(userAgent) {
  if (!userAgent) return true
  
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /php/i
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent))
}

/**
 * Generate secure random string
 * @param {number} length - Length of string
 * @returns {string} - Random hex string
 */
export function generateSecureToken(length = 32) {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Check if user has a paid plan
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} - { isPaid: boolean, plan: string }
 */
export async function checkPaidPlan(supabase, userId) {
  try {
    if (!userId) {
      return { isPaid: false, plan: 'free' }
    }

    // Get all purchases for the user (including inactive ones to check expiration)
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (purchasesError) {
      console.error('Error checking paid plan (purchases):', purchasesError)
    }

    const now = new Date()

    // Check if user has any active paid purchases
    const hasActivePurchase = purchases && purchases.length > 0 && purchases.some(p => {
      if (p.status !== 'active') return false
      
      // Check if it's a subscription that hasn't expired
      if (p.purchase_type === 'subscription') {
        if (!p.expires_at) return true
        return new Date(p.expires_at) > now
      }
      
      // For one-time purchases, check if they're active
      return p.purchase_type === 'one_time'
    })

    // Also check billing table for backwards compatibility
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (billingError) {
      console.error('Error checking paid plan (billing):', billingError)
    }

    const hasActiveBilling = billing && billing.status === 'active'
    const userIsPaid = hasActivePurchase || hasActiveBilling

    // Determine plan name
    let plan = 'free'
    if (hasActivePurchase && purchases && purchases.length > 0) {
      const activePurchase = purchases.find(p => {
        if (p.status !== 'active') return false
        if (p.purchase_type === 'subscription') {
          return !p.expires_at || new Date(p.expires_at) > now
        }
        return p.purchase_type === 'one_time'
      })
      plan = activePurchase?.plan || 'free'
    } else if (hasActiveBilling && billing) {
      plan = billing.plan || 'free'
    }

    return { isPaid: userIsPaid, plan }
  } catch (error) {
    console.error('Error checking paid plan:', error)
    return { isPaid: false, plan: 'free' }
  }
}
