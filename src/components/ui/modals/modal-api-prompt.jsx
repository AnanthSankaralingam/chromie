"use client"

import { useEffect, useState } from "react"

export default function ModalApiPrompt({ 
  data, 
  originalPrompt, 
  onApiSubmit, 
  onCancel
}) {
  const [apiConfigs, setApiConfigs] = useState([])
  const [skippedApis, setSkippedApis] = useState(new Set())

  useEffect(() => {
    // Initialize API configurations with empty endpoints for user input
    const initialConfigs = data.suggestedAPIs.map(api => ({
      name: api.name,
      endpoint: '',
      isSkipped: false
    }))
    setApiConfigs(initialConfigs)
  }, [data.suggestedAPIs])

  const handleEndpointChange = (index, newEndpoint) => {
    setApiConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, endpoint: newEndpoint } : config
    ))
  }

  const handleSkipToggle = (index) => {
    const newSkippedApis = new Set(skippedApis)
    if (skippedApis.has(index)) {
      newSkippedApis.delete(index)
    } else {
      newSkippedApis.add(index)
    }
    setSkippedApis(newSkippedApis)
  }

  const handleSubmit = () => {
    // Filter out skipped APIs and APIs with empty endpoints, then format for submission
    const selectedApis = apiConfigs
      .filter((config, index) => !skippedApis.has(index) && config.endpoint.trim() !== '')
      .map(config => ({
        name: config.name,
        endpoint: config.endpoint.trim()
      }))

    console.log('🔌 API prompt modal - submitting APIs:', selectedApis)
    onApiSubmit(data, selectedApis, originalPrompt)
  }

  const handleCancel = () => {
    console.log('❌ API prompt modal cancelled')
    onCancel()
  }

  const allSkipped = apiConfigs.length > 0 && skippedApis.size === apiConfigs.length
  const apisWithEndpoints = apiConfigs.filter((config, index) => !skippedApis.has(index) && config.endpoint.trim() !== '').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 text-slate-100 border border-slate-600 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">API Endpoints Required</h2>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none p-1 rounded hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          {data.message || 'This extension looks like it might need external APIs. Configure them below, skip or use our defaults for each API.'}
        </p>

        <div className="space-y-4 mb-6">
          {apiConfigs.map((config, index) => {
            const isSkipped = skippedApis.has(index)
            return (
              <div key={index} className={`p-4 rounded-lg border transition-all ${
                isSkipped 
                  ? 'bg-slate-700/50 border-slate-600 opacity-60' 
                  : 'bg-slate-700 border-slate-600'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-200">
                    {config.name}
                  </label>
                  <button
                    onClick={() => handleSkipToggle(index)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      isSkipped
                        ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        : 'bg-slate-500 text-slate-200 hover:bg-slate-400'
                    }`}
                  >
                    {isSkipped ? 'Skipped' : 'Skip'}
                  </button>
                </div>
                <input
                  type="url"
                  value={config.endpoint}
                  onChange={(e) => handleEndpointChange(index, e.target.value)}
                  placeholder="enter your endpoint here or use our defaults"
                  disabled={isSkipped}
                  className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                    isSkipped
                      ? 'bg-slate-600 border-slate-500 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                  }`}
                />
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 border border-slate-500 rounded-lg hover:bg-slate-500 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={allSkipped}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              allSkipped
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
            }`}
          >
            {allSkipped ? 'All APIs Skipped' : `Continue`}
          </button>
        </div>
      </div>
    </div>
  )
}
