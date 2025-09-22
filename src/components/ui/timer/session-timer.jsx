"use client"

import { useState, useEffect } from "react"
import { Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SessionTimer({ 
  expiresAt, 
  onExpire, 
  warningThreshold = 30, // seconds
  className = ""
}) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isExpired, setIsExpired] = useState(false)
  const [isWarning, setIsWarning] = useState(false)

  useEffect(() => {
    if (!expiresAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiryTime = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000))

      setTimeRemaining(remaining)
      setIsWarning(remaining <= warningThreshold && remaining > 0)
      setIsExpired(remaining <= 0)

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true)
        onExpire?.()
      }
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, warningThreshold, onExpire, isExpired])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!expiresAt) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
      {
        "bg-gray-100 text-gray-700": !isWarning && !isExpired,
        "bg-yellow-100 text-yellow-800 border border-yellow-200": isWarning,
        "bg-red-100 text-red-800 border border-red-200": isExpired,
      },
      className
    )}>
      {isWarning ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span>
        {isExpired ? "Expired" : formatTime(timeRemaining)}
      </span>
      {isWarning && !isExpired && (
        <span className="text-xs opacity-75">
          (Warning)
        </span>
      )}
    </div>
  )
}
