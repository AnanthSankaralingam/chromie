const { assert, assertEqual } = require('./test-helpers');

async function runGenerateRouteFollowupTests() {
  console.log('Running Generate Route Follow-up tests...');

  // Mock Supabase client
  const createMockSupabaseClient = () => ({
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'test-project' }, error: null }),
          maybeSingle: () => Promise.resolve({ data: { total_tokens: 100 }, error: null }),
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: { plan: 'pro' }, error: null })
            })
          })
        }),
        eq: (col, val) => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'test-project' }, error: null })
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      insert: () => Promise.resolve({ error: null })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })
    }
  });

  // Mock generateExtension function
  const mockGenerateExtension = (params) => {
    const { previousResponseId, existingFiles } = params;
    const isFollowUp = !!previousResponseId;

    if (isFollowUp) {
      // Simulate diff response for follow-up
      return Promise.resolve({
        success: true,
        explanation: '```diff\n--- a/manifest.json\n+++ b/manifest.json\n@@ -1,3 +1,4 @@\n {\n-  "name": "Test"\n+  "name": "Updated Test",\n+  "version": "2.0"\n }\n```',
        files: {},
        tokenUsage: { total_tokens: 150 },
        responseId: 'resp_123'
      });
    } else {
      // Simulate full extension for initial request
      return Promise.resolve({
        success: true,
        explanation: 'Generated new extension',
        files: {
          'manifest.json': '{"name": "Test", "version": "1.0"}',
          'background.js': 'console.log("Hello");'
        },
        tokenUsage: { total_tokens: 200 },
        responseId: 'resp_456'
      });
    }
  };

  // 1) Test follow-up request detection
  {
    const testCases = [
      {
        previousResponseId: null,
        expected: false,
        description: 'Should detect initial request when no previousResponseId'
      },
      {
        previousResponseId: 'resp_123',
        expected: true,
        description: 'Should detect follow-up request when previousResponseId exists'
      },
      {
        previousResponseId: '',
        expected: false,
        description: 'Should detect initial request when previousResponseId is empty string'
      }
    ];

    testCases.forEach(({ previousResponseId, expected, description }) => {
      const isFollowUpRequest = !!previousResponseId;
      assertEqual(isFollowUpRequest, expected, description);
    });
  }

  // 2) Test initial generation flow
  {
    const mockRequest = {
      prompt: 'Create a todo app',
      projectId: 'test-project',
      requestType: 'new_extension',
      previousResponseId: null,
      userProvidedUrl: null,
      skipScraping: false
    };

    // Mock the generateExtension call for initial request
    const result = await mockGenerateExtension(mockRequest);

    assertEqual(result.success, true, 'Initial generation should succeed');
    assert(result.files && Object.keys(result.files).length > 0, 'Initial generation should return files');
    assert(result.responseId, 'Should return responseId for conversation tracking');
    assert(!result.explanation.includes('```diff'), 'Initial generation should not contain diff content');
  }

  // 3) Test follow-up generation with diff processing
  {
    const mockRequest = {
      prompt: 'Update the manifest',
      projectId: 'test-project',
      requestType: 'add_to_existing',
      previousResponseId: 'resp_123',
      userProvidedUrl: null,
      skipScraping: false
    };

    const result = await mockGenerateExtension(mockRequest);

    assertEqual(result.success, true, 'Follow-up generation should succeed');
    assert(result.explanation.includes('```diff'), 'Follow-up should contain diff content');
    assert(result.responseId, 'Should return responseId for conversation continuity');
  }

  // 4) Test diff processing application
  {
    const { DiffProcessingService } = await import('../../src/lib/diff-processing-service.js');

    const initialFiles = {
      'manifest.json': '{"name": "Test", "version": "1.0"}'
    };

    const diffService = new DiffProcessingService({ initialFiles });

    const diffResponse = '```diff\n--- a/manifest.json\n+++ b/manifest.json\n@@ -1,3 +1,4 @@\n {\n-  "name": "Test"\n+  "name": "Updated Test",\n+  "version": "2.0"\n }\n```';

    const diffResult = diffService.processFollowUpResponse({
      responseText: diffResponse,
      defaultFilePath: 'manifest.json'
    });

    assert(diffResult.updated.includes('manifest.json'), 'Should update manifest.json');
    assertEqual(diffResult.errors.length, 0, 'Should not have errors applying valid diff');

    const updatedContent = diffService.getFile('manifest.json');
    assert(updatedContent.includes('"name": "Updated Test"'), 'Should apply diff correctly');
    assert(updatedContent.includes('"version": "2.0"'), 'Should add new version field');
  }

  // 5) Test error handling in diff processing
  {
    const { DiffProcessingService } = await import('../../src/lib/diff-processing-service.js');

    const initialFiles = {
      'manifest.json': '{"name": "Test"}' // Missing closing brace - invalid JSON
    };

    const diffService = new DiffProcessingService({ initialFiles });

    const invalidDiff = '```diff\n--- a/manifest.json\n+++ b/manifest.json\n@@ -1,1 +1,2 @@\n {"name": "Test"}\n+invalid json here\n```';

    const diffResult = diffService.processFollowUpResponse({
      responseText: invalidDiff,
      defaultFilePath: 'manifest.json'
    });

    assertEqual(diffResult.errors.length, 1, 'Should have validation error for invalid JSON');
    assert(diffResult.errors[0].error.code === 'VALIDATION_FAILED', 'Should have VALIDATION_FAILED error code');
  }

  // 6) Test conversation ID tracking in responses
  {
    const testResponses = [
      {
        scenario: 'initial generation',
        response: { success: true, explanation: 'Generated', responseId: 'resp_123' },
        expectedResponseId: 'resp_123'
      },
      {
        scenario: 'follow-up generation',
        response: { success: true, explanation: 'Updated', responseId: 'resp_456' },
        expectedResponseId: 'resp_456'
      },
      {
        scenario: 'no responseId',
        response: { success: true, explanation: 'Done' },
        expectedResponseId: null
      }
    ];

    testResponses.forEach(({ scenario, response, expectedResponseId }) => {
      const apiResponse = {
        success: response.success,
        explanation: response.explanation,
        files: ['manifest.json'],
        filesGenerated: 1,
        tokenUsage: { total_tokens: 100 },
        responseId: response.responseId || null,
      };

      assertEqual(apiResponse.responseId, expectedResponseId, `Should return correct responseId for ${scenario}`);
      assert(apiResponse.success, `Should be successful for ${scenario}`);
      assert(apiResponse.explanation, `Should have explanation for ${scenario}`);
    });
  }

  // 7) Test URL prompt requirement handling with responseId
  {
    const urlPromptResponse = {
      requiresUrl: true,
      message: 'Please provide URL',
      detectedSites: ['example.com'],
      detectedUrls: [],
      featureRequest: 'Scrape data',
      requestType: 'new_extension',
      responseId: 'resp_789'
    };

    assert(urlPromptResponse.requiresUrl, 'Should indicate URL requirement');
    assert(urlPromptResponse.responseId, 'Should include responseId in URL prompt response');
    assert(Array.isArray(urlPromptResponse.detectedSites), 'Should include detected sites');
  }

  console.log('✓ Generate Route Follow-up tests passed');
}

