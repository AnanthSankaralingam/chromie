/**
 * Task Checklist Component
 * Displays a visual checklist of code generation tasks with status indicators.
 * Completed tasks show an expandable diff-style code preview.
 */

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { FileDiffPreview } from './file-diff-preview'

export function TaskChecklist({ tasks }) {
  const allComplete = (tasks ?? []).length > 0 && (tasks ?? []).every(task => task.status === 'complete')
  const [isCollapsed, setIsCollapsed] = useState(() => allComplete)
  const userToggledRef = useRef(false)

  // Auto-collapse when all tasks complete, unless the user manually toggled
  useEffect(() => {
    if (!allComplete || userToggledRef.current) return
    const timer = setTimeout(() => setIsCollapsed(true), 1500)
    return () => clearTimeout(timer)
  }, [allComplete])

  if (!tasks || tasks.length === 0) {
    return null
  }

  const handleToggle = () => {
    userToggledRef.current = true
    setIsCollapsed(prev => !prev)
  }

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left"
        onClick={handleToggle}
      >
        {allComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
        )}
        <h3 className="text-sm font-semibold text-gray-100 flex-1">
          {allComplete ? 'Files Generated' : 'Generating Files'}
        </h3>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="mt-3">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-600/40">
            <TaskSummary tasks={tasks} />
          </div>
        </div>
      )}
    </div>
  )
}

function TaskItem({ task }) {
  const { status, fileName, description, content } = task

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-neutral-500 animate-spin flex-shrink-0" />
      case 'repairing':
        return <Wrench className="w-4 h-4 text-neutral-500 animate-pulse flex-shrink-0" />
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-neutral-600 flex-shrink-0" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'text-slate-400'
      case 'in_progress':
        return 'text-blue-400 font-medium'
      case 'repairing':
        return 'text-orange-400 font-medium'
      case 'pending':
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="mt-0.5">
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${getStatusText()}`}>
          <span className="font-mono text-xs text-inherit">
            {fileName}
          </span>
          {status === 'repairing' && (
            <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
              (fixing issues...)
            </span>
          )}
        </div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        )}
        {status === 'complete' && content && (
          <FileDiffPreview fileName={fileName} content={content} defaultExpanded={false} />
        )}
      </div>
    </div>
  )
}

function TaskSummary({ tasks }) {
  const completed = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length

  return (
    <div className="text-xs text-slate-400">
      {completed} of {total} files completed
    </div>
  )
}
