"use client"

import ApiKeySection from "@/components/ui/metrics/api-key-section"

export default function SettingsTab({ selectedProjectId }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">
          Manage your API keys and configuration preferences
        </p>
      </div>
      <ApiKeySection selectedProjectId={selectedProjectId} />
    </div>
  )
}
