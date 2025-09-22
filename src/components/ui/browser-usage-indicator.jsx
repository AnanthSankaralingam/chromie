"use client"

import { useState, useEffect } from "react"
import { Monitor, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BrowserUsageIndicator({ 
  className = "",
  showDetails = false 
}) {
  const [usageData, setUsageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/token-usage')
        
        if (!response.ok) {
          throw new Error('Failed to fetch usage data')
        }
        
        const data = await response.json()
        setUsageData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching browser usage:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsageData()

    // Listen for usage updates
    const handleUsageUpdate = () => {
      fetchUsageData()
    }

    window.addEventListener('browserUsageUpdated', handleUsageUpdate)
    
    return () => {
      window.removeEventListener('browserUsageUpdated', handleUsageUpdate)
    }
  }, [])

  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm", className)}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
        <span className="text-gray-600">Loading...</span>
      </div>
    )
  }

  if (error || !usageData) {
    return (
      <div className={cn("flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm bg-red-50 text-red-700", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>Usage unavailable</span>
      </div>
    )
  }

  const { 
    totalBrowserMinutesUsed = 0, 
    browserPlanLimit, 
    remainingBrowserMinutes,
    browserUsagePercentage = 0 
  } = usageData

  const isUnlimited = browserPlanLimit === 'unlimited' || browserPlanLimit === -1
  const isNearLimit = !isUnlimited && browserUsagePercentage >= 80
  const isAtLimit = !isUnlimited && remainingBrowserMinutes <= 0

  const getStatusColor = () => {
    if (isAtLimit) return "bg-red-100 text-red-800 border border-red-200"
    if (isNearLimit) return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    return "bg-green-100 text-green-800 border border-green-200"
  }

  const getStatusIcon = () => {
    if (isAtLimit) return <AlertCircle className="h-4 w-4" />
    if (isNearLimit) return <AlertCircle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  return (
    <div className={cn("flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium", getStatusColor(), className)}>
      <Monitor className="h-4 w-4" />
      <span>
        {isUnlimited ? (
          `${totalBrowserMinutesUsed} min used`
        ) : (
          `${totalBrowserMinutesUsed}/${browserPlanLimit} min`
        )}
      </span>
      
      {!isUnlimited && (
        <span className="text-xs opacity-75">
          ({remainingBrowserMinutes} remaining)
        </span>
      )}

      {showDetails && (
        <div className="ml-2 text-xs opacity-75">
          {browserUsagePercentage}% used
        </div>
      )}

      {getStatusIcon()}
    </div>
  )
}
