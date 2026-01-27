'use client'

import React from 'react'
import { AlertCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { classifyError } from '@/lib/utils/error-classifier'
import { getUserFriendlyError } from '@/lib/utils/error-messages'

export default function ErrorDisplay({ error, onSolveInChat, isLoading }) {
  const classification = classifyError(error?.message || error)
  const friendlyError = getUserFriendlyError(error?.message || error, classification)

  const handleSolveInChat = () => {
    if (onSolveInChat) {
      const errorMessage = error?.message || error || friendlyError.sanitized
      onSolveInChat(errorMessage)
    }
  }

  return (
    <div className="text-center max-w-md px-6 py-8 bg-white rounded-lg border border-gray-200 shadow-sm">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {friendlyError.title}
      </h3>

      <p className="text-gray-600 mb-6">
        {friendlyError.message}
      </p>

      {onSolveInChat && (
        <div className="flex justify-center">
          <Button
            onClick={handleSolveInChat}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Solve in chat
          </Button>
        </div>
      )}

      {friendlyError.action && (
        <p className="mt-4 text-sm text-gray-500">
          💡 {friendlyError.action}
        </p>
      )}
    </div>
  )
}
