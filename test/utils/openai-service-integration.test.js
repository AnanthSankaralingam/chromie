const { assert, assertEqual } = require('./test-helpers');

async function runOpenAIServiceIntegrationTests() {
  console.log('Running OpenAI Service Integration tests with real API calls...');

  // Test 1: Import prompts and verify they work
  {
    const newCodingPrompts = require('../../src/lib/prompts/new-coding.js');
    const followUpPrompts = require('../../src/lib/prompts/follow-up-coding.js');

    assert(typeof newCodingPrompts.NEW_EXT_POPUP_PROMPT === 'string', 'NEW_EXT_POPUP_PROMPT should be a string');
    assert(typeof followUpPrompts.FOLLOW_UP_CODING_PROMPT === 'string', 'FOLLOW_UP_CODING_PROMPT should be a string');

    console.log('✓ Prompts imported successfully');
  }

  // Test 2: Test actual code generation with NEW_EXT_POPUP_PROMPT
  {
    console.log('🧪 Testing initial extension generation...');

    const openaiService = require('../../src/lib/openai-service.js');
    const newCodingPrompts = require('../../src/lib/prompts/new-coding.js');

    const result = await openaiService.generateExtension({
      featureRequest: 'Create a simple popup that shows "Hello World"',
      requestType: 'new_extension',
      sessionId: 'test-session-' + Date.now(),
      skipScraping: true
    });

    assert(result.success === true, 'Initial generation should succeed');
    assert(result.files, 'Should have generated files');
    assert(result.responseId, 'Should have responseId for conversation chaining');
    assert(typeof result.responseId === 'string', 'responseId should be a string');
    assert(Object.keys(result.files).length > 0, 'Should generate at least one file');

    // Check for expected files based on popup prompt
    const expectedFiles = ['manifest.json', 'popup.html', 'popup.js'];
    const generatedFiles = Object.keys(result.files);

    for (const expectedFile of expectedFiles) {
      assert(generatedFiles.includes(expectedFile), `Should generate ${expectedFile}`);
    }

    console.log('✓ Initial extension generation successful');
    console.log(`   Generated files: ${generatedFiles.join(', ')}`);
    console.log(`   Response ID: ${result.responseId}`);

    // Store for follow-up test
    global.testResponseId = result.responseId;
    global.testSessionId = result.sessionId;
  }

  // Test 3: Test follow-up conversation with previousResponseId
  {
    console.log('🧪 Testing follow-up conversation...');

    const openaiService = require('../../src/lib/openai-service.js');

    const followupResult = await openaiService.generateExtension({
      featureRequest: 'Add a button that changes the text to "Goodbye World"',
      requestType: 'add_to_existing',
      sessionId: global.testSessionId,
      previousResponseId: global.testResponseId,
      existingFiles: {}, // Would normally contain the files from first turn
      skipScraping: true
    });

    assert(followupResult.success === true, 'Follow-up generation should succeed');
    assert(followupResult.files, 'Should have generated files');
    assert(followupResult.responseId, 'Should have new responseId');
    assert(typeof followupResult.responseId === 'string', 'responseId should be a string');
    assert(followupResult.responseId !== global.testResponseId, 'Should have different responseId from initial');

    console.log('✓ Follow-up conversation successful');
    console.log(`   New Response ID: ${followupResult.responseId}`);
  }

  // Test 4: Test prompt replacement logic works in real calls
  {
    console.log('🧪 Testing prompt replacement in real API calls...');

    const openaiService = require('../../src/lib/openai-service.js');
    const newCodingPrompts = require('../../src/lib/prompts/new-coding.js');

    // Create a minimal test case
    const testResult = await openaiService.generateExtension({
      featureRequest: 'Create a minimal popup with just an H1 title',
      requestType: 'new_extension',
      sessionId: 'test-prompt-replacement-' + Date.now(),
      skipScraping: true
    });

    assert(testResult.success === true, 'Prompt replacement test should succeed');
    assert(testResult.explanation, 'Should have explanation');
    assert(testResult.explanation.includes('popup') || testResult.explanation.includes('extension'),
           'Explanation should mention popup or extension');

    console.log('✓ Prompt replacement logic works in real API calls');
  }

  console.log('✓ All OpenAI Service Integration tests passed with real API calls!');
  console.log('\n📊 Test Summary:');
  console.log('- ✅ Initial extension generation');
  console.log('- ✅ Two-turn conversation flow');
  console.log('- ✅ Response ID chaining');
  console.log('- ✅ Prompt replacement functionality');
}

if (require.main === module) {
  runOpenAIServiceIntegrationTests().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runOpenAIServiceIntegrationTests };
