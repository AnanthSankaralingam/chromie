// chat-messages-service.js
// In-memory conversation history management service
export class ChatMessagesService {
  constructor() {
    // Store conversations by session ID
    this.conversations = new Map()
    
    // Configuration
    this.maxHistoryLength = 50 // Maximum number of messages per conversation
    this.maxSessions = 1000 // Maximum number of active sessions
  }

  /**
   * Add a message to a conversation
   * @param {string} sessionId - Session ID
   * @param {Object} message - Message object
   * @param {string} message.role - Message role (user, assistant, system)
   * @param {string} message.content - Message content
   * @param {Object} message.metadata - Optional metadata
   */
  addMessage(sessionId, message) {
    if (!sessionId || !message) {
      console.warn('[chat-messages-service] Invalid sessionId or message')
      return
    }

    // Initialize conversation if it doesn't exist
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, [])
    }

    const conversation = this.conversations.get(sessionId)
    
    // Add timestamp if not provided
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString()
    }

    // Add message ID if not provided
    if (!message.id) {
      message.id = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // Add the message
    conversation.push(message)

    // Trim conversation if it exceeds max length
    if (conversation.length > this.maxHistoryLength) {
      conversation.splice(0, conversation.length - this.maxHistoryLength)
    }

    // Clean up old sessions if we exceed the limit
    this.cleanupOldSessions()

    console.log('[chat-messages-service] Added message', {
      sessionId,
      messageId: message.id,
      role: message.role,
      contentLength: message.content?.length || 0,
      conversationLength: conversation.length
    })
  }

  /**
   * Get conversation history for a session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum number of messages to return (optional)
   * @returns {Array} Conversation history
   */
  getHistory(sessionId, limit = null) {
    if (!sessionId) {
      console.warn('[chat-messages-service] Invalid sessionId')
      return []
    }

    const conversation = this.conversations.get(sessionId) || []
    
    if (limit && limit > 0) {
      return conversation.slice(-limit)
    }

    return [...conversation] // Return a copy to prevent external modification
  }

  /**
   * Get the last N messages from a conversation
   * @param {string} sessionId - Session ID
   * @param {number} count - Number of messages to return
   * @returns {Array} Last N messages
   */
  getLastMessages(sessionId, count = 1) {
    const conversation = this.getHistory(sessionId)
    return conversation.slice(-count)
  }

  /**
   * Get messages by role from a conversation
   * @param {string} sessionId - Session ID
   * @param {string} role - Message role to filter by
   * @returns {Array} Messages with the specified role
   */
  getMessagesByRole(sessionId, role) {
    const conversation = this.getHistory(sessionId)
    return conversation.filter(message => message.role === role)
  }

  /**
   * Clear conversation history for a session
   * @param {string} sessionId - Session ID
   */
  clearHistory(sessionId) {
    if (!sessionId) {
      console.warn('[chat-messages-service] Invalid sessionId')
      return
    }

    this.conversations.delete(sessionId)
    console.log('[chat-messages-service] Cleared history for session', { sessionId })
  }

  /**
   * Clear all conversation histories
   */
  clearAllHistories() {
    this.conversations.clear()
    console.log('[chat-messages-service] Cleared all conversation histories')
  }

  /**
   * Get conversation statistics
   * @param {string} sessionId - Session ID
   * @returns {Object} Conversation statistics
   */
  getConversationStats(sessionId) {
    const conversation = this.getHistory(sessionId)
    
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
   * Get all active session IDs
   * @returns {Array<string>} List of active session IDs
   */
  getActiveSessions() {
    return Array.from(this.conversations.keys())
  }

  /**
   * Get total number of active sessions
   * @returns {number} Number of active sessions
   */
  getActiveSessionCount() {
    return this.conversations.size
  }

  /**
   * Check if a session exists
   * @param {string} sessionId - Session ID
   * @returns {boolean} Whether the session exists
   */
  hasSession(sessionId) {
    return this.conversations.has(sessionId)
  }

  /**
   * Clean up old sessions to prevent memory leaks
   * @private
   */
  cleanupOldSessions() {
    if (this.conversations.size <= this.maxSessions) {
      return
    }

    // Get sessions sorted by last activity (oldest first)
    const sessions = Array.from(this.conversations.entries())
      .map(([sessionId, conversation]) => ({
        sessionId,
        lastActivity: conversation[conversation.length - 1]?.timestamp || '1970-01-01T00:00:00.000Z'
      }))
      .sort((a, b) => new Date(a.lastActivity) - new Date(b.lastActivity))

    // Remove oldest sessions until we're under the limit
    const sessionsToRemove = sessions.slice(0, sessions.length - this.maxSessions)
    sessionsToRemove.forEach(({ sessionId }) => {
      this.conversations.delete(sessionId)
    })

    console.log('[chat-messages-service] Cleaned up old sessions', {
      removed: sessionsToRemove.length,
      remaining: this.conversations.size
    })
  }

  /**
   * Export conversation data for a session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Exported conversation data or null if session doesn't exist
   */
  exportConversation(sessionId) {
    const conversation = this.getHistory(sessionId)
    if (conversation.length === 0) {
      return null
    }

    return {
      sessionId,
      exportedAt: new Date().toISOString(),
      messageCount: conversation.length,
      messages: conversation
    }
  }

  /**
   * Import conversation data
   * @param {Object} data - Exported conversation data
   * @returns {boolean} Whether the import was successful
   */
  importConversation(data) {
    if (!data || !data.sessionId || !Array.isArray(data.messages)) {
      console.warn('[chat-messages-service] Invalid conversation data for import')
      return false
    }

    // Clear existing conversation for this session
    this.clearHistory(data.sessionId)

    // Import messages
    data.messages.forEach(message => {
      this.addMessage(data.sessionId, message)
    })

    console.log('[chat-messages-service] Imported conversation', {
      sessionId: data.sessionId,
      messageCount: data.messages.length
    })

    return true
  }
}

export default ChatMessagesService
