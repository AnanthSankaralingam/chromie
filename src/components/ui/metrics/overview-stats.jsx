"use client"

import { Activity, Users, CheckCircle2, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const statCards = [
  {
    label: 'Total Requests',
    value: '--',
    icon: Activity,
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400'
  },
  {
    label: 'Active Users',
    value: '--',
    icon: Users,
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400'
  },
  {
    label: 'Success Rate',
    value: '--',
    icon: CheckCircle2,
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400'
  },
  {
    label: 'Avg Response Time',
    value: '--',
    icon: Zap,
    color: 'orange',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400'
  }
]

export default function OverviewStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
  )
}
