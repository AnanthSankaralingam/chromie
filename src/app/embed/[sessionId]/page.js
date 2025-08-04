"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Star, ChevronDown, Bookmark } from "lucide-react"

export default function BrowserEmbed() {
  const params = useParams()
  const sessionId = params.sessionId
  const [sessionData, setSessionData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBookmarks, setShowBookmarks] = useState(true)
  const [bookmarks, setBookmarks] = useState([
    { id: 1, title: "Extensions", url: "chrome://extensions/" },
    { id: 2, title: "Dev Tools", url: "chrome://inspect/" },
    { id: 3, title: "Chrome APIs", url: "https://developer.chrome.com/docs/extensions/reference/" },
    { id: 4, title: "Web Store", url: "https://chrome.google.com/webstore/category/extensions" },
    { id: 5, title: "Samples", url: "https://github.com/GoogleChrome/chrome-extensions-samples" }
  ])
  const [currentUrl, setCurrentUrl] = useState("chrome-extension://your-extension-id/popup.html")

  useEffect(() => {
    async function fetchSessionData() {
      try {
        console.log(`Looking for session data: session_${sessionId}`)
        
        // Try to get session data from browser storage first
        const storedData = sessionStorage.getItem(`session_${sessionId}`)
        console.log('Found stored data:', storedData)
        
        if (storedData) {
          const data = JSON.parse(storedData)
          console.log('Parsed session data:', data)
          setSessionData(data)
          
          // If we have a real iframe URL, set the current URL to it
          if (data.iframeUrl && data.iframeUrl.startsWith('http')) {
            setCurrentUrl(data.iframeUrl)
          }
          
          setIsLoading(false)
          return
        }

        // If no stored data, show mock for compatibility
        console.log("No session data found, showing mock interface")
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching session data:", err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    if (sessionId) {
      fetchSessionData()
      
      // Also listen for storage changes in case data is added later
      const handleStorageChange = () => {
        fetchSessionData()
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      // Check for updates every 2 seconds in case sessionStorage was updated
      const interval = setInterval(fetchSessionData, 2000)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [sessionId])

  // Load bookmarks from localStorage on component mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem(`bookmarks_${sessionId}`)
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks))
      } catch (err) {
        console.error("Error loading bookmarks:", err)
      }
    }
  }, [sessionId])

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`bookmarks_${sessionId}`, JSON.stringify(bookmarks))
  }, [bookmarks, sessionId])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+D to bookmark
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        // Check if bookmark already exists
        const exists = bookmarks.find(b => b.url === currentUrl)
        if (exists) {
          alert("This page is already bookmarked!")
          return
        }

        // Generate a better title based on URL
        let title = "Current Page"
        if (currentUrl.includes("chrome://extensions")) {
          title = "Chrome Extensions"
        } else if (currentUrl.includes("chrome://developer")) {
          title = "Developer Tools"
        } else if (currentUrl.includes("chrome-extension")) {
          title = "Extension Popup"
        } else if (currentUrl.includes("github.com")) {
          title = "GitHub"
        } else if (currentUrl.includes("developer.chrome.com")) {
          title = "Chrome Developer Docs"
        }

        const newBookmark = {
          id: Date.now(),
          title: title,
          url: currentUrl
        }
        setBookmarks(prev => [...prev, newBookmark])
      }
      // Ctrl+Shift+B to toggle bookmarks bar
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setShowBookmarks(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentUrl, bookmarks])

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Initializing browser session...</p>
          <p className="text-sm text-gray-400 mt-2">Session: {sessionId?.slice(-8)}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-600">Error loading session: {error}</p>
          <p className="text-sm text-gray-400 mt-2">Session: {sessionId?.slice(-8)}</p>
        </div>
      </div>
    )
  }

  // If we have real Browserbase session data, show the iframe
  if (sessionData?.iframeUrl && sessionData.iframeUrl.startsWith('http')) {
    console.log('Displaying real Browserbase iframe:', sessionData.iframeUrl)
    return (
      <div className="h-screen bg-gray-100 flex flex-col">
        {/* Real Session Banner */}
        <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="font-medium">🚀 Live Extension Testing</span>
            <span className="text-green-200">Session: {sessionData.sessionId?.slice(-8)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span>Look for your extension icon in the browser toolbar</span>
            <button
              onClick={() => window.open(sessionData.iframeUrl, '_blank')}
              className="bg-green-700 hover:bg-green-800 px-3 py-1 rounded text-xs"
            >
              Open in New Tab
            </button>
          </div>
        </div>
        
        {/* Real Browserbase iframe */}
        <div className="flex-1">
          <iframe
            src={sessionData.iframeUrl}
            className="w-full h-full border-0"
            title="Browserbase Test Environment - Your Extension is Loaded"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => console.log('Browserbase iframe loaded successfully')}
          />
        </div>
        
        {/* Instructions Footer */}
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-blue-800">
              <span>🔍 <strong>Find your extension:</strong> Look for the extension icon in the browser toolbar</span>
              <span>🖱️ <strong>Test it:</strong> Click the icon to open the popup</span>
            </div>
            <div className="text-blue-600">
              Powered by Browserbase
            </div>
          </div>
        </div>
      </div>
    )
  }

  const addBookmark = () => {
    // Check if bookmark already exists
    const exists = bookmarks.find(b => b.url === currentUrl)
    if (exists) {
      alert("This page is already bookmarked!")
      return
    }

    // Generate a better title based on URL
    let title = "Current Page"
    if (currentUrl.includes("chrome://extensions")) {
      title = "Chrome Extensions"
    } else if (currentUrl.includes("chrome://developer")) {
      title = "Developer Tools"
    } else if (currentUrl.includes("chrome-extension")) {
      title = "Extension Popup"
    } else if (currentUrl.includes("github.com")) {
      title = "GitHub"
    } else if (currentUrl.includes("developer.chrome.com")) {
      title = "Chrome Developer Docs"
    }

    const newBookmark = {
      id: Date.now(),
      title: title,
      url: currentUrl
    }
    setBookmarks([...bookmarks, newBookmark])
    
    // Visual feedback
    setTimeout(() => {
      const starButton = document.querySelector('[title="Bookmark this page"]')
      if (starButton) {
        starButton.style.color = '#fbbf24'
        setTimeout(() => {
          starButton.style.color = ''
        }, 1000)
      }
    }, 100)
  }

  const removeBookmark = (id) => {
    setBookmarks(bookmarks.filter(b => b.id !== id))
  }

  const navigateToUrl = (url) => {
    setCurrentUrl(url)
  }

  const isBookmarked = bookmarks.some(b => b.url === currentUrl)

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Mock Session Banner */}
      <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
          <span className="font-medium">📱 Demo Interface</span>
          <span className="text-orange-200">Session: {sessionId?.slice(-8)}</span>
        </div>
        <div className="text-sm">
          This is a demo. To test real extensions, click "Test Extension" and wait for the live session to load.
        </div>
      </div>

      {/* Mock Browser UI */}
      <div className="bg-gray-200 border-b">
        {/* Top toolbar */}
        <div className="p-2 flex items-center space-x-2">
          {/* Browser Controls */}
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center space-x-1 ml-4">
            <button 
              className="p-1 hover:bg-gray-300 rounded text-gray-600"
              title="Back"
            >
              ←
            </button>
            <button 
              className="p-1 hover:bg-gray-300 rounded text-gray-600"
              title="Forward"
            >
              →
            </button>
            <button 
              className="p-1 hover:bg-gray-300 rounded text-gray-600"
              title="Reload"
              onClick={() => window.location.reload()}
            >
              ↻
            </button>
            <button 
              className="p-1 hover:bg-gray-300 rounded text-gray-600"
              title="Home"
              onClick={() => navigateToUrl("chrome://extensions/")}
            >
              🏠
            </button>
          </div>
          
          {/* Address Bar */}
          <div className="flex-1 mx-4">
            <div className="bg-white rounded border px-3 py-1 text-sm text-gray-600 flex items-center">
              <span className="flex-1">{currentUrl}</span>
              <button
                onClick={addBookmark}
                className={`ml-2 p-1 hover:bg-gray-100 rounded ${isBookmarked ? 'text-yellow-500' : 'text-gray-500'}`}
                title={isBookmarked ? "Page is bookmarked" : "Bookmark this page (Ctrl+D)"}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Browser buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="p-1 hover:bg-gray-300 rounded text-gray-600 flex items-center"
              title="Toggle bookmarks bar (Ctrl+Shift+B)"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <div className="text-gray-500 text-sm cursor-pointer hover:bg-gray-300 px-2 py-1 rounded">⋮</div>
          </div>
        </div>
        
        {/* Bookmarks Bar */}
        {showBookmarks && (
          <div className="bg-gray-100 border-t border-gray-300 px-4 py-1 flex items-center space-x-1 overflow-x-auto">
            <div className="flex items-center space-x-1 text-sm">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-center group">
                  <button
                    onClick={() => {
                      navigateToUrl(bookmark.url)
                      // Visual feedback
                      const btn = document.activeElement
                      if (btn) {
                        btn.style.backgroundColor = '#dbeafe'
                        setTimeout(() => {
                          btn.style.backgroundColor = ''
                        }, 200)
                      }
                    }}
                    className="px-2 py-1 hover:bg-gray-200 rounded text-gray-700 whitespace-nowrap flex items-center space-x-1 transition-colors"
                    title={bookmark.url}
                  >
                    <span className="text-xs">🔖</span>
                    <span>{bookmark.title}</span>
                  </button>
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-red-500 text-xs"
                    title="Remove bookmark"
                  >
                    ×
                  </button>
                </div>
              ))}
              {bookmarks.length === 0 && (
                <span className="text-gray-500 text-xs italic">No bookmarks yet. Click the star to add one!</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mock Extension Content */}
      <div className="flex-1 p-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Your Chrome Extension</h3>
            <p className="text-sm text-gray-500 mt-1">Running in test environment</p>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Extension Status</div>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Active and loaded successfully</span>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Permissions</div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>✓ Active tab access</div>
                <div>✓ Storage permissions</div>
                <div>✓ Background scripts</div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Test Actions</div>
              <div className="space-y-2">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                  Test Extension Feature
                </button>
                <button className="w-full border border-gray-300 py-2 px-4 rounded text-sm hover:bg-gray-50">
                  Open Developer Tools
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-400">
              Test Session: {sessionId?.slice(-8)} • Powered by BrowserBase
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}