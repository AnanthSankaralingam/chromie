const { assert, assertEqual } = require('./test-helpers');

async function runConversationStateTests() {
  console.log('Running ConversationState tests...');

  const {
    loadResponseId,
    saveResponseId,
    resetResponseId,
    getConversationStorageKey,
  } = await import('../../src/lib/conversation-state.js');

  // Mock localStorage
  const storage = (() => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      _dump: () => Object.fromEntries(map.entries()),
    };
  })();

  const projectId = 'proj-123';
  const key = getConversationStorageKey(projectId);

  // 1) Storage key format
  {
    const key = getConversationStorageKey('test-proj');
    assertEqual(key, 'chromie:responseId:test-proj', 'Storage key should have correct format');
  }

  // 2) Persistence save/load
  {
    const responseId = 'resp_12345';
    saveResponseId(projectId, responseId, storage);
    const raw = storage.getItem(key);
    assert(raw && raw.includes('resp_12345'), 'Saved storage should contain responseId');

    const loaded = loadResponseId(projectId, storage);
    assertEqual(loaded, 'resp_12345', 'Loaded responseId should match saved value');
  }

  // 3) Reset clears responseId
  {
    resetResponseId(projectId, storage);
    const raw = storage.getItem(key);
    assertEqual(raw, null, 'After reset, storage should be empty for key');
  }

  // 4) Load returns null when no data
  {
    const loaded = loadResponseId('nonexistent-project', storage);
    assertEqual(loaded, null, 'Should return null for nonexistent project');
  }

  // 5) Save null responseId
  {
    saveResponseId(projectId, null, storage);
    const loaded = loadResponseId(projectId, storage);
    assertEqual(loaded, null, 'Should handle null responseId correctly');
  }

  console.log('✓ ConversationState tests passed');
}

// Run tests
runConversationStateTests().catch((e) => {
  console.error(e);
  process.exit(1);
});


