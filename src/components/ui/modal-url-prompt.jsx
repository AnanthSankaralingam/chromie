"use client"

import { useEffect } from "react"

export default function ModalUrlPrompt({ 
  data, 
  originalPrompt, 
  onUrlSubmit, 
  onCancel, 
  onCodeGenerated,
  projectId,
  hasGeneratedCode,
  onGenerationEnd 
}) {
  useEffect(() => {
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('.url-prompt-modal');
    existingModals.forEach(modal => {
      try {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      } catch (e) {
        console.warn('Could not remove existing modal:', e);
      }
    });
    
    // Create URL prompt modal
    const modal = document.createElement('div');
    modal.className = 'url-prompt-modal';
    modal.id = `url-modal-${Date.now()}`; // Unique ID
    
    modal.innerHTML = `
      <div class="url-prompt-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;">
        <div class="url-prompt-container" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; color: black;">
          <div class="url-prompt-header">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">🔗 url required for better results</h3>
            <p style="color: #666; margin-bottom: 16px; line-height: 1.4;">${data.message}</p>
          </div>
          
          <div class="url-prompt-body">
            ${data.detectedSites && data.detectedSites.length > 0 ? `
              <div class="detected-sites" style="margin-bottom: 16px;">
                <h4 style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">detected sites:</h4>
                <div class="site-suggestions" style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${data.detectedSites.map(site => `
                    <button class="site-suggestion-btn" data-url="https://${site}" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 12px; cursor: pointer; hover:background: #e5e7eb;">
                      ${site}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${data.detectedUrls && data.detectedUrls.length > 0 ? `
              <div class="detected-urls" style="margin-bottom: 16px;">
                <h4 style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">detected urls:</h4>
                <div class="url-suggestions" style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${data.detectedUrls.map(url => `
                    <button class="url-suggestion-btn" data-url="${url}" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 12px; cursor: pointer; hover:background: #e5e7eb;">
                      ${url}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <div class="url-input-section">
              <label for="userUrl" style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">or enter a specific url:</label>
              <input type="url" id="userUrl" placeholder="https://example.com" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; margin-bottom: 16px;" />
            </div>
          </div>
          
          <div class="url-prompt-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelUrlPrompt" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">cancel</button>
            <button id="submitUrl" style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">continue with url</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const urlInput = modal.querySelector('#userUrl');
    const submitBtn = modal.querySelector('#submitUrl');
    const cancelBtn = modal.querySelector('#cancelUrlPrompt');
    
    // Site suggestion buttons
    modal.querySelectorAll('.site-suggestion-btn, .url-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        urlInput.value = btn.dataset.url;
        urlInput.focus();
      });
    });
    
    // Submit URL
    submitBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        alert('please enter a url or select a suggested site');
        return;
      }
      
      // Disable button to prevent double-clicks
      submitBtn.disabled = true;
      submitBtn.textContent = 'processing...';
      
      console.log('Removing URL prompt modal and continuing with URL:', url);
      
      // Remove modal immediately with multiple fallback methods
      const removeModal = () => {
        try {
          if (modal && modal.parentNode) {
            document.body.removeChild(modal);
            console.log('✅ Modal removed successfully');
            return true;
          }
        } catch (error) {
          console.error('Error removing modal:', error);
        }
        
        // Fallback 1: Hide with display none
        try {
          if (modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            console.log('✅ Modal hidden as fallback');
            return true;
          }
        } catch (error) {
          console.error('Error hiding modal:', error);
        }
        
        return false;
      };
      
      // Try to remove immediately
      removeModal();
      
      // Fallback: Try again after a short delay
      setTimeout(() => {
        removeModal();
      }, 100);
      
      // Continue generation with URL
      onUrlSubmit(data, url, originalPrompt);
    });
    
    // Cancel
    cancelBtn.addEventListener('click', () => {
      console.log('Cancelling URL prompt modal');
      
      // Remove modal with error handling
      try {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
          console.log('✅ Modal removed successfully (cancelled)');
        }
      } catch (error) {
        console.error('Error removing modal on cancel:', error);
        // Force removal by setting display none as fallback
        if (modal) {
          modal.style.display = 'none';
        }
      }
      
      onCancel();
    });
    
    // Enter key support
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });
    
    // Focus on input
    setTimeout(() => urlInput.focus(), 100);
    
    // Cleanup function
    return () => {
      try {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      } catch (error) {
        console.warn('Error cleaning up modal:', error);
      }
    };
  }, [data, originalPrompt, onUrlSubmit, onCancel]);

  // This component doesn't render anything visible
  return null;
} 