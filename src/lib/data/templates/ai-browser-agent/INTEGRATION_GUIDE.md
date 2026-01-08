# AI Browser Agent Template - Chromie Integration Guide

This guide explains how the AI Browser Agent template integrates with the Chromie platform for code generation.

## Overview

The AI Browser Agent template provides a foundation for Chromie's AI to generate customized browser automation extensions based on user prompts. The template is inspired by Nanobrowser but simplified to vanilla JavaScript for easier AI generation and customization.

## Template Structure

```
ai-browser-agent/
├── README.md                          # Template documentation
├── INTEGRATION_GUIDE.md              # This file
└── sidepanel/                        # Sidepanel variant (primary)
    ├── manifest.json                 # Extension manifest
    ├── sidepanel.html/js/css        # Chat interface
    ├── background.js                 # Agent executor & LLM integration
    ├── content.js                    # Page interaction
    ├── dom-helper.js                 # Advanced DOM utilities
    └── options.html/js/css          # Settings page
```

## Integration with Chromie Code Generation

### 1. Template Selection

When users request AI automation features, Chromie should:

```javascript
// In planning-orchestrator.js or similar
const templateMatch = {
  keywords: [
    'ai agent', 'automation', 'browser automation', 
    'intelligent browsing', 'web scraping with ai',
    'autonomous browsing', 'ai assistant', 'nanobrowser'
  ],
  template: 'ai-browser-agent',
  frontendType: 'sidepanel'
};
```

### 2. Prompt Engineering

The coder prompt should include:

```javascript
// In new-extension/sidepanel.js or similar
const AI_AGENT_PROMPT_ADDITIONS = `
<ai_agent_context>
This extension uses an AI agent system similar to Nanobrowser. The user's request is:
{USER_REQUEST}

Key components:
1. AgentExecutor class in background.js - Handles task planning and execution
2. LLM API integration - Calls OpenAI or Anthropic for planning and results
3. Multi-step automation - Can navigate, click, type, extract information
4. Natural language interface - Users describe tasks in plain English

CRITICAL IMPLEMENTATION NOTES:
- The AgentExecutor class MUST include planSteps() and execute() methods
- API calls should use fetch() with proper error handling
- Support both OpenAI and Anthropic API formats
- Store API keys in chrome.storage.local
- Include step limits (maxSteps) to prevent infinite loops
- Provide real-time progress updates via port.postMessage()

CUSTOMIZATION AREAS:
Based on the user's specific request, modify:
1. Action types in executeStep() - Add domain-specific actions
2. Planning logic - Adjust how tasks are broken down
3. Result formatting - Customize output based on use case
4. UI elements - Add specific controls or displays
</ai_agent_context>
`;
```

### 3. User Request Examples

#### Example 1: Shopping Assistant
```
User: "Create an AI shopping assistant that finds products and compares prices"

Chromie should:
1. Use ai-browser-agent template
2. Add shopping-specific actions (priceExtraction, productComparison)
3. Customize UI with price display cards
4. Add filters for price range, ratings
```

#### Example 2: Research Tool
```
User: "Build a research assistant that reads articles and summarizes key points"

Chromie should:
1. Use ai-browser-agent template
2. Add article extraction logic
3. Implement summarization in result processing
4. Add citation tracking
```

#### Example 3: Form Filler
```
User: "Make an extension that fills out job applications automatically"

Chromie should:
1. Use ai-browser-agent template
2. Add form field detection
3. Implement data storage for user profile
4. Add form validation checks
```

## Customization Patterns

### Adding Domain-Specific Actions

```javascript
// In background.js AgentExecutor class
async executeStep(step) {
  switch (step.action) {
    // Original actions
    case 'navigate':
    case 'click':
    case 'type':
    case 'extract':
      // ... existing code
      
    // NEW: Add domain-specific actions
    case 'extract_price':
      return await this.extractPrice(step.selector);
      
    case 'compare_products':
      return await this.compareProducts(step.products);
      
    case 'screenshot':
      return await this.takeScreenshot(step.area);
  }
}

async extractPrice(selector) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: this.tabId },
    func: (sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      const text = element.textContent;
      const priceMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      return priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;
    },
    args: [selector]
  });
  return result.result;
}
```

### Customizing the Planning Prompt

```javascript
// In background.js planSteps() method
async planSteps(pageInfo) {
  const prompt = `You are an AI ${this.agentType || 'browser'} automation agent.

Task: ${this.task}

${this.getDomainSpecificContext()}

Current Page:
- Title: ${pageInfo.title}
- URL: ${pageInfo.url}
- HTML: ${pageInfo.html.slice(0, 2000)}...

${this.getActionSchema()}

Create a step-by-step plan with JSON array of actions.
Max 5 steps, be specific and efficient.`;

  // ... rest of planning logic
}

getDomainSpecificContext() {
  // Override this in customized versions
  return 'Specialized instructions for your domain...';
}
```

### UI Customization Examples

```css
/* In sidepanel.css - Add after existing styles */

/* Shopping Assistant: Product Cards */
.product-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-secondary);
  margin-bottom: 12px;
  border: 1px solid var(--border);
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--success);
}

/* Research Tool: Citation Display */
.citation {
  padding: 8px 12px;
  background: #f0f9ff;
  border-left: 3px solid var(--primary);
  font-size: 12px;
  margin-top: 8px;
}
```

