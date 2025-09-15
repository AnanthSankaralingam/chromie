"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/feedback/badge"
import { Zap, AlertTriangle } from "lucide-react"

export default function TokenUsageDisplay() {
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

  const { totalTokensUsed, planLimit, usagePercentage, userPlan } = tokenUsage
  const isUnlimited = planLimit === 'unlimited'
  const isNearLimit = !isUnlimited && usagePercentage > 80
  const isOverLimit = !isUnlimited && usagePercentage >= 100

  const formatTokens = (tokens) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  return (
    <div className="flex items-center space-x-2">
      <Zap className="h-4 w-4 text-yellow-400" />
      <div className="flex items-center space-x-1">
        <span className="text-sm text-slate-300">
          {formatTokens(totalTokensUsed)}
        </span>
        {!isUnlimited && (
          <>
            <span className="text-sm text-slate-500">/</span>
            <span className="text-sm text-slate-300">
              {formatTokens(planLimit)}
            </span>
          </>
        )}
        {isUnlimited && (
          <span className="text-sm text-slate-500">/∞</span>
        )}
      </div>
      {isOverLimit && (
        <AlertTriangle className="h-4 w-4 text-red-400" />
      )}
      {isNearLimit && !isOverLimit && (
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
      )}
      <Badge 
        variant="secondary" 
        className={`text-xs ${
          isOverLimit 
            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
            : isNearLimit 
            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20'
        }`}
      >
        {userPlan}
      </Badge>
    </div>
  )
} 