"use client"

import { useEffect, useState } from "react"
import externalApisData from '../../../lib/data/external_apis.json'

// Get default endpoint for an API from external_apis.json
function getDefaultEndpoint(apiName) {
  const api = externalApisData.api_docs.find(doc => 
    doc.name.toLowerCase() === apiName.toLowerCase() ||
    apiName.toLowerCase().includes(doc.name.toLowerCase()) ||
    doc.name.toLowerCase().includes(apiName.toLowerCase())
  )
  return api?.base_url || ''
}

export default function ModalApiPrompt({
  data,
  originalPrompt,
  onApiSubmit,
  onCancel
}) {
  const [apiConfigs, setApiConfigs] = useState([])
  const [skippedApis, setSkippedApis] = useState(new Set())

  useEffect(() => {
    console.log('🔌 API Modal rendered with data:', {
      hasSuggestedAPIs: !!data?.suggestedAPIs,
      suggestedAPIsLength: data?.suggestedAPIs?.length || 0,
      suggestedAPIs: data?.suggestedAPIs,
      message: data?.message
    })
    
    // Initialize API configurations with empty endpoints for user input
    if (data?.suggestedAPIs && Array.isArray(data.suggestedAPIs) && data.suggestedAPIs.length > 0) {
      const initialConfigs = data.suggestedAPIs.map(api => ({
        name: api.name || 'Unnamed API',
        endpoint: '',
        defaultEndpoint: getDefaultEndpoint(api.name || ''),
        isSkipped: false
      }))
      setApiConfigs(initialConfigs)
      console.log('✅ Initialized', initialConfigs.length, 'API configs')
    } else {
      console.warn('⚠️ API modal opened with no suggested APIs')
      setApiConfigs([])
    }
  }, [data?.suggestedAPIs, data?.message])

  const handleEndpointChange = (index, newEndpoint) => {
    setApiConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, endpoint: newEndpoint } : config
    ))
  }

  const handleUseDefault = (index) => {
    setApiConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, endpoint: config.defaultEndpoint } : config
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
          {data?.message || 'This extension looks like it might need external APIs. Configure them below, skip individual APIs, or skip all to continue without API configuration.'}
        </p>

        {apiConfigs.length === 0 ? (
          <div className="p-4 rounded-lg border border-slate-600 bg-slate-700/50 mb-6">
            <p className="text-sm text-slate-300 text-center">No API configurations needed. Click Continue to proceed.</p>
          </div>
        ) : (
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
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={config.endpoint}
                    onChange={(e) => handleEndpointChange(index, e.target.value)}
                    placeholder="Enter endpoint URL"
                    disabled={isSkipped}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isSkipped
                        ? 'bg-slate-600 border-slate-500 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                    }`}
                  />
                  {config.defaultEndpoint && !isSkipped && (
                    <button
                      onClick={() => handleUseDefault(index)}
                      disabled={isSkipped}
                      className="px-4 py-2 text-xs font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      title={`Use default: ${config.defaultEndpoint}`}
                    >
                      Use Default
                    </button>
                  )}
                </div>
                {config.defaultEndpoint && !isSkipped && (
                  <p className="mt-2 text-xs text-slate-400">
                    Default: <code className="text-blue-400">{config.defaultEndpoint}</code>
                  </p>
                )}
              </div>
            )
          })}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 border border-slate-500 rounded-lg hover:bg-slate-500 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
          >
            {allSkipped ? 'Continue without APIs' : apisWithEndpoints > 0 ? `Continue with ${apisWithEndpoints} API${apisWithEndpoints > 1 ? 's' : ''}` : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
