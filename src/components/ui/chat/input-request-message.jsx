"use client"

import { useState, useEffect } from "react"
import { Check, Plus, X, Layout, Monitor, Code } from "lucide-react"
import externalApisData from '../../../lib/data/external_apis.json'
import { INPUT_LIMITS } from "@/lib/constants"

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
      let finalUrl = submittedUrl.trim().slice(0, INPUT_LIMITS.URL)
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
            onChange={(e) => setUrl(e.target.value.slice(0, INPUT_LIMITS.URL))}
            maxLength={INPUT_LIMITS.URL}
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
  const [userAddedApis, setUserAddedApis] = useState([])
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

  // Count active suggested APIs + user-added APIs
  const activeApiCount = apiConfigs.length + userAddedApis.length
  const canAddMore = activeApiCount < INPUT_LIMITS.MAX_TOTAL_APIS

  const handleEndpointChange = (index, newEndpoint) => {
    const limited = newEndpoint.slice(0, INPUT_LIMITS.URL)
    setApiConfigs(prev => prev.map((config, i) =>
      i === index ? { ...config, endpoint: limited } : config
    ))
  }

  const handleDocLinkChange = (index, newLink) => {
    const limited = newLink.slice(0, INPUT_LIMITS.URL)
    setApiConfigs(prev =>
      prev.map((config, i) =>
        i === index ? { ...config, doc_link: limited } : config
      )
    )
  }

  const handleDocDescriptionChange = (index, newDescription) => {
    const limited = newDescription.slice(0, INPUT_LIMITS.API_DESCRIPTION)
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

  const handleRemoveSuggestedApi = (index) => {
    setApiConfigs(prev => prev.filter((_, i) => i !== index))
  }

  // User-added API handlers
  const handleAddApi = () => {
    if (!canAddMore) return
    setUserAddedApis(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      endpoint: '',
      defaultEndpoint: '',
      doc_link: '',
      doc_description: '',
    }])
  }

  const handleRemoveUserApi = (id) => {
    setUserAddedApis(prev => prev.filter(api => api.id !== id))
  }

  const handleUserApiNameChange = (id, name) => {
    const limited = name.slice(0, INPUT_LIMITS.API_NAME)
    setUserAddedApis(prev => prev.map(api =>
      api.id === id ? { ...api, name: limited } : api
    ))
  }

  const handleUserApiEndpointChange = (id, endpoint) => {
    const limited = endpoint.slice(0, INPUT_LIMITS.URL)
    setUserAddedApis(prev => prev.map(api =>
      api.id === id ? { ...api, endpoint: limited } : api
    ))
  }

  const handleUserApiDocLinkChange = (id, link) => {
    const limited = link.slice(0, INPUT_LIMITS.URL)
    setUserAddedApis(prev => prev.map(api =>
      api.id === id ? { ...api, doc_link: limited } : api
    ))
  }

  const handleUserApiDocDescriptionChange = (id, desc) => {
    const limited = desc.slice(0, INPUT_LIMITS.API_DESCRIPTION)
    setUserAddedApis(prev => prev.map(api =>
      api.id === id ? { ...api, doc_description: limited } : api
    ))
  }

  const handleUserApiUseDefault = (id) => {
    setUserAddedApis(prev => prev.map(api =>
      api.id === id ? { ...api, endpoint: api.defaultEndpoint } : api
    ))
  }

  const handleSubmit = () => {
    // Merge suggested APIs + user-added APIs (filter out incomplete rows)
    const suggestedSelected = apiConfigs
      .filter(config => config.endpoint.trim() !== '')
      .map(config => ({
        name: config.name,
        endpoint: config.endpoint.trim(),
        doc_link: config.doc_link?.trim() || null,
        doc_description: config.doc_description?.trim() || null,
      }))

    const userSelected = userAddedApis
      .filter(api => api.name.trim() !== '' && api.endpoint.trim() !== '')
      .map(api => ({
        name: api.name.trim(),
        endpoint: api.endpoint.trim(),
        doc_link: api.doc_link?.trim() || null,
        doc_description: api.doc_description?.trim() || null,
      }))

    const selectedApis = [...suggestedSelected, ...userSelected]

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

  const suggestedWithEndpoints = apiConfigs.filter(config => config.endpoint.trim() !== '').length
  const userWithEndpoints = userAddedApis.filter(api => api.name.trim() !== '' && api.endpoint.trim() !== '').length
  const apisWithEndpoints = suggestedWithEndpoints + userWithEndpoints
  const allRemoved = apiConfigs.length === 0 && userAddedApis.length === 0

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
              {message.content || "Your extension needs to connect to external APIs. Please provide the base endpoint URLs for each API below. You can use the default endpoints, provide custom ones, or add your own APIs."}
            </p>
            <p className="text-xs text-slate-500">
              Remove all APIs to skip API configuration entirely.
            </p>
          </div>
        </div>
      </div>

      {apiConfigs.length === 0 && userAddedApis.length === 0 ? (
        <div className="p-4 rounded-lg border border-slate-600 bg-slate-700/50">
          <p className="text-sm text-slate-300 text-center">No API configurations needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Suggested APIs */}
          {apiConfigs.map((config, index) => (
            <div key={`suggested-${config.name}-${index}`} className="p-4 rounded-lg border transition-all bg-slate-700/50 border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <label className="text-sm font-semibold text-slate-200">
                    {config.name}
                  </label>
                </div>
                <button
                  onClick={() => handleRemoveSuggestedApi(index)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                  title="Remove API"
                >
                  <X className="h-4 w-4" />
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
                      maxLength={INPUT_LIMITS.URL}
                      placeholder="https://api.example.com/v1"
                      className="flex-1 px-4 py-2.5 rounded-lg border text-sm transition-all bg-slate-600 border-slate-500 text-slate-100 focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20 placeholder:text-slate-500 outline-none"
                    />
                    {config.defaultEndpoint && (
                      <button
                        onClick={() => handleUseDefault(index)}
                        className="px-4 py-2.5 text-xs font-medium rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-500 whitespace-nowrap shadow-lg shadow-gray-500/20"
                        title={`Use default: ${config.defaultEndpoint}`}
                      >
                        Use Default
                      </button>
                    )}
                  </div>
                  {config.defaultEndpoint && (
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
                    maxLength={INPUT_LIMITS.URL}
                    placeholder="https://docs.example.com/api"
                    className="w-full px-4 py-2.5 rounded-lg border text-sm transition-all bg-slate-600 border-slate-500 text-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Paste a public docs URL. This is only used server-side to pull structured API details.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    How to use this API <span className="text-slate-500">(optional, max {INPUT_LIMITS.API_DESCRIPTION} characters)</span>
                  </label>
                  <textarea
                    value={config.doc_description || ''}
                    onChange={(e) => handleDocDescriptionChange(index, e.target.value)}
                    maxLength={INPUT_LIMITS.API_DESCRIPTION}
                    placeholder="Describe how this API should be used in your extension (e.g., key endpoints, common workflows). Avoid pasting full docs URLs here."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm transition-all resize-none bg-slate-600 border-slate-500 text-slate-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500 outline-none"
                  />
                  <div className="flex justify-end">
                    <span className="text-[11px] text-slate-500">
                      {(config.doc_description || '').length}/{INPUT_LIMITS.API_DESCRIPTION}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* User-added APIs */}
          {userAddedApis.map((api) => (
            <div key={api.id} className="p-4 rounded-lg border-2 border-blue-500/40 bg-slate-700/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-medium text-blue-400">Custom API</span>
                </div>
                <button
                  onClick={() => handleRemoveUserApi(api.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                  title="Remove API"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    API name
                  </label>
                  <input
                    type="text"
                    value={api.name}
                    onChange={(e) => handleUserApiNameChange(api.id, e.target.value)}
                    maxLength={INPUT_LIMITS.API_NAME}
                    placeholder="e.g. Stripe, OpenWeather, Spotify"
                    className="w-full px-4 py-2.5 rounded-lg border bg-slate-600 border-slate-500 text-slate-100 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 placeholder:text-slate-500 outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    API base endpoint
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={api.endpoint}
                      onChange={(e) => handleUserApiEndpointChange(api.id, e.target.value)}
                      maxLength={INPUT_LIMITS.URL}
                      placeholder="https://api.example.com/v1"
                      className="flex-1 px-4 py-2.5 rounded-lg border bg-slate-600 border-slate-500 text-slate-100 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 placeholder:text-slate-500 outline-none transition-all"
                    />
                    {api.defaultEndpoint && (
                      <button
                        onClick={() => handleUserApiUseDefault(api.id)}
                        className="px-4 py-2.5 text-xs font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-500 whitespace-nowrap shadow-lg shadow-blue-500/20"
                        title={`Use default: ${api.defaultEndpoint}`}
                      >
                        Use Default
                      </button>
                    )}
                  </div>
                  {api.defaultEndpoint && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <span>Default endpoint:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-xs">
                        {api.defaultEndpoint}
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
                    value={api.doc_link || ''}
                    onChange={(e) => handleUserApiDocLinkChange(api.id, e.target.value)}
                    maxLength={INPUT_LIMITS.URL}
                    placeholder="https://docs.example.com/api"
                    className="w-full px-4 py-2.5 rounded-lg border bg-slate-600 border-slate-500 text-slate-100 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    Paste a public docs URL. This is only used server-side to pull structured API details.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    How to use this API <span className="text-slate-500">(optional, max {INPUT_LIMITS.API_DESCRIPTION} characters)</span>
                  </label>
                  <textarea
                    value={api.doc_description || ''}
                    onChange={(e) => handleUserApiDocDescriptionChange(api.id, e.target.value)}
                    maxLength={INPUT_LIMITS.API_DESCRIPTION}
                    placeholder="Describe how this API should be used in your extension (e.g., key endpoints, common workflows). Avoid pasting full docs URLs here."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border bg-slate-600 border-slate-500 text-slate-100 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 placeholder:text-slate-500 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <span className="text-[11px] text-slate-500">
                      {(api.doc_description || '').length}/{INPUT_LIMITS.API_DESCRIPTION}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add API button / cap message */}
      {canAddMore ? (
        <button
          onClick={handleAddApi}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-600 text-sm font-medium text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add API
        </button>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          Maximum of {INPUT_LIMITS.MAX_TOTAL_APIS} APIs reached
        </p>
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
          {allRemoved
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

const FRONTEND_TYPE_OPTIONS = [
  {
    id: 'popup',
    label: 'Popup',
    description: 'Small window from toolbar icon. For quick actions, settings, and status displays.',
    image: '/frontend-type-popup.png',
    Icon: null,
  },
  {
    id: 'sidepanel',
    label: 'Side Panel',
    description: 'Persistent panel beside the page. For reference tools, readers, and note-taking.',
    image: '/frontend-type-sidepanel.png',
    Icon: null,
  },
  {
    id: 'overlay',
    label: 'Overlay',
    description: 'Floating UI on top of web pages. For translation, annotation, and quick tools.',
    image: '/frontend-type-overlay.png',
    Icon: null,
  },
  {
    id: 'new_tab',
    label: 'New Tab',
    description: 'Full-page tab replacement. For dashboards, extensive content, standalone apps.',
    image: '/frontend-type-newtab.png',
    Icon: Monitor,
  },
  {
    id: 'content_script_ui',
    label: 'Content Injection',
    description: 'Inline elements injected into web pages. For annotations, highlights, floating buttons.',
    image: '/frontend-type-content-injection.png',
    Icon: Code,
  },
]

export function FrontendTypeInputRequest({ message, onSubmit, onCancel, setMessages, messageIndex }) {
  const [selectedType, setSelectedType] = useState(message.suggestedType || 'popup')
  const [isSubmitted, setIsSubmitted] = useState(message.isSubmitted || false)

  const suggestedType = message.suggestedType

  const handleSubmit = () => {
    setIsSubmitted(true)

    if (setMessages && messageIndex !== undefined) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[messageIndex] = {
          ...updated[messageIndex],
          isSubmitted: true,
          submittedValue: selectedType,
        }
        return updated
      })
    }

    onSubmit(selectedType)
  }

  if (isSubmitted || message.isSubmitted) {
    const displayType = FRONTEND_TYPE_OPTIONS.find(o => o.id === (message.submittedValue || selectedType))
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="h-4 w-4" />
        <span>Frontend type selected: {displayType?.label || message.submittedValue || selectedType}</span>
      </div>
    )
  }

  const selectedOption = FRONTEND_TYPE_OPTIONS.find(o => o.id === selectedType)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
          <Layout className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Select Frontend Type
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message.content || "I'm not fully confident about the best UI type for your extension. Please select the frontend type that best fits your needs."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {FRONTEND_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.id
          const isSuggested = option.id === suggestedType
          const IconComponent = option.Icon

          return (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={`relative flex flex-col rounded-lg border-2 transition-all text-left overflow-hidden ${
                isSelected
                  ? 'border-gray-400 bg-gray-500/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              {/* Preview image or icon placeholder */}
              <div className="w-full aspect-[4/3] bg-slate-800 overflow-hidden flex items-center justify-center">
                {option.image ? (
                  <img
                    src={option.image}
                    alt={option.label}
                    className="w-full h-full object-cover"
                  />
                ) : IconComponent ? (
                  <IconComponent className="w-10 h-10 text-slate-500" />
                ) : null}
              </div>

              {/* Label + description */}
              <div className="p-2.5 space-y-1 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-100">{option.label}</span>
                  {isSuggested && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-500/30 text-gray-300 border border-gray-500/40 leading-none whitespace-nowrap">
                      AI pick
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{option.description}</p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center shadow">
                  <Check className="w-3 h-3 text-slate-900" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full px-5 py-3 text-sm font-medium rounded-lg transition-all bg-gradient-to-r from-gray-500 to-gray-400 text-white hover:from-gray-600 hover:to-gray-500 shadow-lg shadow-gray-500/20"
      >
        Continue with {selectedOption?.label || selectedType}
      </button>
    </div>
  )
}
