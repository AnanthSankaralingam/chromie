# Custom Hooks

This directory contains custom React hooks that can be reused across different components in the application.

## Available Hooks

### `useChat`
- **Purpose**: Manages chat state and functionality for AI conversations
- **Location**: `use-chat.js`
- **Usage**: Used in AI chat components to handle messages, generation, and URL prompts
- **Features**:
  - Message state management
  - Auto-generation logic
  - API communication
  - URL handling
  - Error handling

## Importing Hooks

```javascript
// Import individual hooks
import { useChat } from '@/hooks/use-chat'

// Or import from index (recommended)
import { useChat } from '@/hooks'
```

## Adding New Hooks

When adding new hooks to this directory:

1. **Create the hook file** with a descriptive name (e.g., `use-auth.js`)
2. **Export the hook** from the file
3. **Add to index.js** for clean imports
4. **Update this README** with documentation

### Example Hook Structure

```javascript
// use-example.js
import { useState, useEffect } from 'react'

export function useExample(param) {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => {
    // Hook logic here
  }, [param])
  
  return { state, setState }
}
```

### Update index.js

```javascript
// index.js
export { useExample } from './use-example'
```

## Best Practices

- **Single Responsibility**: Each hook should have one clear purpose
- **Reusability**: Design hooks to be used across multiple components
- **Testing**: Hooks should be easily testable in isolation
- **Documentation**: Include clear JSDoc comments for complex hooks
- **Error Handling**: Include proper error handling and fallbacks

## Future Hooks

Potential hooks that could be added:

- `useAuth` - Authentication state management
- `useProject` - Project data and operations
- `useTokenUsage` - Token usage tracking
- `useLocalStorage` - Local storage operations
- `useDebounce` - Debounced value handling
- `useMediaQuery` - Responsive design hooks 