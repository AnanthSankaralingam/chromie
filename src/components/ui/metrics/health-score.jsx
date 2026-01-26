"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

export default function HealthScore({ data, loading }) {
  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardContent className="p-6 h-96 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-32 w-32 bg-slate-700 rounded-full" />
            <div className="h-6 w-24 bg-slate-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Activity className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-400">No health score data available</p>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-yellow-500 to-amber-500'
    if (score >= 40) return 'from-orange-500 to-red-500'
    return 'from-red-500 to-rose-500'
  }

  const getComponentColor = (value) => {
    if (value >= 80) return '#22c55e' // green
    if (value >= 60) return '#eab308' // yellow
    if (value >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5 text-green-400" />
    if (trend === 'down') return <TrendingDown className="h-5 w-5 text-red-400" />
    return <Minus className="h-5 w-5 text-slate-400" />
  }

  const componentData = [
    { name: 'Engagement', value: data.components.engagement, color: getComponentColor(data.components.engagement) },
    { name: 'Growth', value: data.components.growth, color: getComponentColor(data.components.growth) },
    { name: 'Retention', value: data.components.retention, color: getComponentColor(data.components.retention) },
    { name: 'Quality', value: data.components.quality, color: getComponentColor(data.components.quality) }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Overall Health Score */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Score Circle */}
            <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${getScoreGradient(data.score)} p-1`}>
              <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold ${getScoreColor(data.score)}`}>
                  {data.score}
                </span>
                <span className="text-2xl font-bold text-slate-400">/ 100</span>
              </div>
            </div>

            {/* Grade and Trend */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-400">Grade</p>
                <p className={`text-3xl font-bold ${getScoreColor(data.score)}`}>
                  {data.grade}
                </p>
              </div>
              <div className="h-12 w-px bg-slate-700" />
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Trend</p>
                <TrendIcon trend={data.trend} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Breakdown */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Score Breakdown</CardTitle>
          <p className="text-sm text-slate-400">
            Individual component scores contributing to overall health
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Bars */}
            <div className="space-y-4">
              {componentData.map((component) => (
                <div key={component.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{component.name}</span>
                    <span className="text-sm font-medium" style={{ color: component.color }}>
                      {component.value}/100
                    </span>
                  </div>
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${component.value}%`,
                        background: `linear-gradient(90deg, ${component.color}, ${component.color}dd)`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={componentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {componentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                            <p className="text-slate-300 text-sm font-medium">
                              {payload[0].name}
                            </p>
                            <p className="text-sm" style={{ color: payload[0].payload.color }}>
                              Score: {payload[0].value}/100
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Component Descriptions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-700/30">
              <span className="font-medium text-gray-400">Engagement:</span>
              <span className="text-slate-400 ml-2">Events per user per day</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30">
              <span className="font-medium text-gray-400">Growth:</span>
              <span className="text-slate-400 ml-2">New user acquisition trend</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30">
              <span className="font-medium text-green-400">Retention:</span>
              <span className="text-slate-400 ml-2">Users returning over time</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30">
              <span className="font-medium text-yellow-400">Quality:</span>
              <span className="text-slate-400 ml-2">Low error rate indicator</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
