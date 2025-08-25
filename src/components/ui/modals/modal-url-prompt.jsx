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
    
    // Get suggested URL from detected sites or URLs
    const suggestedUrl = data.detectedUrls?.[0] || 
                        (data.detectedSites?.[0] ? `https://${data.detectedSites[0]}` : null);
    
    console.log('🔗 Creating URL prompt modal with options:', {
      suggestedUrl,
      detectedSites: data.detectedSites,
      detectedUrls: data.detectedUrls,
      message: data.message
    });
    
    modal.innerHTML = `
      <div class="url-prompt-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;">
        <div class="url-prompt-container" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; color: black;">
          <div class="url-prompt-header">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">🔗 Website Analysis Recommended</h3>
            <p style="color: #666; margin-bottom: 16px; line-height: 1.4;">${data.message}</p>
          </div>
          
          <div class="url-prompt-body">
            <div class="url-options" style="margin-bottom: 20px;">
              <h4 style="font-size: 14px; font-weight: 500; margin-bottom: 12px;">Choose an option:</h4>
              
              ${suggestedUrl ? `
                <div class="option-group" style="margin-bottom: 16px;">
                  <button id="useSuggestedUrl" class="option-btn primary" style="width: 100%; background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 12px 16px; font-size: 14px; cursor: pointer; margin-bottom: 8px;">
                    🎯 Use Suggested URL: ${new URL(suggestedUrl).hostname}
                  </button>
                  <small style="color: #666; display: block; text-align: center;">${suggestedUrl}</small>
                </div>
              ` : ''}
              
              <div class="option-group" style="margin-bottom: 16px;">
                <label for="userUrl" style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Or enter a custom URL:</label>
                <input type="url" id="userUrl" placeholder="https://example.com" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; margin-bottom: 8px;" />
                <button id="useCustomUrl" class="option-btn secondary" style="width: 100%; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 16px; font-size: 14px; cursor: pointer;">
                  Use Custom URL
                </button>
              </div>
              
              <div class="option-group">
                <button id="noScraping" class="option-btn secondary" style="width: 100%; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 16px; font-size: 14px; cursor: pointer;">
                  🚫 No website analysis needed
                </button>
                <small style="color: #666; display: block; text-align: center; margin-top: 4px;">Generate extension without specific website data</small>
              </div>
            </div>
          </div>
          
          <div class="url-prompt-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelUrlPrompt" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ URL prompt modal created and added to DOM');
    
    // Add event listeners
    const urlInput = modal.querySelector('#userUrl');
    const useSuggestedBtn = modal.querySelector('#useSuggestedUrl');
    const useCustomBtn = modal.querySelector('#useCustomUrl');
    const noScrapingBtn = modal.querySelector('#noScraping');
    const cancelBtn = modal.querySelector('#cancelUrlPrompt');
    
    // Use suggested URL
    if (useSuggestedBtn) {
      useSuggestedBtn.addEventListener('click', () => {
        console.log('🎯 User selected suggested URL:', suggestedUrl);
        handleUrlSubmit(suggestedUrl);
      });
    }
    
    // Use custom URL
    useCustomBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        alert('Please enter a valid URL');
        return;
      }
      console.log('✏️ User entered custom URL:', url);
      handleUrlSubmit(url);
    });
    
    // No scraping needed
    noScrapingBtn.addEventListener('click', () => {
      console.log('🚫 User chose no website analysis');
      handleUrlSubmit(null); // null indicates no scraping
    });
    
    // Cancel
    cancelBtn.addEventListener('click', () => {
      console.log('❌ User cancelled URL prompt modal');
      handleCancel();
    });
    
    // Enter key support for custom URL
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        useCustomBtn.click();
      }
    });
    
    // Focus on input
    setTimeout(() => urlInput.focus(), 100);
    
    // Handle URL submission
    const handleUrlSubmit = (url) => {
      // Disable all buttons to prevent double-clicks
      [useSuggestedBtn, useCustomBtn, noScrapingBtn].forEach(btn => {
        if (btn) btn.disabled = true;
      });
      
      console.log('🔗 URL prompt modal - submitting URL:', url);
      
      // Remove modal
      removeModal();
      
      // Continue generation with URL (or null for no scraping)
      onUrlSubmit(data, url, originalPrompt);
    };
    
    // Handle cancellation
    const handleCancel = () => {
      console.log('❌ URL prompt modal cancelled');
      removeModal();
      onCancel();
    };
    
    // Remove modal function
    const removeModal = () => {
      try {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
          console.log('✅ Modal removed successfully');
        }
      } catch (error) {
        console.error('Error removing modal:', error);
        // Fallback: hide modal
        if (modal) {
          modal.style.display = 'none';
        }
      }
    };
    
    // Cleanup function
    return () => {
      removeModal();
    };
  }, [data, originalPrompt, onUrlSubmit, onCancel]);

  // This component doesn't render anything visible
  return null;
} 