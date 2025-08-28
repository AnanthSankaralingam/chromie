# Stagehand Integration for Chrome Extensions

This document describes the Stagehand integration system that enables automated testing of Chrome extensions using the Stagehand automation framework.

## Overview

The Stagehand integration provides a communication bridge between web pages and Chrome extensions, allowing Stagehand to send commands to extensions and receive responses. This enables deterministic, automated testing of extension functionality.

## Architecture

### 1. Content Script Bridge
- Listens for Stagehand commands via `window.postMessage`
- Relays commands to the extension's service worker
- Returns responses back to Stagehand

### 2. Service Worker Bridge
- Handles Stagehand commands in the extension's background context
- Executes extension-specific functionality
- Provides standardized command interface

### 3. Stagehand Commands
- Automatically generated based on extension functionality
- Support common operations like login, scraping, data export
- Customizable for specific extension needs

## How It Works

### Communication Flow
```
Stagehand → window.postMessage → Content Script → chrome.runtime.sendMessage → Service Worker
                                                                                    ↓
Stagehand ← window.postMessage ← Content Script ← chrome.runtime.sendMessage ← Response
```

### Command Structure
```javascript
// Stagehand sends command
window.postMessage({
  type: "STAGEHAND_EXT",
  id: "unique-id",
  cmd: "LOGIN",
  payload: { username: "test", password: "test" }
}, "*")

// Extension responds
window.postMessage({
  type: "STAGEHAND_EXT_RESULT",
  id: "unique-id",
  resp: { success: true, data: {...} }
}, "*")
```

## Supported Commands

### Basic Commands
- `GET_EXTENSION_INFO` - Get extension details
- `GET_PAGE_DATA` - Get current page information
- `ANALYZE` - Analyze page content

### Action Commands
- `EXECUTE_ACTION` - Execute custom actions
- `MODIFY_PAGE` - Modify page content
- `EXPORT_DATA` - Export page data

### Functional Commands
- `LOGIN` - Handle login forms
- `SCRAPE` - Scrape page data
- `HIGHLIGHT` - Highlight page elements

## Integration in Code Generation

### Updated Prompts
All code generation prompts now include:
- Stagehand bridge integration requirements
- Mandatory content script and service worker bridges
- Stagehand command generation

### Generated Files
Extensions now include:
- `content.js` with Stagehand bridge
- `background.js` with Stagehand command handlers
- `stagehand_commands` array in the response

## Testing Interface

### Live Testing Tab
- Traditional manual testing interface
- Extension popup rendering
- Communication bridge logging

### Stagehand Automation Tab
- Automated testing interface
- Command execution visualization
- Test results display

## Usage

### For Extension Developers
1. Generate extension with Stagehand integration
2. Test manually using Live Testing tab
3. Run automated tests using Stagehand Automation tab

### For Stagehand Users
1. Use generated Stagehand commands
2. Execute automated test sequences
3. Verify extension functionality

## Example Stagehand Script

```javascript
import { act } from '@stagehand/automation'

export default async function testExtension(page) {
  // Get extension info
  const extInfo = await sendCommandToExtension(page, "GET_EXTENSION_INFO")
  
  // Test login functionality
  const loginResult = await sendCommandToExtension(page, "LOGIN", {
    username: "test@example.com",
    password: "testpassword"
  })
  
  // Scrape page data
  const scrapedData = await sendCommandToExtension(page, "SCRAPE", {
    selectors: { titles: "h1, h2, h3", links: "a" }
  })
  
  return { extInfo, loginResult, scrapedData }
}
```

## Benefits

### Deterministic Testing
- No reliance on UI clicking
- Stable command interface
- Predictable test results

### Comprehensive Coverage
- Tests all extension functionality
- Handles edge cases
- Validates communication bridges

### Developer Experience
- Automated test generation
- Visual test execution
- Detailed logging and debugging

## Future Enhancements

- Real Stagehand integration (currently simulated)
- Custom command generation based on extension analysis
- Advanced automation scenarios
- Performance testing capabilities

## Technical Notes

- Bridge system works with all extension types (popup, side panel, overlay)
- Commands are generated based on extension description and functionality
- Error handling ensures graceful fallbacks
- Communication is secure and isolated per session