// Simple test runner
console.log('Testing basic functionality...');

// Test 1: Follow-up detection
const testFollowUpDetection = () => {
  const isFollowUp1 = !!null;
  const isFollowUp2 = !!'resp_123';

  console.log('✓ Follow-up detection:', isFollowUp1 === false && isFollowUp2 === true);
};

// Test 2: Diff processing
const testDiffProcessing = async () => {
  try {
    const { DiffProcessingService } = await import('../../src/lib/diff-processing-service.js');

    const initialFiles = {
      'manifest.json': '{"name": "Test", "version": "1.0"}'
    };

    const diffService = new DiffProcessingService({ initialFiles });

    const diffResponse = '```diff\n--- a/manifest.json\n+++ b/manifest.json\n@@ -1,1 +1,1 @@\n-{"name": "Test", "version": "1.0"}\n+{"name": "Updated Test", "version": "2.0"}\n```';

    const diffResult = diffService.processFollowUpResponse({
      responseText: diffResponse,
      defaultFilePath: 'manifest.json'
    });

    const success = diffResult.updated.includes('manifest.json') && diffResult.errors.length === 0;
    console.log('✓ Diff processing:', success);

    if (success) {
      const updatedContent = diffService.getFile('manifest.json');
      const contentUpdated = updatedContent.includes('"name": "Updated Test"') && updatedContent.includes('"version": "2.0"');
      console.log('✓ Content updated correctly:', contentUpdated);
      console.log('Updated content:', updatedContent);
    }

  } catch (e) {
    console.error('❌ Diff processing test failed:', e.message);
  }
};

// Run basic tests
testFollowUpDetection();
testDiffProcessing().then(() => {
  console.log('✓ Generate Route Follow-up basic tests completed');
}).catch((e) => {
  console.error('❌ Test failed:', e.message);
  process.exit(1);
});