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
    
    modal.innerHTML = `
      <div class="url-prompt-overlay" style="position: fixed; inset: 0; z-index: 99999; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; backdrop-blur-sm;">
        <div class="url-prompt-container" style="background: #1e293b; color: #f1f5f9; border: 1px solid #475569; border-radius: 12px; padding: 20px; width: 92%; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <div class="url-prompt-header" style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 600; color: #f1f5f9;">Website URL</div>
            <button id="cancelUrlPrompt" aria-label="Close" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; line-height: 1; padding: 4px; border-radius: 4px; hover:bg-slate-600;">×</button>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px; line-height: 1.5;">${data.message || 'Optionally provide a page to analyze for better results.'}</p>

          ${suggestedUrl ? `
            <button id="useSuggestedUrl" style="width: 100%; display:flex; align-items:center; justify-content:center; gap:8px; background: linear-gradient(90deg, #9ca3af, #6b7280); color: white; border: 1px solid #9ca3af; border-radius: 8px; padding: 12px 16px; font-size: 13px; cursor: pointer; margin-bottom: 12px; font-weight: 500;">
              <span style="opacity:.9;">Suggested:</span>
              <strong style="font-weight:600;">${new URL(suggestedUrl).hostname}</strong>
            </button>
          ` : ''}

          <div class="option-group" style="margin-bottom: 16px;">
            <input type="url" id="userUrl" placeholder="https://example.com" value="${suggestedUrl || ''}" maxlength="2000" style="width: 100%; padding: 12px 16px; background: #334155; color: #f1f5f9; border: 1px solid #475569; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s;" />
          </div>

          <div style="display:flex; gap:12px; align-items:center; justify-content: space-between;">
            <button id="useCustomUrl" style="flex:1; background: linear-gradient(90deg,#9ca3af,#6b7280); color: white; border: none; border-radius: 8px; padding: 12px 16px; font-size: 13px; cursor: pointer; font-weight: 500;">Continue</button>
            <button id="noScraping" style="background: #475569; color: #f1f5f9; border: 1px solid #64748b; border-radius: 8px; padding: 12px 16px; font-size: 13px; cursor: pointer; font-weight: 500;">Skip</button>
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
    
    // Use suggested URL (one-click)
    if (useSuggestedBtn) {
      useSuggestedBtn.addEventListener('click', () => {
        console.log('🎯 User selected suggested URL:', suggestedUrl);
        handleUrlSubmit(suggestedUrl);
      });
    }
    
    // Continue with custom URL
    useCustomBtn.addEventListener('click', () => {
      let url = urlInput.value.trim().slice(0, 2000);
      if (!url) {
        alert('Please enter a valid URL');
        return;
      }
      // Add https:// if the user omitted protocol for convenience
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      try {
        // Validate URL format
        // eslint-disable-next-line no-new
        new URL(url);
      } catch (e) {
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
    
    // Keyboard support
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        useCustomBtn.click();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        handleCancel();
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