'use client'

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { classifyError } from '@/lib/utils/error-classifier'
import { getUserFriendlyError } from '@/lib/utils/error-messages'

export default function ErrorDisplay({ error, onRetry, isLoading }) {
  const classification = classifyError(error?.message || error)
  const friendlyError = getUserFriendlyError(error?.message || error, classification)

  return (
    <div className="text-center max-w-md px-6">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {friendlyError.title}
      </h3>

      <p className="text-gray-600 mb-4">
        {friendlyError.message}
      </p>

      <div className="flex gap-2 justify-center">
        <Button onClick={onRetry} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>

      {friendlyError.action && (
        <p className="mt-4 text-sm text-gray-500">
          💡 {friendlyError.action}
        </p>
      )}
    </div>
  )
}
