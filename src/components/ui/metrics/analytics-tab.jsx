"use client"

import { useState, useEffect } from "react"
import RetentionDashboard from "./retention-dashboard"
import FeatureUsage from "./feature-usage"
import HealthScore from "./health-score"

export default function AnalyticsTab({ selectedProjectId, timeRange }) {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedProjectId) return

      try {
        setLoading(true)
        const params = new URLSearchParams({
          projectId: selectedProjectId,
          from: timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: timeRange?.to || new Date().toISOString()
        })

        const response = await fetch(`/api/metrics/analytics?${params}`)

        if (response.ok) {
          const data = await response.json()
          setAnalyticsData(data)
          console.log('Fetched analytics data for project', selectedProjectId, ':', data)
        } else {
          console.error('Failed to fetch analytics')
          setAnalyticsData(null)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
        setAnalyticsData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedProjectId, timeRange])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-slate-400">
          Deep dive into retention, feature usage, and overall health metrics
        </p>
      </div>

      {/* Health Score */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Overall Health</h2>
        <HealthScore data={analyticsData?.healthScore} loading={loading} />
      </div>

      {/* Retention Dashboard */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">User Retention</h2>
        <RetentionDashboard data={analyticsData?.retention} loading={loading} />
      </div>

      {/* Feature Usage */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Feature Usage</h2>
        <FeatureUsage data={analyticsData?.featureUsage} loading={loading} />
      </div>
    </div>
  )
}
