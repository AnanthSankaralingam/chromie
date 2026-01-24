import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Verify user owns this project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Calculate default time range if not provided (last 30 days)
  const toDate = to ? new Date(to) : new Date()
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    // Fetch all aggregates for the date range
    const { data: aggregates, error: aggregatesError } = await supabase
      .from('metrics_aggregates')
      .select('*')
      .eq('project_id', projectId)
      .gte('aggregate_date', fromDate.toISOString().split('T')[0])
      .lte('aggregate_date', toDate.toISOString().split('T')[0])
      .order('aggregate_date', { ascending: true })

    if (aggregatesError) {
      console.error("Error fetching metrics aggregates:", aggregatesError)
      return NextResponse.json({ error: aggregatesError.message }, { status: 500 })
    }

    // Process data for all analytics
    const retention = calculateRetention(aggregates || [])
    const featureUsage = calculateFeatureUsage(aggregates || [])
    const healthScore = calculateHealthScore(aggregates || [])

    return NextResponse.json({
      retention,
      featureUsage,
      healthScore,
      timeRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    })
  } catch (err) {
    console.error("Exception fetching analytics:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Calculate retention metrics (simplified cohort-based approach)
 * Returns retention percentages for D1, D7, D30
 */
function calculateRetention(aggregates) {
  if (!aggregates || aggregates.length === 0) {
    return {
      d1: 0,
      d7: 0,
      d30: 0,
      weeklyRetention: [],
      installsVsReturning: []
    }
  }

  // Group by date for install events
  const installsByDate = new Map()
  const returningByDate = new Map()

  aggregates.forEach(agg => {
    const date = agg.aggregate_date

    if (agg.event_type === 'install') {
      installsByDate.set(date, (installsByDate.get(date) || 0) + (agg.new_users || 0))
    }

    // Track returning users across all event types
    const current = returningByDate.get(date) || { total: 0, count: 0 }
    current.total += (agg.returning_users || 0)
    current.count++
    returningByDate.set(date, current)
  })

  // Calculate approximate retention rates
  const dates = Array.from(installsByDate.keys()).sort()
  let d1Total = 0, d1Count = 0
  let d7Total = 0, d7Count = 0
  let d30Total = 0, d30Count = 0

  dates.forEach((installDate, idx) => {
    const installs = installsByDate.get(installDate)
    if (!installs) return

    // D1 retention (next day)
    if (idx + 1 < dates.length) {
      const nextDay = dates[idx + 1]
      const returning = returningByDate.get(nextDay)
      if (returning) {
        d1Total += (returning.total / returning.count) / installs
        d1Count++
      }
    }

    // D7 retention (7 days later)
    if (idx + 7 < dates.length) {
      const day7 = dates[idx + 7]
      const returning = returningByDate.get(day7)
      if (returning) {
        d7Total += (returning.total / returning.count) / installs
        d7Count++
      }
    }

    // D30 retention (30 days later)
    if (idx + 30 < dates.length) {
      const day30 = dates[idx + 30]
      const returning = returningByDate.get(day30)
      if (returning) {
        d30Total += (returning.total / returning.count) / installs
        d30Count++
      }
    }
  })

  // Calculate weekly retention trend
  const weeklyRetention = []
  const weeklyData = new Map()

  aggregates.forEach(agg => {
    const date = new Date(agg.aggregate_date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { newUsers: 0, returningUsers: 0 })
    }

    const week = weeklyData.get(weekKey)
    week.newUsers += agg.new_users || 0
    week.returningUsers += agg.returning_users || 0
  })

  Array.from(weeklyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([week, data]) => {
      const total = data.newUsers + data.returningUsers
      weeklyRetention.push({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        retentionRate: total > 0 ? ((data.returningUsers / total) * 100).toFixed(1) : 0,
        newUsers: data.newUsers,
        returningUsers: data.returningUsers
      })
    })

  // Installs vs Returning chart data
  const installsVsReturning = []
  const dailyData = new Map()

  aggregates.forEach(agg => {
    const date = agg.aggregate_date
    if (!dailyData.has(date)) {
      dailyData.set(date, { installs: 0, returning: 0 })
    }
    const day = dailyData.get(date)
    if (agg.event_type === 'install') {
      day.installs += agg.new_users || 0
    }
    day.returning += agg.returning_users || 0
  })

  Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // Last 14 days
    .forEach(([date, data]) => {
      installsVsReturning.push({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        installs: data.installs,
        returning: data.returning
      })
    })

  return {
    d1: d1Count > 0 ? ((d1Total / d1Count) * 100).toFixed(1) : 0,
    d7: d7Count > 0 ? ((d7Total / d7Count) * 100).toFixed(1) : 0,
    d30: d30Count > 0 ? ((d30Total / d30Count) * 100).toFixed(1) : 0,
    weeklyRetention,
    installsVsReturning
  }
}

/**
 * Calculate feature usage from top_button_ids
 * Returns top features and their usage counts
 */
function calculateFeatureUsage(aggregates) {
  if (!aggregates || aggregates.length === 0) {
    return {
      topFeatures: [],
      featureAdoption: [],
      totalUsers: 0
    }
  }

  // Aggregate button clicks across all dates
  const buttonCounts = new Map()
  const buttonUsers = new Map()
  let totalUniqueUsers = new Set()

  aggregates.forEach(agg => {
    // Track total unique users
    if (agg.unique_users) {
      totalUniqueUsers.add(agg.aggregate_date) // Approximate
    }

    // Process top_button_ids JSONB
    if (agg.top_button_ids && typeof agg.top_button_ids === 'object') {
      Object.entries(agg.top_button_ids).forEach(([buttonId, count]) => {
        buttonCounts.set(buttonId, (buttonCounts.get(buttonId) || 0) + count)

        // Track users per button (approximate)
        if (!buttonUsers.has(buttonId)) {
          buttonUsers.set(buttonId, new Set())
        }
        buttonUsers.get(buttonId).add(agg.aggregate_date)
      })
    }
  })

  // Calculate total unique users across date range
  const totalUsers = aggregates.reduce((sum, agg) => Math.max(sum, agg.unique_users || 0), 0)

  // Top features by usage
  const topFeatures = Array.from(buttonCounts.entries())
    .map(([buttonId, count]) => ({
      feature: formatFeatureName(buttonId),
      clicks: count,
      users: buttonUsers.get(buttonId)?.size || 0
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)

  // Feature adoption rate (% of users who used each feature)
  const featureAdoption = topFeatures.map(feature => ({
    feature: feature.feature,
    adoptionRate: totalUsers > 0 ? ((feature.users / totalUsers) * 100).toFixed(1) : 0,
    users: feature.users
  }))

  return {
    topFeatures,
    featureAdoption,
    totalUsers
  }
}

/**
 * Calculate overall health score based on multiple factors
 * Returns health score and component metrics
 */
function calculateHealthScore(aggregates) {
  if (!aggregates || aggregates.length === 0) {
    return {
      score: 0,
      grade: 'F',
      components: {
        engagement: 0,
        growth: 0,
        retention: 0,
        quality: 0
      },
      trend: 'stable'
    }
  }

  // Calculate component scores (0-100)

  // 1. Engagement Score (events per user)
  const totalEvents = aggregates.reduce((sum, agg) => sum + (agg.event_count || 0), 0)
  const avgUniqueUsers = aggregates.reduce((sum, agg) => sum + (agg.unique_users || 0), 0) / aggregates.length
  const eventsPerUser = avgUniqueUsers > 0 ? totalEvents / (aggregates.length * avgUniqueUsers) : 0
  const engagementScore = Math.min(100, eventsPerUser * 10) // Scale: 10+ events/user/day = 100

  // 2. Growth Score (new users trend)
  const firstHalf = aggregates.slice(0, Math.floor(aggregates.length / 2))
  const secondHalf = aggregates.slice(Math.floor(aggregates.length / 2))

  const firstHalfNewUsers = firstHalf.reduce((sum, agg) => sum + (agg.new_users || 0), 0)
  const secondHalfNewUsers = secondHalf.reduce((sum, agg) => sum + (agg.new_users || 0), 0)

  const growthRate = firstHalfNewUsers > 0 ? ((secondHalfNewUsers - firstHalfNewUsers) / firstHalfNewUsers) * 100 : 0
  const growthScore = Math.max(0, Math.min(100, 50 + growthRate)) // 0% growth = 50, +50% = 100

  // 3. Retention Score (returning users ratio)
  const totalNewUsers = aggregates.reduce((sum, agg) => sum + (agg.new_users || 0), 0)
  const totalReturningUsers = aggregates.reduce((sum, agg) => sum + (agg.returning_users || 0), 0)
  const retentionRate = (totalNewUsers + totalReturningUsers) > 0
    ? (totalReturningUsers / (totalNewUsers + totalReturningUsers)) * 100
    : 0
  const retentionScore = retentionRate // Already 0-100

  // 4. Quality Score (low error rate)
  let totalErrorEvents = 0
  aggregates.forEach(agg => {
    if (agg.error_codes && typeof agg.error_codes === 'object') {
      totalErrorEvents += Object.values(agg.error_codes).reduce((sum, count) => sum + count, 0)
    }
  })
  const errorRate = totalEvents > 0 ? (totalErrorEvents / totalEvents) * 100 : 0
  const qualityScore = Math.max(0, 100 - (errorRate * 10)) // 10% errors = 0 score

  // Overall health score (weighted average)
  const overallScore = (
    engagementScore * 0.3 +
    growthScore * 0.25 +
    retentionScore * 0.3 +
    qualityScore * 0.15
  )

  // Determine grade
  let grade = 'F'
  if (overallScore >= 90) grade = 'A'
  else if (overallScore >= 80) grade = 'B'
  else if (overallScore >= 70) grade = 'C'
  else if (overallScore >= 60) grade = 'D'

  // Determine trend
  let trend = 'stable'
  if (growthRate > 10) trend = 'up'
  else if (growthRate < -10) trend = 'down'

  return {
    score: Math.round(overallScore),
    grade,
    components: {
      engagement: Math.round(engagementScore),
      growth: Math.round(growthScore),
      retention: Math.round(retentionScore),
      quality: Math.round(qualityScore)
    },
    trend
  }
}

/**
 * Format button ID into readable feature name
 */
function formatFeatureName(buttonId) {
  if (!buttonId) return 'Unknown'

  return buttonId
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
