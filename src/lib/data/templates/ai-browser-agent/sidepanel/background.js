console.log('[CHROMIE:background.js] Background service worker loaded');

// State management
let currentPort = null;
let currentExecutor = null;
let isExecuting = false;

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(err => {
  console.error('[CHROMIE:background.js] Error setting panel behavior:', err);
});

// Inject DOM helper script when page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['dom-helper.js']
    }).catch(err => {
      console.error('[CHROMIE:background.js] Error injecting dom-helper:', err);
    });
  }
});

// Connect to side panel
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'side-panel-connection') {
    console.log('[CHROMIE:background.js] Side panel connected');
    currentPort = port;

    port.onMessage.addListener(async (message) => {
      console.log('[CHROMIE:background.js] Received message:', message.type);
      
      switch (message.type) {
        case 'heartbeat':
          port.postMessage({ type: 'heartbeat_ack' });
          break;
          
        case 'new_task':
          await handleNewTask(message, port);
          break;
          
        case 'stop_task':
          handleStopTask(port);
          break;
          
        default:
          console.log('[CHROMIE:background.js] Unknown message type:', message.type);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[CHROMIE:background.js] Side panel disconnected');
      currentPort = null;
    });
  }
});

// Handle new task
async function handleNewTask(message, port) {
  if (isExecuting) {
    port.postMessage({
      type: 'task_error',
      error: 'Another task is already running'
    });
    return;
  }

  const { task, tabId, sessionId } = message;
  
  if (!task || !tabId) {
    port.postMessage({
      type: 'task_error',
      error: 'Missing task or tab ID'
    });
    return;
  }

  // Get API configuration
  const config = await chrome.storage.local.get(['apiKey', 'apiProvider', 'model']);
  
  if (!config.apiKey) {
    port.postMessage({
      type: 'task_error',
      error: 'API key not configured. Please set it in settings.'
    });
    return;
  }

  isExecuting = true;
  
  try {
    // Create executor
    currentExecutor = new AgentExecutor(task, tabId, config, port);
    const result = await currentExecutor.execute();
    
    port.postMessage({
      type: 'task_complete',
      result: result
    });
  } catch (error) {
    console.error('[CHROMIE:background.js] Task execution error:', error);
    port.postMessage({
      type: 'task_error',
      error: error.message || 'Unknown error occurred'
    });
  } finally {
    isExecuting = false;
    currentExecutor = null;
  }
}

// Handle stop task
function handleStopTask(port) {
  if (currentExecutor) {
    currentExecutor.cancel();
    currentExecutor = null;
  }
  isExecuting = false;
  port.postMessage({
    type: 'task_complete',
    result: 'Task cancelled by user'
  });
}

// Agent Executor Class
class AgentExecutor {
  constructor(task, tabId, config, port) {
    this.task = task;
    this.tabId = tabId;
    this.config = config;
    this.port = port;
    this.cancelled = false;
    this.maxSteps = 10;
    this.currentStep = 0;
    this.extractedData = []; // Store extracted data across steps
  }

  cancel() {
    this.cancelled = true;
  }

  sendEvent(type, content, action = null) {
    if (this.port) {
      this.port.postMessage({
        type: 'agent_event',
        event: { type, content, action }
      });
    }
  }

  async execute() {
    this.sendEvent('thought', '🤔 Analyzing task and planning approach...');
    
    // Get page context
    const pageInfo = await this.getPageInfo();
    
    this.sendEvent('thought', `📄 Current page: ${pageInfo.title}`);
    
    // Plan and execute steps
    const plan = await this.planSteps(pageInfo);
    
    this.sendEvent('thought', `📋 Planned ${plan.steps.length} steps`);
    
    for (const step of plan.steps) {
      if (this.cancelled) {
        return 'Task cancelled';
      }
      
      this.currentStep++;
      this.sendEvent('action', step.description, step.action);
      
      try {
        await this.executeStep(step);
        this.sendEvent('result', `Step ${this.currentStep} completed`);
      } catch (error) {
        this.sendEvent('result', `Step ${this.currentStep} failed: ${error.message}`);
        throw error;
      }
      
      // Wait a bit between steps
      await this.sleep(500);
    }
    
    // Get final result
    const result = await this.getFinalResult(plan);
    
    return result;
  }

