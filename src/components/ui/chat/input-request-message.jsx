"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
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

export function UrlInputRequest({ message, onSubmit, onCancel, setMessages, messageIndex }) {
  const [url, setUrl] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(message.isSubmitted || false)
  const [suggestedUrl, setSuggestedUrl] = useState(null)

  useEffect(() => {
    // Extract suggested URL from message data
    const detectedUrl = message.detectedUrls?.[0] || 
                       (message.detectedSites?.[0] ? `https://${message.detectedSites[0]}` : null)
    if (detectedUrl) {
      setSuggestedUrl(detectedUrl)
      setUrl(detectedUrl)
    }
  }, [message])

  const handleSubmit = (submittedUrl) => {
    if (submittedUrl && submittedUrl.trim()) {
      let finalUrl = submittedUrl.trim()
      // Add https:// if the user omitted protocol
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`
      }

      try {
        // Validate URL format
        // eslint-disable-next-line no-new
        new URL(finalUrl)
        setIsSubmitted(true)
        
        // Update message in messages array
        if (setMessages && messageIndex !== undefined) {
          setMessages((prev) => {
            const updated = [...prev]
            updated[messageIndex] = {
              ...updated[messageIndex],
              isSubmitted: true,
              submittedValue: finalUrl
            }
            return updated
          })
        }
        
        onSubmit(finalUrl)
      } catch (e) {
        alert('Please enter a valid URL')
      }
    } else {
      // Skip scraping
      setIsSubmitted(true)
      
      // Update message in messages array
      if (setMessages && messageIndex !== undefined) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[messageIndex] = {
            ...updated[messageIndex],
            isSubmitted: true,
            submittedValue: null
          }
          return updated
        })
      }
      
      onSubmit(null)
    }
  }

  if (isSubmitted || message.isSubmitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="h-4 w-4" />
        <span>URL received: {message.submittedValue || 'Skipped'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Website URL Required
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message.content || "To build your extension, I need the URL of the website you want to interact with. This helps me understand the page structure and create the right selectors."}
            </p>
          </div>
        </div>
      </div>
      
      {suggestedUrl && (
        <button
          onClick={() => handleSubmit(suggestedUrl)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-500 to-gray-400 text-white border border-gray-400 rounded-lg px-4 py-3 text-sm font-medium hover:from-gray-600 hover:to-gray-500 transition-all shadow-lg shadow-gray-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Use suggested: {new URL(suggestedUrl).hostname}</span>
        </button>
      )}
      
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Enter website URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(url)
              }
            }}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-500 bg-slate-700/50 text-slate-100 text-sm focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20 outline-none transition-all placeholder:text-slate-500"
            autoFocus
          />
          <button
            onClick={() => handleSubmit(url)}
            disabled={!url.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg text-sm font-medium hover:from-gray-600 hover:to-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-500/20 disabled:shadow-none whitespace-nowrap"
          >
            Continue
          </button>
        </div>
      </div>
      
      <button
        onClick={() => handleSubmit(null)}
        className="w-full px-4 py-2 text-sm font-medium text-slate-400 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-slate-300 transition-colors"
      >
        Skip (continue without URL)
      </button>
    </div>
  )
}

export function ApiInputRequest({ message, onSubmit, onCancel, setMessages, messageIndex }) {
  const [apiConfigs, setApiConfigs] = useState([])
  const [skippedApis, setSkippedApis] = useState(new Set())
  const [isSubmitted, setIsSubmitted] = useState(message.isSubmitted || false)

  useEffect(() => {
    if (message.suggestedAPIs && Array.isArray(message.suggestedAPIs) && message.suggestedAPIs.length > 0) {
      const initialConfigs = message.suggestedAPIs.map(api => {
        const defaultEndpoint = getDefaultEndpoint(api.name || '')
        return {
          name: api.name || 'Unnamed API',
          endpoint: defaultEndpoint,
          defaultEndpoint: defaultEndpoint,
          isSkipped: false,
          // Optional documentation metadata
          doc_link: '',
          doc_description: '',
        }
      })
      setApiConfigs(initialConfigs)
    }
  }, [message.suggestedAPIs])

  const handleEndpointChange = (index, newEndpoint) => {
    setApiConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, endpoint: newEndpoint } : config
    ))
  }

  const handleDocLinkChange = (index, newLink) => {
    setApiConfigs(prev =>
      prev.map((config, i) =>
        i === index ? { ...config, doc_link: newLink } : config
      )
    )
  }

  const handleDocDescriptionChange = (index, newDescription) => {
    const limited = newDescription.slice(0, 1000)
    setApiConfigs(prev =>
      prev.map((config, i) =>
        i === index ? { ...config, doc_description: limited } : config
      )
    )
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
    const selectedApis = apiConfigs
      .filter((config, index) => !skippedApis.has(index) && config.endpoint.trim() !== '')
      .map(config => ({
        name: config.name,
        endpoint: config.endpoint.trim(),
        doc_link: config.doc_link?.trim() || null,
        doc_description: config.doc_description?.trim() || null,
      }))

    setIsSubmitted(true)
    
    // Update message in messages array
    if (setMessages && messageIndex !== undefined) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[messageIndex] = {
          ...updated[messageIndex],
          isSubmitted: true,
          submittedValue: selectedApis
        }
        return updated
        })
      }
      
      onSubmit(selectedApis)
  }

  if (isSubmitted || message.isSubmitted) {
    const submittedCount = message.submittedValue?.length || 0
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="h-4 w-4" />
        <span>
          {submittedCount > 0 
            ? `API endpoint${submittedCount > 1 ? 's' : ''} received (${submittedCount})`
            : 'Skipped API configuration'
          }
        </span>
      </div>
    )
  }

  const allSkipped = apiConfigs.length > 0 && skippedApis.size === apiConfigs.length
  const apisWithEndpoints = apiConfigs.filter((config, index) => !skippedApis.has(index) && config.endpoint.trim() !== '').length

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              API Endpoints Required
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message.content || "Your extension needs to connect to external APIs. Please provide the base endpoint URLs for each API below. You can use the default endpoints or provide custom ones."}
            </p>
          </div>
        </div>
      </div>
      
      {apiConfigs.length === 0 ? (
        <div className="p-4 rounded-lg border border-slate-600 bg-slate-700/50">
          <p className="text-sm text-slate-300 text-center">No API configurations needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
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
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      API base endpoint
                    </label>
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
                            : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20 placeholder:text-slate-500'
                        } outline-none`}
                      />
                      {config.defaultEndpoint && !isSkipped && (
                        <button
                          onClick={() => handleUseDefault(index)}
                          disabled={isSkipped}
                          className="px-4 py-2.5 text-xs font-medium rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-gray-500/20"
                          title={`Use default: ${config.defaultEndpoint}`}
                        >
                          Use Default
                        </button>
                      )}
                    </div>
                    {config.defaultEndpoint && !isSkipped && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <span>Default endpoint:</span>
                        <code className="px-2 py-0.5 rounded bg-slate-800 text-gray-400 font-mono text-xs">
                          {config.defaultEndpoint}
                        </code>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      API docs link <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={config.doc_link || ''}
                      onChange={(e) => handleDocLinkChange(index, e.target.value)}
                      placeholder="https://docs.example.com/api"
                      disabled={isSkipped}
                      className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all ${
                        isSkipped
                          ? 'bg-slate-600/50 border-slate-500/50 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500'
                      } outline-none`}
                    />
                    <p className="text-[11px] text-slate-500">
                      Paste a public docs URL. This is only used server-side to pull structured API details.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      How to use this API <span className="text-slate-500">(optional, max 1000 characters)</span>
                    </label>
                    <textarea
                      value={config.doc_description || ''}
                      onChange={(e) => handleDocDescriptionChange(index, e.target.value)}
                      placeholder="Describe how this API should be used in your extension (e.g., key endpoints, common workflows). Avoid pasting full docs URLs here."
                      rows={3}
                      disabled={isSkipped}
                      className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all resize-none ${
                        isSkipped
                          ? 'bg-slate-600/50 border-slate-500/50 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-600 border-slate-500 text-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500'
                      } outline-none`}
                    />
                    <div className="flex justify-end">
                      <span className="text-[11px] text-slate-500">
                        {(config.doc_description || '').length}/1000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onCancel}
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
  )
}

