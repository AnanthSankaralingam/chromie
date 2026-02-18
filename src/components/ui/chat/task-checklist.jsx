/**
 * Task Checklist Component
 * Displays a visual checklist of code generation tasks with status indicators
 */

import { CheckCircle2, Circle, Loader2, Wrench } from 'lucide-react'

export function TaskChecklist({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return null
  }

  const allComplete = tasks.every(task => task.status === 'complete')

  return (
    <div className="bg-slate-800/40 rounded-lg p-4 my-3 border border-slate-600/40">
      <div className="flex items-center gap-2 mb-3">
        {allComplete ? (
          <CheckCircle2 className="w-4 h-4 text-neutral-400" />
        ) : (
          <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
        )}
        <h3 className="text-sm font-semibold text-gray-100">
          {allComplete ? 'Files Generated' : 'Generating Files'}
        </h3>
      </div>
      
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600/40">
        <TaskSummary tasks={tasks} />
      </div>
    </div>
  )
}

function TaskItem({ task }) {
  const { status, fileName, description } = task

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
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
