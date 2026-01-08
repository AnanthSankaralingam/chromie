# AI Browser Agent Template

A simplified template inspired by [Nanobrowser](https://github.com/nanobrowser/nanobrowser) for creating AI-powered browser automation extensions.

## Overview

This template provides a foundation for building intelligent browser agents that can:
- Understand and execute natural language commands
- Navigate websites autonomously
- Extract and analyze web content
- Perform multi-step automation tasks
- Interact with DOM elements intelligently

## Architecture

### Multi-Agent System

The extension uses a multi-agent architecture similar to Nanobrowser:

1. **Planner Agent**: Breaks down user tasks into actionable steps
2. **Navigator Agent**: Executes browser actions (navigate, click, type, extract)
3. **Executor**: Coordinates agent actions and manages state

### Components

#### Side Panel (`sidepanel.html/js/css`)
- Modern chat interface for user interaction
- Real-time task progress display
- Chat history management
- Configuration status indicators

#### Background Service Worker (`background.js`)
- AgentExecutor class for task orchestration
- LLM API integration (OpenAI, Anthropic)
- Browser automation logic
- Message handling between components

#### Content Script (`content.js`)
- Page information extraction
- DOM element interaction
- Visual feedback (highlighting, etc.)

#### DOM Helper (`dom-helper.js`)
- Advanced DOM manipulation utilities
- Element discovery and selection
- Page structure analysis
- Visibility detection

#### Options Page (`options.html/js/css`)
- API key configuration
- Model selection
- Agent behavior settings
- Advanced customization options

## Features

### Core Capabilities

- **Natural Language Interface**: Users can describe tasks in plain English
- **Autonomous Navigation**: Agent can browse multiple pages to complete tasks
- **Smart DOM Interaction**: Intelligent element selection and interaction
- **Task Planning**: Breaks complex tasks into manageable steps
- **Context Awareness**: Understands page content and structure
- **Error Handling**: Graceful failure recovery and user feedback

### Supported Actions

- Navigate to URLs
- Click elements
- Fill form inputs
- Scroll pages
- Extract text content
- Wait for elements
- Analyze page structure

### LLM Providers

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus

## Configuration

### API Keys

Users need to configure their LLM API keys in the options page:
1. Click the settings icon in the side panel
2. Select API provider (OpenAI or Anthropic)
3. Choose model
4. Enter API key
5. Save settings

### Agent Settings

Customizable parameters:
- **Max Steps**: Limit automation steps (1-20)
- **Timeout**: Action timeout in seconds (5-60)
- **Auto-scroll**: Automatically scroll to elements
- **Verbose Logging**: Detailed console logs
- **Save History**: Store chat conversations

## Usage Examples

### Example 1: Information Extraction
```
User: "Extract the top 5 headlines from TechCrunch"
Agent: 
1. Navigates to techcrunch.com
2. Extracts headline elements
3. Returns formatted list
```

### Example 2: Research Task
```
User: "Find trending Python repos on GitHub with over 1000 stars"
Agent:
1. Goes to GitHub trending page
2. Filters by Python language
3. Extracts repos with star counts
4. Returns summarized results
```

### Example 3: Form Automation
```
User: "Fill out the contact form with my information"
Agent:
1. Identifies form inputs
2. Fills in provided details
3. Submits form
4. Confirms submission
```

## Security Considerations

### API Key Storage
- Keys stored locally using `chrome.storage.local`
- Never transmitted except to official API endpoints
- Users have full control over their credentials

### Permissions
The extension requires:
- `storage`: Save settings and history
- `activeTab`: Access current tab content
- `tabs`: Query and update tabs
- `scripting`: Inject content scripts
- `sidePanel`: Display chat interface
- `debugger`: Advanced browser automation
- `host_permissions`: Access web pages

### Safety Features
- Step limits prevent infinite loops
- Timeout protection for stuck operations
- User can stop execution at any time
- Sandboxed execution environment

## Customization Guide

### Modifying Agent Behavior

Edit `background.js` to customize:

1. **Planning Logic**: Modify `planSteps()` method
2. **Action Handlers**: Extend `executeStep()` with new actions
3. **Result Processing**: Customize `getFinalResult()`

### Adding New Actions

```javascript
// In AgentExecutor class
async executeStep(step) {
  switch (step.action) {
    case 'your_new_action':
      await this.yourNewAction(step.params);
      break;
    // ... existing actions
  }
}

async yourNewAction(params) {
  // Implementation
}
```

### Styling Customization

Modify CSS variables in `sidepanel.css`:

```css
:root {
  --primary: #6366f1;        /* Primary color */
  --primary-dark: #4f46e5;   /* Hover states */
  --bg: #ffffff;             /* Background */
  /* ... other variables */
}
```

## Development

### Testing the Extension

1. Build/load extension in Chrome
2. Configure API key in options
3. Open side panel on any webpage
4. Test with simple commands first

### Debugging

Enable verbose logging in options page for detailed console output:
- Background worker: Right-click extension → "Inspect service worker"
- Side panel: Right-click panel → "Inspect"
- Content script: Open DevTools on target page

### Performance Tips

1. Use faster models (GPT-4o-mini, Claude Haiku) for development
2. Set lower max steps during testing
3. Keep prompts concise
4. Monitor API usage in provider console

## Limitations

### Current Constraints

- Max 10-20 steps per task (configurable)
- No state persistence between sessions
- Limited to Chrome/Edge browsers
- Requires internet for LLM API calls
- No built-in authentication handling for complex sites

### Future Enhancements

Potential improvements for variants:
- Multi-tab coordination
- Screenshot/vision analysis
- File upload/download handling
- Cookie/session management
- Workflow recording and replay
- Local LLM support (Ollama integration)

## Comparison to Nanobrowser

### Similarities
- Multi-agent architecture
- Side panel chat interface
- Natural language task input
- Browser automation capabilities
- LLM API integration

### Differences
- **Nanobrowser**: TypeScript, React, monorepo, LangChain
- **This Template**: Vanilla JS, simpler structure, direct API calls
- **Purpose**: Template is educational/starter, Nanobrowser is production-ready

## Use Cases

This template is ideal for:
- AI automation extensions
- Research assistants
- Data extraction tools
- Testing/QA automation
- Content monitoring
- Competitive analysis tools
- Lead generation assistants

## Credits

Inspired by [Nanobrowser](https://github.com/nanobrowser/nanobrowser) - an open-source AI web automation Chrome extension.

## License

Apache 2.0 - Free to use and modify for your projects.

## Support

For issues with this template:
1. Check browser console for errors
2. Verify API key configuration
3. Test with simpler commands first
4. Review agent logs in background worker

For Chromie platform support, contact the Chromie team.

