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
      <div class="url-prompt-overlay" style="position: fixed; inset: 0; z-index: 99999; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center;">
        <div class="url-prompt-container" style="background: #ffffff; color: #111827; border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; padding: 16px; width: 92%; max-width: 420px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);">
          <div class="url-prompt-header" style="display:flex; align-items:center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 600;">Website URL</div>
            <button id="cancelUrlPrompt" aria-label="Close" style="background: transparent; border: none; color: #6b7280; font-size: 18px; cursor: pointer; line-height: 1;">×</button>
          </div>

          <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">${data.message || 'Optionally provide a page to analyze for better results.'}</p>

          ${suggestedUrl ? `
            <button id="useSuggestedUrl" style="width: 100%; display:flex; align-items:center; justify-content:center; gap:8px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px; font-size: 13px; cursor: pointer; margin-bottom: 10px;">
              <span style="opacity:.9;">Suggested:</span>
              <strong style="font-weight:600;">${new URL(suggestedUrl).hostname}</strong>
            </button>
          ` : ''}

          <div class="option-group" style="margin-bottom: 12px;">
            <input type="url" id="userUrl" placeholder="https://example.com" value="${suggestedUrl || ''}" style="width: 100%; padding: 10px 12px; background:#ffffff; color:#111827; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; outline: none;" />
          </div>

          <div style="display:flex; gap:8px; align-items:center; justify-content: space-between;">
            <button id="useCustomUrl" style="flex:1; background: linear-gradient(90deg,#7c3aed,#2563eb); color: white; border: none; border-radius: 8px; padding: 10px 12px; font-size: 13px; cursor: pointer;">Continue</button>
            <button id="noScraping" style="background: #f3f4f6; color:#374151; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; font-size: 13px; cursor: pointer;">Skip</button>
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
      let url = urlInput.value.trim();
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