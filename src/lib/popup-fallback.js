/**
 * Popup Fallback - Alternative to iframe for CSP-restricted sites
 * Opens ChatGPT in a popup window instead of iframe
 */

export class PopupFallback {
  constructor() {
    this.popupWindow = null
    this.cspRestrictedSites = [
      'chatgpt.com',
      'claude.ai', 
      'bard.google.com',
      'openai.com'
    ]
  }

  /**
   * Check if URL is CSP restricted
   * @param {string} url - URL to check
   * @returns {boolean} - Whether URL is CSP restricted
   */
  isCSPRestricted(url) {
    return this.cspRestrictedSites.some(site => url.includes(site))
  }

  /**
   * Open URL in popup window instead of iframe
   * @param {string} url - URL to open
   * @param {Object} options - Popup options
   * @returns {Window} - Popup window reference
   */
  openPopup(url, options = {}) {
    const defaultOptions = {
      width: 1200,
      height: 800,
      left: (screen.width - 1200) / 2,
      top: (screen.height - 800) / 2,
      scrollbars: 'yes',
      resizable: 'yes',
      toolbar: 'no',
      menubar: 'no',
      location: 'no',
      status: 'no'
    }

    const popupOptions = { ...defaultOptions, ...options }
    const optionsString = Object.entries(popupOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join(',')

    this.popupWindow = window.open(url, '_blank', optionsString)
    
    if (this.popupWindow) {
      this.popupWindow.focus()
      this.setupPopupCommunication()
    }

    return this.popupWindow
  }

  /**
   * Setup communication with popup window
   */
  setupPopupCommunication() {
    if (!this.popupWindow) return

    // Listen for messages from popup
    window.addEventListener('message', (event) => {
      if (event.source === this.popupWindow) {
        console.log('Message from popup:', event.data)
        // Handle popup messages here
      }
    })

    // Check if popup is closed
    const checkClosed = setInterval(() => {
      if (this.popupWindow.closed) {
        clearInterval(checkClosed)
        this.popupWindow = null
        console.log('Popup window closed')
      }
    }, 1000)
  }

  /**
   * Create iframe with popup fallback
   * @param {string} url - URL to embed
   * @param {Object} iframeOptions - Iframe options
   * @returns {HTMLElement} - Iframe or popup trigger element
   */
  createEmbeddableElement(url, iframeOptions = {}) {
    if (this.isCSPRestricted(url)) {
      // Create button to open popup instead of iframe
      const button = document.createElement('button')
      button.textContent = `Open ${this.getSiteName(url)} in New Window`
      button.className = 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
      button.onclick = () => this.openPopup(url)
      
      return button
    } else {
      // Create normal iframe
      const iframe = document.createElement('iframe')
      iframe.src = url
      iframe.className = 'w-full h-full border-0'
      Object.assign(iframe, iframeOptions)
      
      return iframe
    }
  }

  /**
   * Get site name from URL
   * @param {string} url - URL to extract site name from
   * @returns {string} - Site name
   */
  getSiteName(url) {
    try {
      const domain = new URL(url).hostname
      return domain.split('.')[0]
    } catch {
      return 'External Site'
    }
  }

  /**
   * Close popup if open
   */
  closePopup() {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close()
      this.popupWindow = null
    }
  }
}

// React component for popup fallback
export const PopupFallbackComponent = ({ url, children, className = "" }) => {
  const popupFallback = new PopupFallback()
  
  if (popupFallback.isCSPRestricted(url)) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Cannot embed this site</h3>
          <p className="text-gray-600 mb-4">
            This site has security restrictions that prevent embedding.
          </p>
          <button
            onClick={() => popupFallback.openPopup(url)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Open in New Window
          </button>
        </div>
      </div>
    )
  }
  
  return children
}