  async getPageInfo() {
    try {
      // Get structured page information
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: () => {
          // Extract interactive elements
          const getInteractiveElements = () => {
            const elements = [];
            const selectors = ['a', 'button', 'input', 'select', 'textarea', '[role="button"]', '[onclick]'];
            
            selectors.forEach(selector => {
              document.querySelectorAll(selector).forEach((el, idx) => {
                if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                  const rect = el.getBoundingClientRect();
                  const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                  
                  if (isVisible && elements.length < 20) {
                    elements.push({
                      tag: el.tagName.toLowerCase(),
                      type: el.type || '',
                      text: (el.textContent || el.placeholder || el.value || '').trim().slice(0, 100),
                      id: el.id || '',
                      name: el.name || '',
                      href: el.href || '',
                      selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`
                    });
                  }
                }
              });
            });
            return elements;
          };

          // Extract visible text content
          const getVisibleText = () => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const style = window.getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  const text = node.textContent.trim();
                  if (text.length > 0) {
                    return NodeFilter.FILTER_ACCEPT;
                  }
                  return NodeFilter.FILTER_REJECT;
                }
              }
            );

            const textParts = [];
            let node;
            let charCount = 0;
            const maxChars = 3000;

            while ((node = walker.nextNode()) && charCount < maxChars) {
              const text = node.textContent.trim();
              if (text) {
                textParts.push(text);
                charCount += text.length;
              }
            }

            return textParts.join(' ').slice(0, maxChars);
          };

          return {
            title: document.title,
            url: window.location.href,
            visibleText: getVisibleText(),
            interactiveElements: getInteractiveElements(),
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => h.textContent.trim()),
            forms: Array.from(document.querySelectorAll('form')).length,
            links: Array.from(document.querySelectorAll('a')).length
          };
        }
      });
      return result.result;
    } catch (error) {
      console.error('[CHROMIE:background.js] Error getting page info:', error);
      throw new Error(`Failed to access page: ${error.message}`);
    }
  }

  async planSteps(pageInfo) {
    // Build rich context for LLM
    const interactiveElementsList = pageInfo.interactiveElements
      .map((el, idx) => `${idx + 1}. [${el.tag}] "${el.text}" ${el.id ? `id="${el.id}"` : ''} ${el.selector}`)
      .join('\n');

    const headingsList = pageInfo.headings.length > 0 
      ? pageInfo.headings.map((h, idx) => `${idx + 1}. ${h}`).join('\n')
      : 'No major headings found';

    // Call LLM to plan steps with rich context
    const prompt = `You are an expert web automation AI agent. Analyze the current page and create a precise action plan.

**TASK:** ${this.task}

**CURRENT PAGE CONTEXT:**
URL: ${pageInfo.url}
Title: ${pageInfo.title}
Forms: ${pageInfo.forms}
Total Links: ${pageInfo.links}

**PAGE HEADINGS:**
${headingsList}

**VISIBLE TEXT (first 500 chars):**
${pageInfo.visibleText.slice(0, 500)}...

**INTERACTIVE ELEMENTS (visible on screen):**
${interactiveElementsList || 'No interactive elements found'}

**INSTRUCTIONS:**
1. If the task requires going to a different page, your FIRST action must be "navigate" with the full URL
2. For tasks like "find trending repositories on GitHub", navigate to https://github.com/trending first
3. For searches, navigate to appropriate search pages or use site search functions
4. Be specific with selectors - use the exact selectors provided above
5. After navigation, wait before trying to interact (the page needs to load)
6. Extract specific content, not entire body

**RESPONSE FORMAT:**
Return ONLY a valid JSON array. DO NOT include any other text, explanations, or markdown.
CRITICAL: Use ONLY double quotes ("), NOT single quotes (').
CRITICAL: Do NOT use trailing commas.
CRITICAL: All property names MUST be in double quotes.

Each step must have this exact structure:
[
  {
    "action": "navigate",
    "description": "Navigate to GitHub trending page",
    "target": "https://github.com/trending",
    "value": null
  },
  {
    "action": "extract",
    "description": "Extract repository names and descriptions",
    "target": "article.Box-row",
    "value": null
  }
]

**AVAILABLE ACTIONS:**
- "navigate": Go to a URL (target = full URL)
- "click": Click an element (target = CSS selector from list above)
- "type": Type into an input (target = CSS selector, value = text to type)
- "scroll": Scroll page (value = "down" or "up")
- "extract": Extract text from elements (target = specific CSS selector, NOT "body")
- "wait": Wait for page to load (value = milliseconds)

**CRITICAL RULES:**
- Maximum 6 steps
- After "navigate", add a "wait" step with value "2000"
- NEVER extract from "body" - use specific selectors like "h1", "article", ".repo-list", etc.
- If current URL already matches the task destination, skip navigation
- Be surgical and precise

Generate the plan now:`;

    try {
      const response = await this.callLLM(prompt);
      const steps = this.parseSteps(response);
      
      // Validate steps
      if (!steps || steps.length === 0) {
        throw new Error('No valid steps generated');
      }
      
      return { steps };
    } catch (error) {
      console.error('[CHROMIE:background.js] Error planning steps:', error);
      
      // Intelligent fallback based on task
      const taskLower = this.task.toLowerCase();
      if (taskLower.includes('github') && taskLower.includes('trending')) {
        return {
          steps: [
            {
              action: 'navigate',
              description: 'Navigate to GitHub trending page',
              target: 'https://github.com/trending',
              value: null
            },
            {
              action: 'wait',
              description: 'Wait for page to load',
              target: null,
              value: '3000'
            },
            {
              action: 'extract',
              description: 'Extract trending repository information',
              target: 'article h2 a',
              value: null
            }
          ]
        };
      }
      
      // Generic fallback - extract headings instead of body
      return {
        steps: [
          {
            action: 'extract',
            description: 'Extract main headings from current page',
            target: 'h1, h2, h3',
            value: null
          }
        ]
      };
    }
  }

  parseSteps(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[CHROMIE:background.js] No JSON array found in response');
        throw new Error('No JSON array found');
      }
      
      let jsonString = jsonMatch[0];
      
      // Clean up common LLM JSON issues
      jsonString = this.cleanJsonString(jsonString);
      
      // Log for debugging
      console.log('[CHROMIE:background.js] Attempting to parse JSON:', jsonString.slice(0, 500));
      
      // Try to parse
      const steps = JSON.parse(jsonString);
      
      // Validate that it's an array
      if (!Array.isArray(steps)) {
        throw new Error('Parsed result is not an array');
      }
      
      // Validate each step has required fields
      steps.forEach((step, idx) => {
        if (!step.action) {
          throw new Error(`Step ${idx} missing 'action' field`);
        }
        if (!step.description) {
          throw new Error(`Step ${idx} missing 'description' field`);
        }
      });
      
      return steps;
    } catch (error) {
      console.error('[CHROMIE:background.js] Error parsing steps:', error);
      console.error('[CHROMIE:background.js] Raw response:', response);
      
      // Fallback
      return [{
        action: 'extract',
        description: 'Extract information',
        target: 'h1, h2, h3',
        value: null
      }];
    }
  }
  
  cleanJsonString(jsonString) {
    // Remove any markdown code block markers
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Replace single quotes with double quotes (but not in actual text content)
    // This is a simplified approach - only replaces quotes around keys and simple values
    jsonString = jsonString.replace(/'\s*:\s*'/g, '":"');
    jsonString = jsonString.replace(/{\s*'/g, '{"');
    jsonString = jsonString.replace(/,\s*'/g, ',"');
    jsonString = jsonString.replace(/'\s*:/g, '":');
    jsonString = jsonString.replace(/:\s*'([^']*)'/g, ':"$1"');
    
    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove comments (// style and /* */ style)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Fix common issues with null values
    jsonString = jsonString.replace(/:\s*None/g, ': null');
    jsonString = jsonString.replace(/:\s*undefined/g, ': null');
    
    // Ensure property names are quoted
    // Match unquoted keys like { action: "..." } and convert to { "action": "..." }
    jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Remove any leading/trailing whitespace
    jsonString = jsonString.trim();
    
    return jsonString;
  }

  async executeStep(step) {
    switch (step.action) {
      case 'navigate':
        await this.navigate(step.target);
        break;
      case 'click':
        await this.click(step.target);
        break;
      case 'type':
        await this.type(step.target, step.value);
        break;
      case 'scroll':
        await this.scroll(step.value || 'down');
        break;
      case 'wait':
        await this.sleep(parseInt(step.value) || 1000);
        break;
      case 'extract':
        const data = await this.extract(step.target);
        this.extractedData = this.extractedData || [];
        this.extractedData.push(data);
        break;
      default:
        console.log('[CHROMIE:background.js] Unknown action:', step.action);
    }
  }

  async navigate(url) {
    try {
      // Ensure URL is properly formatted
      let targetUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        targetUrl = 'https://' + url;
      }
      
      this.sendEvent('result', `Navigating to ${targetUrl}...`);
      await chrome.tabs.update(this.tabId, { url: targetUrl });
      
      // Wait for page to load with timeout
      await this.sleep(3000);
      
      // Verify navigation succeeded
      const tab = await chrome.tabs.get(this.tabId);
      if (tab.url && tab.url !== 'chrome://newtab/' && tab.url !== 'about:blank') {
        this.sendEvent('result', `Successfully navigated to ${tab.url}`);
      }
    } catch (error) {
      console.error('[CHROMIE:background.js] Navigation error:', error);
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  async click(selector) {
    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.click();
          return true;
        }
        return false;
      },
      args: [selector]
    });
    await this.sleep(1000);
  }

  async type(selector, text) {
    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (sel, txt) => {
        const element = document.querySelector(sel);
        if (element) {
          element.value = txt;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      },
      args: [selector, text]
    });
    await this.sleep(500);
  }

  async scroll(direction) {
    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: (dir) => {
        const amount = dir === 'down' ? 500 : -500;
        window.scrollBy(0, amount);
      },
      args: [direction]
    });
    await this.sleep(500);
  }

  async extract(selector) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: (sel) => {
          // Extract from multiple elements
          const elements = document.querySelectorAll(sel);
          if (elements.length === 0) {
            return `No elements found for selector: ${sel}`;
          }
          
          // Limit extraction to prevent timeouts
          const maxElements = 20;
          const extracted = [];
          
          for (let i = 0; i < Math.min(elements.length, maxElements); i++) {
            const el = elements[i];
            const text = el.textContent.trim().slice(0, 200); // Limit text length
            if (text) {
              extracted.push(text);
            }
          }
          
          return extracted.length > 0 
            ? extracted.join('\n---\n')
            : 'No text content found in selected elements';
        },
        args: [selector]
      });
      
      return result.result;
    } catch (error) {
      console.error('[CHROMIE:background.js] Error extracting:', error);
      return `Failed to extract from ${selector}: ${error.message}`;
    }
  }

  async getFinalResult(plan) {
    const pageInfo = await this.getPageInfo();
    
    // Include extracted data if available
    const extractedDataSection = this.extractedData && this.extractedData.length > 0
      ? `\n\nEXTRACTED DATA:\n${this.extractedData.join('\n\n')}`
      : '';
    
    const prompt = `Summarize what was accomplished in this browser automation task.

**ORIGINAL TASK:** ${this.task}

**STEPS EXECUTED:**
${plan.steps.map((s, i) => `${i+1}. ${s.description}`).join('\n')}

**FINAL PAGE:**
- Title: ${pageInfo.title}
- URL: ${pageInfo.url}
- Main headings: ${pageInfo.headings.slice(0, 5).join(', ')}${extractedDataSection}

**INSTRUCTIONS:**
- Provide a clear, concise summary of what was found or accomplished
- If data was extracted, highlight the key findings
- If the task was to find information, present the results clearly
- Keep it under 200 words
- Be specific and helpful to the user`;

    try {
      const summary = await this.callLLM(prompt);
      return summary;
    } catch (error) {
      console.error('[CHROMIE:background.js] Error getting final result:', error);
      
      // Return extracted data directly if LLM fails
      if (this.extractedData && this.extractedData.length > 0) {
        return `Task completed. Here's what was found:\n\n${this.extractedData.join('\n\n')}`;
      }
      
      return `Task completed. Final page: ${pageInfo.title} (${pageInfo.url})`;
    }
  }

  async callLLM(prompt) {
    const provider = this.config.apiProvider || 'openai';
    const model = this.config.model || 'gpt-4o-mini';
    const apiKey = this.config.apiKey;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    let apiUrl, headers, body;

    if (provider === 'openai' || provider === 'custom') {
      // Support custom OpenAI-compatible endpoints (e.g., Ollama, LocalAI)
      const baseUrl = this.config.customEndpoint || 'https://api.openai.com/v1';
      apiUrl = `${baseUrl}/chat/completions`;
      
      headers = {
        'Content-Type': 'application/json'
      };
      
      // Only add auth header if not using local endpoint
      if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      body = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise web automation agent. Always respond with valid JSON when requested. Be concise and accurate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };
    } else if (provider === 'anthropic') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      body = {
        model: model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      };
    } else {
      throw new Error(`Unsupported API provider: ${provider}`);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      
      if (provider === 'openai' || provider === 'custom') {
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from API');
        }
        return data.choices[0].message.content;
      } else if (provider === 'anthropic') {
        if (!data.content || !data.content[0]) {
          throw new Error('Invalid response format from Anthropic API');
        }
        return data.content[0].text;
      }
    } catch (error) {
      console.error('[CHROMIE:background.js] LLM API error:', error);
      throw new Error(`Failed to call LLM: ${error.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

