/**
 * DOM Helper Script
 * Injected into web pages to provide advanced DOM manipulation capabilities
 */

(function() {
  'use strict';
  
  console.log('[CHROMIE:dom-helper.js] DOM helper loaded');
  
  // Create global namespace
  window.__CHROMIE_DOM_HELPER__ = {
    version: '1.0.0',
    
    // Get all clickable elements
    getClickableElements: function() {
      const clickable = [];
      const selector = 'a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]';
      const elements = document.querySelectorAll(selector);
      
      elements.forEach((el, index) => {
        if (isVisible(el)) {
          clickable.push({
            index: index,
            tag: el.tagName.toLowerCase(),
            text: el.textContent.trim().slice(0, 100),
            id: el.id || null,
            class: el.className || null,
            href: el.href || null
          });
        }
      });
      
      return clickable;
    },
    
    // Get all form inputs
    getFormInputs: function() {
      const inputs = [];
      const selector = 'input, textarea, select';
      const elements = document.querySelectorAll(selector);
      
      elements.forEach((el, index) => {
        if (isVisible(el)) {
          inputs.push({
            index: index,
            type: el.type || el.tagName.toLowerCase(),
            name: el.name || null,
            id: el.id || null,
            placeholder: el.placeholder || null,
            value: el.value || null
          });
        }
      });
      
      return inputs;
    },
    
    // Get page structure
    getPageStructure: function() {
      return {
        title: document.title,
        url: window.location.href,
        headings: getHeadings(),
        links: getLinks(),
        images: getImages(),
        forms: getForms()
      };
    },
    
    // Extract main content
    getMainContent: function() {
      // Try to find main content area
      const mainSelectors = ['main', '[role="main"]', '#main', '.main-content', 'article'];
      
      for (const selector of mainSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent.trim();
        }
      }
      
      // Fallback to body
      return document.body.textContent.trim();
    },
    
    // Get element by various attributes
    findElement: function(query) {
      // Try different strategies to find element
      let element = null;
      
      // Try ID
      element = document.getElementById(query);
      if (element) return element;
      
      // Try CSS selector
      try {
        element = document.querySelector(query);
        if (element) return element;
      } catch (e) {
        // Invalid selector
      }
      
      // Try XPath
      try {
        const xpathResult = document.evaluate(query, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (xpathResult.singleNodeValue) {
          return xpathResult.singleNodeValue;
        }
      } catch (e) {
        // Invalid XPath
      }
      
      // Try finding by text content
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.textContent.trim() === query) {
          return el;
        }
      }
      
      return null;
    },
    
    // Scroll to element
    scrollToElement: function(selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    },
    
    // Wait for element to appear
    waitForElement: function(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timeout waiting for element'));
        }, timeout);
      });
    }
  };
  
  // Helper functions
  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
  }
  
  function getHeadings() {
    const headings = [];
    const selector = 'h1, h2, h3, h4, h5, h6';
    document.querySelectorAll(selector).forEach(el => {
      headings.push({
        level: el.tagName.toLowerCase(),
        text: el.textContent.trim()
      });
    });
    return headings;
  }
  
  function getLinks() {
    const links = [];
    document.querySelectorAll('a[href]').forEach(el => {
      if (isVisible(el)) {
        links.push({
          text: el.textContent.trim().slice(0, 100),
          href: el.href
        });
      }
    });
    return links.slice(0, 50); // Limit to 50 links
  }
  
  function getImages() {
    const images = [];
    document.querySelectorAll('img').forEach(el => {
      if (isVisible(el)) {
        images.push({
          src: el.src,
          alt: el.alt || null
        });
      }
    });
    return images.slice(0, 20); // Limit to 20 images
  }
  
  function getForms() {
    const forms = [];
    document.querySelectorAll('form').forEach(el => {
      forms.push({
        id: el.id || null,
        action: el.action || null,
        method: el.method || null
      });
    });
    return forms;
  }
  
  console.log('[CHROMIE:dom-helper.js] DOM helper initialized');
})();

