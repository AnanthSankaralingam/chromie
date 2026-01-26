"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { LineChart as LineIcon, BarChart3, Calendar } from "lucide-react"

export default function ChartsSection({ metricsData, loading, timeRange }) {
  // Transform series data for the time series chart
  const timeSeriesData = useMemo(() => {
    if (!metricsData?.series) return []

    return metricsData.series.map(item => ({
      date: new Date(item.bucket).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      events: item.count || 0,
      users: item.unique_users || 0
    }))
  }, [metricsData?.series])

  // Transform by_type data for the bar chart
  const eventTypeData = useMemo(() => {
    if (!metricsData?.by_type) return []

    return Object.entries(metricsData.by_type)
      .map(([type, count]) => ({
        type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // Top 8 event types
  }, [metricsData?.by_type])

  const hasData = timeSeriesData.length > 0 || eventTypeData.length > 0

  // Custom tooltip styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
          <Card key={i} className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
            <CardContent className="p-6 h-80 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-8 w-8 bg-slate-700 rounded" />
                <div className="h-4 w-32 bg-slate-700 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardContent className="p-6 h-80 flex flex-col items-center justify-center">
            <LineIcon className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">
              Events Over Time
            </h3>
            <p className="text-sm text-slate-500 text-center">
              No event data available for this time period
            </p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardContent className="p-6 h-80 flex flex-col items-center justify-center">
            <BarChart3 className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">
              Event Distribution
            </h3>
            <p className="text-sm text-slate-500 text-center">
              No event data available for this time period
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Events Over Time Chart */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <LineIcon className="h-5 w-5 text-gray-400" />
            Events Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d1d5db" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d1d5db" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEvents)"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke="#d1d5db"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No time series data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Type Distribution Chart */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-400" />
            Event Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64">
            {eventTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Count"
                    fill="#22c55e"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No event type data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
