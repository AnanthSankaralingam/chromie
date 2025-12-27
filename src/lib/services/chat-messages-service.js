// chat-messages-service.js
// Database-backed conversation history management service (JSONB schema)
import { createServiceClient } from '@/lib/supabase/service'

export class ChatMessagesService {
  constructor() {
    // Initialize Supabase client with service role for server-side operations
    this.supabase = createServiceClient()

    // Configuration
    this.conversationExpiryHours = 2 // Messages older than this are automatically filtered

    console.log('[chat-messages-service] Initialized with JSONB schema')
  }

  /**
   * Add a message to a conversation using atomic PostgreSQL function
   * @param {string} sessionId - Session ID (maps to project_id)
   * @param {Object} message - Message object
   * @param {string} message.role - Message role (user, assistant, system)
   * @param {string} message.content - Message content
   */
  async addMessage(sessionId, message) {
    if (!sessionId || !message) {
      console.warn('[chat-messages-service] Invalid sessionId or message')
      return
    }

    if (!this.supabase) {
      console.warn('[chat-messages-service] Supabase not initialized - skipping message storage')
      return
    }

    try {
      // Use PostgreSQL function for atomic append with cleanup
      const { data, error } = await this.supabase
        .rpc('add_conversation_message', {
          p_project_id: sessionId,
          p_role: message.role,
          p_content: message.content,
          p_expiry_hours: this.conversationExpiryHours
        })

      if (error) {
        console.error('[chat-messages-service] Error adding message:', error)
        return
      }

      console.log('[chat-messages-service] Added message to database', {
        sessionId,
        role: message.role,
        contentLength: message.content?.length || 0,
        totalMessages: Array.isArray(data) ? data.length : 0
      })
    } catch (error) {
      console.error('[chat-messages-service] Exception adding message:', error)
    }
  }

  /**
   * Get conversation history for a session
   * Returns entire history array - no filtering (PostgreSQL function handles expiry on write)
   * @param {string} sessionId - Session ID (maps to project_id)
   * @param {number} limit - Maximum number of messages to return (optional)
   * @returns {Promise<Array>} Conversation history
   */
  async getHistory(sessionId, limit = null) {
    if (!sessionId) {
      console.warn('[chat-messages-service] Invalid sessionId')
      return []
    }

    if (!this.supabase) {
      console.warn('[chat-messages-service] Supabase not initialized - returning empty history')
      return []
    }

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('history')
        .eq('project_id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is expected for new projects
          return []
        }
        console.error('[chat-messages-service] Error fetching history:', error)
        return []
      }

      const history = Array.isArray(data?.history) ? data.history : []

      // Apply limit if specified (get most recent messages)
      const finalHistory = limit && limit > 0 ? history.slice(-limit) : history

      console.log('[chat-messages-service] getHistory', {
        sessionId,
        messageCount: finalHistory.length,
        limit
      })

      return finalHistory
    } catch (error) {
      console.error('[chat-messages-service] Exception fetching history:', error)
      return []
    }
  }

  /**
   * Get the last N messages from a conversation
   * @param {string} sessionId - Session ID
   * @param {number} count - Number of messages to return
   * @returns {Promise<Array>} Last N messages
   */
  async getLastMessages(sessionId, count = 1) {
    const conversation = await this.getHistory(sessionId)
    return conversation.slice(-count)
  }

  /**
   * Get messages by role from a conversation
   * @param {string} sessionId - Session ID
   * @param {string} role - Message role to filter by
   * @returns {Promise<Array>} Messages with the specified role
   */
  async getMessagesByRole(sessionId, role) {
    const conversation = await this.getHistory(sessionId)
    return conversation.filter(message => message.role === role)
  }

  /**
   * Clear conversation history for a session
   * @param {string} sessionId - Session ID
   */
  async clearHistory(sessionId) {
    if (!sessionId) {
      console.warn('[chat-messages-service] Invalid sessionId')
      return
    }

    if (!this.supabase) {
      console.warn('[chat-messages-service] Supabase not initialized')
      return
    }

    try {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('project_id', sessionId)

      if (error) {
        console.error('[chat-messages-service] Error clearing history:', error)
        return
      }

      console.log('[chat-messages-service] Cleared history for session', { sessionId })
    } catch (error) {
      console.error('[chat-messages-service] Exception clearing history:', error)
    }
  }

  /**
   * Get conversation statistics
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Conversation statistics
   */
  async getConversationStats(sessionId) {
    const conversation = await this.getHistory(sessionId)

    const stats = {
      totalMessages: conversation.length,
      userMessages: conversation.filter(m => m.role === 'user').length,
      assistantMessages: conversation.filter(m => m.role === 'assistant').length,
      systemMessages: conversation.filter(m => m.role === 'system').length,
      totalCharacters: conversation.reduce((sum, m) => sum + (m.content?.length || 0), 0),
      firstMessageTime: conversation[0]?.timestamp || null,
      lastMessageTime: conversation[conversation.length - 1]?.timestamp || null
    }

    return stats
  }

  /**
   * Get all active session IDs (projects with recent conversation history)
   * @returns {Promise<Array<string>>} List of active session IDs
   */
  async getActiveSessions() {
    if (!this.supabase) {
      console.warn('[chat-messages-service] Supabase not initialized')
      return []
    }

    try {
      // Calculate cutoff time (2 hours ago)
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - this.conversationExpiryHours)

      const { data, error } = await this.supabase
        .from('conversations')
        .select('project_id')
        .gte('updated_at', cutoffTime.toISOString())

      if (error) {
        console.error('[chat-messages-service] Error fetching active sessions:', error)
        return []
      }

      // Get unique project IDs
      const uniqueProjectIds = [...new Set((data || []).map(row => row.project_id))]
      return uniqueProjectIds.filter(id => id !== null)
    } catch (error) {
      console.error('[chat-messages-service] Exception fetching active sessions:', error)
      return []
    }
  }

  /**
   * Get total number of active sessions
   * @returns {Promise<number>} Number of active sessions
   */
  async getActiveSessionCount() {
    const sessions = await this.getActiveSessions()
    return sessions.length
  }

  /**
   * Check if a session exists
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Whether the session exists
   */
  async hasSession(sessionId) {
    if (!sessionId || !this.supabase) {
      return false
    }

    try {
      // Calculate cutoff time (2 hours ago)
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - this.conversationExpiryHours)

      const { data, error } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('project_id', sessionId)
        .gte('updated_at', cutoffTime.toISOString())
        .limit(1)

      if (error) {
        console.error('[chat-messages-service] Error checking session:', error)
        return false
      }

      return (data || []).length > 0
    } catch (error) {
      console.error('[chat-messages-service] Exception checking session:', error)
      return false
    }
  }
}

export default ChatMessagesService
