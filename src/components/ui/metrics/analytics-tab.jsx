"use client"

import { BarChart3, TrendingUp, FileDown, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: TrendingUp,
    title: 'Custom Date Ranges',
    description: 'Analyze metrics across any time period'
  },
  {
    icon: BarChart3,
    title: 'Comparative Analysis',
    description: 'Compare performance across different periods'
  },
  {
    icon: FileDown,
    title: 'Export Reports',
    description: 'Download detailed analytics reports'
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Live updates as metrics change'
  }
]

export default function AnalyticsTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="p-6 rounded-full bg-slate-800/30 border border-slate-700/40">
            <BarChart3 className="h-16 w-16 text-slate-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Analytics Coming Soon
        </h2>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Advanced analytics and insights will be available here
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {features.map((feature) => {
          const Icon = feature.icon

          return (
            <Card
              key={feature.title}
              className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
