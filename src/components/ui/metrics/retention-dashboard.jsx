"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { TrendingUp, Users, UserCheck } from "lucide-react"

export default function RetentionDashboard({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
                  <div className="h-8 w-16 bg-slate-700 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Users className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-400">No retention data available</p>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name.includes('Rate') ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Retention Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Day 1 Retention</p>
                <p className="text-3xl font-bold text-white">{data.d1}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Users active 1 day after install
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Day 7 Retention</p>
                <p className="text-3xl font-bold text-white">{data.d7}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Users active 7 days after install
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Day 30 Retention</p>
                <p className="text-3xl font-bold text-white">{data.d30}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Users active 30 days after install
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Retention Trend */}
        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Weekly Retention Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64">
              {data.weeklyRetention && data.weeklyRetention.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weeklyRetention}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="week"
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
                    <Line
                      type="monotone"
                      dataKey="retentionRate"
                      name="Retention Rate"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      dot={{ fill: '#9ca3af', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-500">No retention trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Installs vs Returning Users */}
        <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              New vs Returning Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64">
              {data.installsVsReturning && data.installsVsReturning.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.installsVsReturning}>
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
                    <Bar
                      dataKey="installs"
                      name="New Installs"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="returning"
                      name="Returning Users"
                      fill="#d1d5db"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-500">No user comparison data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
