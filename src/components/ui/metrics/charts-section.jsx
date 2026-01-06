"use client"

import { LineChart, PieChart, BarChart3, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const chartPlaceholders = [
  {
    title: 'Requests Over Time',
    icon: LineChart,
    description: 'Data visualization coming soon'
  },
  {
    title: 'Status Code Distribution',
    icon: PieChart,
    description: 'Data visualization coming soon'
  },
  {
    title: 'Response Time Trends',
    icon: BarChart3,
    description: 'Data visualization coming soon'
  },
  {
    title: 'Geographic Distribution',
    icon: MapPin,
    description: 'Data visualization coming soon'
  }
]

export default function ChartsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {chartPlaceholders.map((chart) => {
        const Icon = chart.icon

        return (
          <Card
            key={chart.title}
            className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40"
          >
            <CardContent className="p-6 h-64 flex flex-col items-center justify-center">
              <Icon className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">
                {chart.title}
              </h3>
              <p className="text-sm text-slate-500 text-center">
                {chart.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
