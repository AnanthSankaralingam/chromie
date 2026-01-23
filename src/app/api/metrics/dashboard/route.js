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
  const bucket = searchParams.get('bucket') || 'day'

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
    // Query the metrics_aggregates table for pre-aggregated data
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

    // Process aggregates into dashboard format
    const processedData = processAggregates(aggregates || [], bucket)

    console.log("Metrics dashboard data for project", projectId, ":", JSON.stringify(processedData).substring(0, 200))

    return NextResponse.json({
      metrics: processedData,
      timeRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        bucket
      }
    })
  } catch (err) {
    console.error("Exception fetching metrics:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Process daily aggregates into dashboard format
 * Returns: { summary, by_type, series }
 */
function processAggregates(aggregates, bucket) {
  if (!aggregates || aggregates.length === 0) {
    return {
      summary: { total_events: 0, unique_users: 0 },
      by_type: {},
      series: []
    }
  }

  // Calculate summary stats
  const summary = {
    total_events: aggregates.reduce((sum, agg) => sum + (agg.event_count || 0), 0),
    unique_users: new Set(aggregates.map(agg => agg.unique_users || 0)).size,
    new_users: aggregates.reduce((sum, agg) => sum + (agg.new_users || 0), 0),
    returning_users: aggregates.reduce((sum, agg) => sum + (agg.returning_users || 0), 0)
  }

  // Group by event type
  const by_type = {}
  aggregates.forEach(agg => {
    if (!by_type[agg.event_type]) {
      by_type[agg.event_type] = 0
    }
    by_type[agg.event_type] += agg.event_count || 0
  })

  // Create time series based on bucket
  const seriesMap = new Map()

  aggregates.forEach(agg => {
    const date = new Date(agg.aggregate_date)
    let bucketKey

    // Bucket the data based on the requested time bucket
    switch (bucket) {
      case 'hour':
        // For hourly, we'd need to expand daily data - use day as fallback
        bucketKey = date.toISOString().split('T')[0]
        break
      case 'day':
        bucketKey = date.toISOString().split('T')[0]
        break
      case 'week':
        // Get Monday of the week
        const monday = new Date(date)
        monday.setDate(date.getDate() - date.getDay() + 1)
        bucketKey = monday.toISOString().split('T')[0]
        break
      case 'month':
        bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        break
      default:
        bucketKey = date.toISOString().split('T')[0]
    }

    if (!seriesMap.has(bucketKey)) {
      seriesMap.set(bucketKey, {
        timestamp: bucketKey,
        count: 0,
        unique_users: new Set(),
        new_users: 0,
        returning_users: 0,
        by_type: {}
      })
    }

    const bucket_data = seriesMap.get(bucketKey)
    bucket_data.count += agg.event_count || 0
    bucket_data.new_users += agg.new_users || 0
    bucket_data.returning_users += agg.returning_users || 0

    // Track unique users (approximation - just sum for now since we can't get exact unique across days)
    if (agg.unique_users) {
      bucket_data.unique_users.add(agg.unique_users)
    }

    if (!bucket_data.by_type[agg.event_type]) {
      bucket_data.by_type[agg.event_type] = 0
    }
    bucket_data.by_type[agg.event_type] += agg.event_count || 0
  })

  // Convert series map to array and format
  const series = Array.from(seriesMap.values())
    .map(bucket_data => ({
      bucket: bucket_data.timestamp, // Frontend expects 'bucket' field
      count: bucket_data.count,
      unique_users: bucket_data.unique_users.size,
      new_users: bucket_data.new_users,
      returning_users: bucket_data.returning_users,
      by_type: bucket_data.by_type
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))

  return {
    summary,
    by_type,
    series
  }
}
