const { assert, assertEqual } = require('./test-helpers');

function runFollowUpPromptTests() {
  console.log('Running follow-up prompt tests...');

  // Import using CommonJS compatibility from the prompt file
  const { FOLLOW_UP_CODING_PROMPT } = require('../../src/lib/prompts/follow-up-coding.js');

  assert(typeof FOLLOW_UP_CODING_PROMPT === 'string', 'Prompt should export a string');

  // Ensure we are NOT using dynamic placeholders in the prompt anymore
  const absentPlaceholders = [
    'conversation_history',
    'user_follow_up',
    'ext_name',
    'ext_description',
    'frontend_type',
    'existing_extension_summary',
    'repo_tree',
    'relevant_files_content',
  ];
  for (const key of absentPlaceholders) {
    assert(!FOLLOW_UP_CODING_PROMPT.includes(`{${key}}`), `Prompt should not contain placeholder: {${key}}`);
  }

  // Should explicitly indicate not to rely on placeholders and use chat history
  assert(/Do not rely on placeholders/i.test(FOLLOW_UP_CODING_PROMPT), 'Prompt should instruct not to rely on placeholders');

  // Check diff instructions exist
  assert(/unified diff/i.test(FOLLOW_UP_CODING_PROMPT), 'Prompt should mention unified diff');
  assert(/--- a\//.test(FOLLOW_UP_CODING_PROMPT), 'Prompt should include diff header example');
  assert(/\+\+\+ b\//.test(FOLLOW_UP_CODING_PROMPT), 'Prompt should include diff header example');
  assert(/Do NOT include binary files or icons/i.test(FOLLOW_UP_CODING_PROMPT), 'Prompt should exclude binary/icon changes');

  console.log('✓ Follow-up prompt tests passed');
}

if (require.main === module) {
  runFollowUpPromptTests();
}

module.exports = { runFollowUpPromptTests };

