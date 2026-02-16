"use client"

import { AlertTriangle, FileX, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileDeletionConfirmationProps {
  filePath: string
  reason: string
  safetyReason?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation dialog for agent file deletion
 * Shows when agent wants to delete a sensitive file
 */
export function FileDeletionConfirmation({ 
  filePath, 
  reason,
  safetyReason,
  onConfirm, 
  onCancel 
}: FileDeletionConfirmationProps) {
  return (
    <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow-sm my-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Agent File Deletion Request
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <FileX className="h-4 w-4 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium break-all">
                  {filePath}
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded p-2 space-y-1">
              <p className="text-yellow-900 dark:text-yellow-100">
                <strong>Agent's reason:</strong> {reason}
              </p>
              {safetyReason && (
                <div className="flex items-start gap-1.5 text-yellow-800 dark:text-yellow-200 text-xs mt-2">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <p>{safetyReason}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button
              onClick={onConfirm}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Allow Deletion
            </Button>
            <Button
              onClick={onCancel}
              size="sm"
              variant="outline"
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400"
            >
              Keep File
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FileDeletionSuccessProps {
  filePath: string
}

/**
 * Inline notification for successful deletion
 */
export function FileDeletionSuccess({ filePath }: FileDeletionSuccessProps) {
  return (
    <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg my-2">
      <div className="flex items-center gap-2">
        <FileX className="h-4 w-4 text-green-600 dark:text-green-500" />
        <p className="text-sm text-green-800 dark:text-green-200">
          Deleted: <code className="font-mono text-xs bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">{filePath}</code>
        </p>
      </div>
    </div>
  )
}

interface FileDeletionBlockedProps {
  filePath: string
  reason: string
}

/**
 * Inline notification for blocked deletion
 */
export function FileDeletionBlocked({ filePath, reason }: FileDeletionBlockedProps) {
  return (
    <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg my-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Cannot delete:</strong> <code className="font-mono text-xs bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded break-all">{filePath}</code>
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{reason}</p>
        </div>
      </div>
    </div>
  )
}

interface FileDeletionDeclinedProps {
  filePath: string
}

/**
 * Inline notification for declined deletion
 */
export function FileDeletionDeclined({ filePath }: FileDeletionDeclinedProps) {
  return (
    <div className="border-l-4 border-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg my-2">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Kept file: <code className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{filePath}</code> (deletion declined)
        </p>
      </div>
    </div>
  )
}