## Code Generation Guidelines

### What Chromie AI Should Preserve

1. **Core Architecture**: Keep AgentExecutor class structure
2. **LLM Integration**: Maintain API call patterns
3. **Safety Features**: Keep step limits, timeouts, cancellation
4. **Message Flow**: Port-based communication pattern
5. **Storage Pattern**: chrome.storage.local for settings

### What Chromie AI Should Customize

1. **Action Types**: Add/modify based on use case
2. **Planning Logic**: Domain-specific task breakdown
3. **UI Elements**: Custom displays for specific data types
4. **Result Formatting**: How information is presented
5. **Settings**: Add domain-specific configuration options

### Required Permissions

Base permissions from template:
- `storage`, `activeTab`, `tabs`, `scripting`, `sidePanel`, `debugger`

May need to add for specific use cases:
- `downloads` - If downloading files
- `bookmarks` - If managing bookmarks
- `history` - If analyzing browsing history
- `cookies` - If handling authentication

## Testing Generated Extensions

### Quick Test Checklist

1. ✅ Options page opens and saves settings
2. ✅ Side panel connects to background worker
3. ✅ API key validation works
4. ✅ Example commands execute without errors
5. ✅ Stop button cancels execution
6. ✅ Error messages display correctly
7. ✅ Chat history persists
8. ✅ Custom actions work as intended

### Common Issues & Fixes

**Issue**: "API key not configured"
- **Fix**: Ensure options.js saves to chrome.storage.local correctly

**Issue**: Port disconnects immediately
- **Fix**: Check background.js connection validation logic

**Issue**: Agent doesn't execute steps
- **Fix**: Verify LLM API response parsing in parseSteps()

**Issue**: DOM interactions fail
- **Fix**: Check if dom-helper.js is injected properly

## Migration Path from Nanobrowser

For users familiar with Nanobrowser:

| Nanobrowser Feature | Template Equivalent | Notes |
|---------------------|---------------------|-------|
| TypeScript | Vanilla JavaScript | Simpler for AI generation |
| React UI | Plain HTML/CSS/JS | More customizable |
| LangChain | Direct API calls | Lower dependency overhead |
| Multi-package monorepo | Single directory | Easier to understand/modify |
| Planner/Navigator agents | Single AgentExecutor | Can be split if needed |
| Storage abstraction | chrome.storage.local | Direct API usage |

## Advanced Customization Examples

### Adding Vision/Screenshot Analysis

```javascript
// In background.js
async analyzeScreenshot() {
  const screenshot = await chrome.tabs.captureVisibleTab(
    null, 
    { format: 'png' }
  );
  
  // Call vision API (e.g., GPT-4 Vision)
  const analysis = await this.callVisionAPI(screenshot);
  return analysis;
}

async callVisionAPI(imageData) {
  // Implementation for GPT-4 Vision or Claude with images
}
```

### Adding Authentication Handling

```javascript
// New file: auth-helper.js
class AuthHelper {
  async detectLoginForm() {
    // Detect login forms on page
  }
  
  async fillCredentials(username, password) {
    // Fill in securely stored credentials
  }
  
  async handleOAuth(provider) {
    // Handle OAuth flows
  }
}
```

### Adding Workflow Recording

```javascript
// In sidepanel.js
class WorkflowRecorder {
  constructor() {
    this.recording = false;
    this.steps = [];
  }
  
  startRecording() {
    this.recording = true;
    this.steps = [];
  }
  
  recordStep(action, target, value) {
    if (this.recording) {
      this.steps.push({ action, target, value, timestamp: Date.now() });
    }
  }
  
  async saveWorkflow(name) {
    await chrome.storage.local.set({
      [`workflow_${name}`]: this.steps
    });
  }
  
  async replayWorkflow(name) {
    const result = await chrome.storage.local.get(`workflow_${name}`);
    return result[`workflow_${name}`] || [];
  }
}
```

## Performance Optimization Tips

1. **Cache DOM queries**: Store frequently accessed elements
2. **Batch operations**: Group multiple DOM changes
3. **Use cheaper models**: For simple tasks, use GPT-4o-mini or Claude Haiku
4. **Limit context size**: Only send relevant HTML to LLM
5. **Debounce UI updates**: Don't flood the message port

## Security Best Practices

1. **Input validation**: Sanitize all user inputs before execution
2. **URL validation**: Whitelist or validate navigation targets
3. **API key encryption**: Consider encrypting stored keys
4. **Rate limiting**: Add delays between API calls
5. **User confirmation**: For sensitive actions (purchases, deletes)

## Support & Resources

- **Template Source**: `/chromie-templates/templates/ai-browser-agent/`
- **Nanobrowser Repo**: https://github.com/nanobrowser/nanobrowser
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
- **LLM API Docs**: 
  - OpenAI: https://platform.openai.com/docs
  - Anthropic: https://docs.anthropic.com/

## Contributing Template Improvements

If you enhance this template, consider:
1. Adding more action types
2. Improving error handling
3. Optimizing prompts for better planning
4. Adding example workflows
5. Creating UI components library

Submit improvements back to the chromie-templates repo for community benefit!

