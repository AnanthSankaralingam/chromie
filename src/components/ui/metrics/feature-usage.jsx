"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"
import { MousePointerClick, Target } from "lucide-react"

export default function FeatureUsage({ data, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

  if (!data || !data.topFeatures || data.topFeatures.length === 0) {
    return (
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <MousePointerClick className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-400">No feature usage data available</p>
          <p className="text-sm text-slate-500 mt-2">
            Add button click tracking to see which features are most popular
          </p>
        </CardContent>
      </Card>
    )
  }

  const COLORS = [
    '#3b82f6', // blue
    '#a855f7', // purple
    '#22c55e', // green
    '#eab308', // yellow
    '#f97316', // orange
    '#ef4444', // red
    '#06b6d4', // cyan
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index}>
              <p className="text-sm" style={{ color: entry.color }}>
                Clicks: {entry.value?.toLocaleString()}
              </p>
              {entry.payload.users && (
                <p className="text-sm text-slate-400">
                  Users: {entry.payload.users}
                </p>
              )}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Features by Clicks */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-blue-400" />
            Most Used Features
          </CardTitle>
          <p className="text-sm text-slate-400">
            Top 5 features by click count
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topFeatures} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="clicks" name="Clicks" radius={[0, 4, 4, 0]} barSize={24}>
                  {data.topFeatures.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Feature Adoption Rate */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Feature Adoption
          </CardTitle>
          <p className="text-sm text-slate-400">
            Percentage of users who used each feature
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80">
            {data.featureAdoption && data.featureAdoption.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.featureAdoption} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    domain={[0, 100]}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                            <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
                            <p className="text-sm text-purple-400">
                              Adoption: {payload[0].value}%
                            </p>
                            <p className="text-sm text-slate-400">
                              Users: {payload[0].payload.users}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="adoptionRate"
                    name="Adoption Rate"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    {data.featureAdoption.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No adoption data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary Stats */}
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Feature Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">Total Features</p>
              <p className="text-2xl font-bold text-white">{data.topFeatures.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">Total Clicks</p>
              <p className="text-2xl font-bold text-white">
                {data.topFeatures.reduce((sum, f) => sum + f.clicks, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">Active Users</p>
              <p className="text-2xl font-bold text-white">{data.totalUsers || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-700/30">
              <p className="text-sm text-slate-400 mb-1">Avg Clicks/Feature</p>
              <p className="text-2xl font-bold text-white">
                {data.topFeatures.length > 0
                  ? Math.round(data.topFeatures.reduce((sum, f) => sum + f.clicks, 0) / data.topFeatures.length)
                  : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
