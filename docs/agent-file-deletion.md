# Agent File Deletion Feature

## Overview

The agent file deletion feature allows AI agents to safely delete files during code generation and refactoring operations. This feature includes multiple layers of protection to prevent accidental deletion of critical files.

## Architecture

### Protection Layers

1. **Blacklist Protection** - Critical files (e.g., `manifest.json`) can never be deleted
2. **Whitelist Approach** - Only specific file types can be deleted (`.js`, `.css`, `.html`, `.json`, `.md`)
3. **User Confirmation** - Sensitive files require explicit user approval before deletion
4. **Minimum File Count** - Projects must maintain at least 2 files
5. **Audit Logging** - All agent file operations are logged to the database

### Components

```
src/lib/file-safety/protection-rules.js       # Protection rules and safety checks
src/lib/codegen/file-operations.js            # File operation handlers
src/lib/ai-tools/file-tools.js                # Tool definitions for AI agents
src/components/ui/file-deletion-confirmation.tsx  # UI components
src/lib/codegen/followup-handlers/tool-executor.js  # Tool execution routing
```

## Protection Rules

### Critical Files (Never Deletable)
- `manifest.json` - Core Chrome extension manifest

### Sensitive Files (Require Confirmation)
- `background.js` - Background script
- `content.js` - Content script
- `popup.html` / `popup.js` - Extension popup
- `options.html` / `options.js` - Options page
- `service-worker.js` - Service worker

### Protected Directories (Require Confirmation)
- `icons/` - Extension icons
- `assets/` - Asset files
- `images/` - Image files

### Safe File Types
- `.js` - JavaScript files
- `.css` - Stylesheets
- `.html` - HTML files
- `.json` - JSON files (except manifest.json)
- `.md` - Markdown files

## Usage

### For AI Agents

The agent can delete files by calling the `delete_file` tool:

```json
{
  "tool": "delete_file",
  "file_path": "scripts/old-feature.js",
  "reason": "Functionality moved to background.js, file no longer needed"
}
```

**Requirements:**
- Must provide a clear `reason` for deletion
- File must exist in the project
- File must not be protected
- Project must have more than 2 files after deletion

### Tool Responses

#### Success
```json
{
  "success": true,
  "message": "Successfully deleted file: scripts/old-feature.js",
  "filePath": "scripts/old-feature.js"
}
```

#### Blocked (Critical File)
```json
{
  "success": false,
  "blocked": true,
  "error": "Critical system file - cannot be deleted",
  "message": "Cannot delete manifest.json: Critical system file - cannot be deleted. This file is protected and cannot be removed by agents."
}
```

#### Declined (User Rejected)
```json
{
  "success": false,
  "declined": true,
  "error": "User declined file deletion",
  "message": "File deletion declined: User chose to keep background.js. Consider an alternative approach."
}
```

#### Not Found
```json
{
  "success": false,
  "notFound": true,
  "error": "File scripts/nonexistent.js does not exist",
  "message": "File scripts/nonexistent.js does not exist in the project."
}
```

## User Confirmation Flow

When an agent requests deletion of a sensitive file:

1. **Agent makes deletion request** → Tool call with file path and reason
2. **Safety check determines confirmation needed** → File is sensitive/protected
3. **UI displays confirmation dialog** → Shows file path, agent's reason, safety explanation
4. **User chooses:**
   - **Allow Deletion** → File is deleted, operation logged
   - **Keep File** → Deletion cancelled, agent is notified

### Confirmation UI

The confirmation appears as an inline alert during the generation stream:

```
⚠️ Agent File Deletion Request

📄 background.js

Agent's reason: Consolidating all background logic into service-worker.js

ℹ️ Core extension file - requires confirmation

[Allow Deletion]  [Keep File]
```

## Database Schema

### Audit Log Table

```sql
CREATE TABLE agent_file_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  file_path text NOT NULL,
  reason text,
  user_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_file_ops_project ON agent_file_operations(project_id);
CREATE INDEX idx_agent_file_ops_created ON agent_file_operations(created_at DESC);
```

## API Integration

### Stream Events

During code generation, the following events are emitted for file deletions:

```javascript
// Deletion pending
{ type: 'file_deletion_pending', filePath: 'scripts/old.js', reason: '...' }

// Confirmation required
{ type: 'confirmation_required', action: 'delete_file', details: {...} }

// Deletion success
{ type: 'file_deleted', filePath: 'scripts/old.js' }

// Deletion failed
{ type: 'file_deletion_failed', filePath: 'scripts/old.js', error: '...' }

// Deletion blocked
{ type: 'file_deletion_blocked', filePath: 'manifest.json', reason: '...' }

// Deletion declined
{ type: 'file_deletion_declined', filePath: 'background.js' }
```

## Testing

### Test Cases

1. ✅ **Safe deletion** - Delete obsolete helper file
   - Expected: Succeeds immediately
   
2. ❌ **Critical file protection** - Try to delete manifest.json
   - Expected: Blocked with error message
   
3. ⚠️ **Sensitive file confirmation** - Try to delete background.js
   - Expected: Prompts user for confirmation
   
4. ✅ **User approves** - User approves sensitive file deletion
   - Expected: File deleted, operation logged
   
5. ❌ **User declines** - User declines sensitive file deletion
   - Expected: File kept, agent notified
   
6. ❌ **Non-existent file** - Try to delete file that doesn't exist
   - Expected: Error with not found message
   
7. ❌ **Minimum files** - Try to delete when only 2 files remain
   - Expected: Blocked to maintain minimum project size

## Security Considerations

1. **No direct database access** - Agents don't have direct database write access
2. **Server-side validation** - All safety checks happen server-side
3. **Audit trail** - Every operation is logged with reason and confirmation status
4. **User control** - Users can always decline sensitive file deletions
5. **Version history** - Deleted files can be recovered from project version history

## Future Enhancements

- [ ] Configurable protection rules per project
- [ ] Bulk deletion with single confirmation
- [ ] File deletion preview (show what will break)
- [ ] Undo deleted file (restore from last version)
- [ ] Admin dashboard to view all agent operations
- [ ] Pattern-based protection rules (e.g., `*.config.js`)
