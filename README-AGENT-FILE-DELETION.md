# Agent File Deletion - Quick Start Guide

## What Was Implemented

A complete safe file deletion system for AI agents with multiple layers of protection, user confirmation, and audit logging.

## Key Features

✅ **Protection Rules** - Critical files (manifest.json) can never be deleted  
✅ **User Confirmation** - Sensitive files require approval before deletion  
✅ **Safety Checks** - Whitelist approach, minimum file count enforcement  
✅ **Audit Logging** - All operations logged to database  
✅ **UI Components** - Confirmation dialogs and status notifications  
✅ **Tool Integration** - Fully integrated into the AI agent tool system  

## File Structure

```
src/
├── lib/
│   ├── file-safety/
│   │   └── protection-rules.js          # Protection rules & safety checks
│   ├── codegen/
│   │   ├── file-operations.js           # File deletion handler
│   │   └── followup-handlers/
│   │       ├── followup-orchestrator.js # Updated with tool context
│   │       └── tool-executor.js         # Updated with delete_file tool
│   ├── ai-tools/
│   │   └── file-tools.js                # Tool definitions for agents
│   └── prompts/
│       └── followup/
│           └── follow-up-patching-with-tools.js  # Added FILE_DELETE_TOOL
└── components/
    └── ui/
        └── file-deletion-confirmation.tsx  # UI components

docs/
└── agent-file-deletion.md               # Full documentation

sql/
└── create_agent_file_operations_table.sql  # Database schema
```

## How It Works

### 1. Agent Requests Deletion

During code generation, the agent can call:

```json
{
  "tool": "delete_file",
  "file_path": "scripts/old-feature.js",
  "reason": "Functionality moved to background.js"
}
```

### 2. Safety Check

The system checks:
- ❌ Is it a critical file? (manifest.json) → **Block**
- ⚠️ Is it a sensitive file? (background.js, popup.js) → **Require confirmation**
- ✅ Is it safe to delete? → **Proceed**

### 3. User Confirmation (if needed)

For sensitive files, user sees:
```
⚠️ Agent wants to delete background.js
Reason: Consolidating to service-worker.js
[Allow] [Keep File]
```

### 4. Execution & Logging

- File deleted from database
- Operation logged to `agent_file_operations` table
- Agent receives success/failure response

## Next Steps to Complete Integration

### 1. Enable the Tool in Planning

Update the planning system to suggest `delete_file` tool when needed:

**File:** `src/lib/prompts/followup/workflows/planning-context.js`

Add to available tools list:
```javascript
"delete_file": "Safe file deletion for cleanup/refactoring"
```

### 2. Create the Database Table

Run the SQL migration:

```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f sql/create_agent_file_operations_table.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `sql/create_agent_file_operations_table.sql`
3. Run the migration

### 3. Integrate Frontend Confirmation UI

The UI components are created but need to be wired into your main generation interface:

**File to update:** `src/components/pages/[your-chat-interface].tsx`

```javascript
import { 
  FileDeletionConfirmation,
  FileDeletionSuccess,
  FileDeletionBlocked,
  FileDeletionDeclined
} from '@/components/ui/file-deletion-confirmation'

// In your stream event handler:
if (event.type === 'confirmation_required' && event.action === 'delete_file') {
  // Show confirmation dialog
  setConfirmationPending(event.details)
}

if (event.type === 'file_deleted') {
  // Show success notification
}

if (event.type === 'file_deletion_blocked') {
  // Show blocked notification
}
```

### 4. Test the Feature

Create test scenarios:

```javascript
// Test 1: Safe deletion (should succeed)
"Delete scripts/helper.js since it's no longer used"

// Test 2: Critical file (should block)
"Delete manifest.json"

// Test 3: Sensitive file (should prompt)
"Delete background.js and consolidate into service-worker.js"
```

## Configuration

### Customize Protection Rules

Edit `src/lib/file-safety/protection-rules.js`:

```javascript
const PROTECTION_RULES = {
  CRITICAL_FILES: ['manifest.json', 'your-critical-file.js'],
  SENSITIVE_FILES: ['background.js', 'your-sensitive-file.js'],
  SAFE_EXTENSIONS: ['.js', '.css', '.html', '.json', '.md'],
  PROTECTED_DIRECTORIES: ['icons/', 'assets/', 'your-dir/'],
  MIN_PROJECT_FILES: 2  // Minimum files to keep in project
}
```

### Adjust Confirmation Behavior

By default:
- Critical files: **Never deletable**
- Sensitive files: **Require confirmation**
- Safe files: **Auto-delete**

To make all deletions require confirmation:
```javascript
// In protection-rules.js, return requiresConfirmation: true for all
```

## Monitoring & Debugging

### View Audit Logs

Query the audit table:

```sql
-- Recent deletions
SELECT * FROM agent_file_operations 
WHERE operation_type = 'delete'
ORDER BY created_at DESC 
LIMIT 10;

-- Deletions for a specific project
SELECT * FROM agent_file_operations 
WHERE project_id = 'your-project-id'
AND operation_type = 'delete';

-- User-confirmed vs auto-deletions
SELECT 
  user_confirmed,
  COUNT(*) as count
FROM agent_file_operations
WHERE operation_type = 'delete'
GROUP BY user_confirmed;
```

### Debug Logs

Key log messages to watch:
```
🤖 Agent requesting deletion: [file]
❌ Deletion blocked: [reason]
⚠️ Deletion requires confirmation
✅ User approved deletion
🚫 User declined deletion
🗑️ Agent successfully deleted file
```

## Security Notes

- ✅ All safety checks happen server-side
- ✅ Agents never have direct database write access
- ✅ Users can always decline sensitive deletions
- ✅ Complete audit trail with reasons
- ✅ Deleted files recoverable from version history

## Support

For issues or questions:
1. Check logs for safety check failures
2. Verify database table was created
3. Ensure protection rules are configured correctly
4. Review audit logs for operation history

## Documentation

Full documentation: `docs/agent-file-deletion.md`

This includes:
- Complete architecture overview
- API reference
- Testing guidelines
- Security considerations
- Future enhancements
