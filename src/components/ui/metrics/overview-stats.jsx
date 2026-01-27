"use client"

import { Activity, Users, UserCheck, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function OverviewStats({ metricsData, loading }) {
  // Extract values from metrics data
  const summary = metricsData?.summary || {}
  const byType = metricsData?.by_type || {}
  const series = metricsData?.series || []

  const totalEvents = summary.total_events || 0
  const mau = summary.unique_users || 0 // Monthly Active Users from 30-day range

  // Calculate DAU from the most recent day in series
  const sortedSeries = [...series].sort((a, b) =>
    new Date(b.bucket).getTime() - new Date(a.bucket).getTime()
  )
  const dau = sortedSeries.length > 0 ? (sortedSeries[0].unique_users || 0) : 0

  // Get event types list
  const eventTypes = Object.keys(byType)

  const statCards = [
    {
      label: 'Total Events',
      value: loading ? '--' : totalEvents.toLocaleString(),
      icon: Activity,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400'
    },
    {
      label: 'Daily Active Users',
      value: loading ? '--' : dau.toLocaleString(),
      sublabel: 'DAU',
      icon: UserCheck,
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400'
    },
    {
      label: 'Monthly Active Users',
      value: loading ? '--' : mau.toLocaleString(),
      sublabel: 'MAU',
      icon: Users,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon

          return (
            <Card
              key={stat.label}
              className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                  {stat.sublabel && (
                    <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                      {stat.sublabel}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Event Types List */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Event Types</h3>
            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded ml-auto">
              {loading ? '--' : eventTypes.length} types
            </span>
          </div>
          {loading ? (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-24 bg-slate-700/50 rounded-full animate-pulse" />
              ))}
            </div>
          ) : eventTypes.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {eventTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-full border border-slate-600/50 hover:border-slate-500/50 transition-colors"
                >
                  <span className="text-sm text-slate-300">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {byType[type]?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No events tracked yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
