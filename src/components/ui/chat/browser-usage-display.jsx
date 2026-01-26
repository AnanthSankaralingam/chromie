"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/feedback/badge"
import { Monitor, AlertTriangle } from "lucide-react"

export default function BrowserUsageDisplay() {
  const [tokenUsage, setTokenUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTokenUsage()

    // Listen for token usage updates
    const handleTokenUsageUpdate = () => {
      fetchTokenUsage()
    }

    window.addEventListener('tokenUsageUpdated', handleTokenUsageUpdate)

    return () => {
      window.removeEventListener('tokenUsageUpdated', handleTokenUsageUpdate)
    }
  }, [])

  const fetchTokenUsage = async () => {
    try {
      const response = await fetch('/api/token-usage')
      if (response.ok) {
        const data = await response.json()
        setTokenUsage(data)
      }
    } catch (error) {
      console.error('Error fetching token usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-slate-600 h-6 w-20 rounded" />
      </div>
    )
  }

  if (!tokenUsage) {
    return null
  }

  const { totalBrowserMinutesUsed, browserPlanLimit, browserUsagePercentage } = tokenUsage
  const isUnlimited = browserPlanLimit === 'unlimited'
  const isNearLimit = !isUnlimited && browserUsagePercentage > 80
  const isOverLimit = !isUnlimited && browserUsagePercentage >= 100

  const formatMinutes = (minutes) => {
    if (minutes == null) {
      return "0"
    }
    if (minutes >= 1000) {
      return `${Math.round(minutes / 1000)}k`
    }
    return minutes.toString()
  }

  return (
    <div className="flex items-center space-x-2">
      <Monitor className="h-4 w-4 text-gray-400" />
      <div className="flex items-center space-x-1">
        <span className="text-sm text-slate-300">
          {formatMinutes(totalBrowserMinutesUsed)}
        </span>
        {!isUnlimited && (
          <>
            <span className="text-sm text-slate-500">/</span>
            <span className="text-sm text-slate-300">
              {formatMinutes(browserPlanLimit)}
            </span>
          </>
        )}
        {isUnlimited && (
          <span className="text-sm text-slate-500">/∞</span>
        )}
        <span className="text-sm text-slate-500">min</span>
      </div>
      {isOverLimit && (
        <AlertTriangle className="h-4 w-4 text-red-400" />
      )}
      {isNearLimit && !isOverLimit && (
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
      )}
    </div>
  )
}
