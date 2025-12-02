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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">API Endpoints Required</h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure your external API connections</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none p-1 rounded hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 rounded-lg border border-slate-600 bg-slate-700/30">
          <p className="text-sm text-slate-300 leading-relaxed">
            {data?.message || 'Your extension needs to connect to external APIs. Please provide the base endpoint URLs for each API below. You can use the default endpoints or provide custom ones.'}
          </p>
        </div>

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
                  ? 'bg-slate-700/30 border-slate-600/50 opacity-60' 
                  : 'bg-slate-700/50 border-slate-600'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <label className="text-sm font-semibold text-slate-200">
                      {config.name}
                    </label>
                  </div>
                  <button
                    onClick={() => handleSkipToggle(index)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      isSkipped
                        ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        : 'bg-slate-500 text-slate-200 hover:bg-slate-400'
                    }`}
                  >
                    {isSkipped ? 'Skipped' : 'Skip'}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={config.endpoint}
                      onChange={(e) => handleEndpointChange(index, e.target.value)}
                      placeholder="https://api.example.com/v1"
                      disabled={isSkipped}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                        isSkipped
                          ? 'bg-slate-600/50 border-slate-500/50 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500'
                      } outline-none`}
                    />
                    {config.defaultEndpoint && !isSkipped && (
                      <button
                        onClick={() => handleUseDefault(index)}
                        disabled={isSkipped}
                        className="px-4 py-2.5 text-xs font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-blue-500/20"
                        title={`Use default: ${config.defaultEndpoint}`}
                      >
                        Use Default
                      </button>
                    )}
                  </div>
                  {config.defaultEndpoint && !isSkipped && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <span>Default endpoint:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-xs">
                        {config.defaultEndpoint}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 border border-slate-500 rounded-lg hover:bg-slate-500 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium rounded-lg transition-all bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/20 whitespace-nowrap"
          >
            {allSkipped 
              ? 'Continue without APIs' 
              : apisWithEndpoints > 0 
                ? `Continue with ${apisWithEndpoints} ${apisWithEndpoints > 1 ? 'APIs' : 'API'}` 
                : 'Continue'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
