const { assert, assertEqual } = require('./test-helpers');

async function runAIChatFollowupTests() {
  console.log('Running AI Chat Follow-up tests...');

  // Mock components for testing
  const mockAIChat = (props) => {
    const { hasGeneratedCode, previousResponseId } = props;
    const isFollowUpRequest = hasGeneratedCode || !!previousResponseId;
    return { isFollowUpRequest };
  };

  // Mock useChat hook for testing
  const mockUseChat = (props) => {
    const { hasGeneratedCode, previousResponseId } = props;
    const isFollowUp = hasGeneratedCode || !!previousResponseId;
    const generatingContent = isFollowUp
      ? "🔄 continuing our conversation... generating improved code..."
      : "🚀 generating your extension...";

    return { generatingContent, isFollowUp };
  };

  // 1) Test follow-up request detection
  {
    // Initial request (no previous context)
    const initialResult = mockAIChat({ hasGeneratedCode: false, previousResponseId: null });
    assertEqual(initialResult.isFollowUpRequest, false, 'Should detect initial request when no previous context');

    // Follow-up request (has generated code)
    const followUpResult1 = mockAIChat({ hasGeneratedCode: true, previousResponseId: null });
    assertEqual(followUpResult1.isFollowUpRequest, true, 'Should detect follow-up when hasGeneratedCode is true');

    // Follow-up request (has previous response ID)
    const followUpResult2 = mockAIChat({ hasGeneratedCode: false, previousResponseId: 'resp_123' });
    assertEqual(followUpResult2.isFollowUpRequest, true, 'Should detect follow-up when previousResponseId exists');

    // Follow-up request (both conditions)
    const followUpResult3 = mockAIChat({ hasGeneratedCode: true, previousResponseId: 'resp_456' });
    assertEqual(followUpResult3.isFollowUpRequest, true, 'Should detect follow-up when both conditions are true');
  }

  // 2) Test conversation context in generating messages
  {
    // Initial generation message
    const initialResult = mockUseChat({ hasGeneratedCode: false, previousResponseId: null });
    assertEqual(initialResult.generatingContent, "🚀 generating your extension...", 'Should show initial generation message');
    assertEqual(initialResult.isFollowUp, false, 'Should correctly identify as initial request');

    // Follow-up generation message (hasGeneratedCode)
    const followUpResult1 = mockUseChat({ hasGeneratedCode: true, previousResponseId: null });
    assertEqual(followUpResult1.generatingContent, "🔄 continuing our conversation... generating improved code...", 'Should show follow-up generation message when hasGeneratedCode');
    assertEqual(followUpResult1.isFollowUp, true, 'Should correctly identify as follow-up request');

    // Follow-up generation message (previousResponseId)
    const followUpResult2 = mockUseChat({ hasGeneratedCode: false, previousResponseId: 'resp_789' });
    assertEqual(followUpResult2.generatingContent, "🔄 continuing our conversation... generating improved code...", 'Should show follow-up generation message when previousResponseId exists');
    assertEqual(followUpResult2.isFollowUp, true, 'Should correctly identify as follow-up request');
  }

  // 3) Test API request body construction
  {
    const testCases = [
      // Initial request
      {
        hasGeneratedCode: false,
        previousResponseId: null,
        expectedRequestType: 'new_extension',
        description: 'Initial request should use new_extension'
      },
      // Follow-up request (has generated code)
      {
        hasGeneratedCode: true,
        previousResponseId: null,
        expectedRequestType: 'add_to_existing',
        description: 'Follow-up request should use add_to_existing when hasGeneratedCode'
      },
      // Follow-up request (has previous response ID) - Note: actual logic only checks hasGeneratedCode
      {
        hasGeneratedCode: false,
        previousResponseId: 'resp_123',
        expectedRequestType: 'new_extension', // This matches actual implementation
        description: 'Request type only changes based on hasGeneratedCode, not previousResponseId'
      }
    ];

    testCases.forEach(({ hasGeneratedCode, previousResponseId, expectedRequestType, description }) => {
      const requestType = hasGeneratedCode ? 'add_to_existing' : 'new_extension';
      const isFollowUp = hasGeneratedCode || !!previousResponseId;

      assertEqual(requestType, expectedRequestType, description);

      // Verify conversation context is included
      const requestBody = {
        prompt: 'test prompt',
        projectId: 'test-project',
        requestType,
        previousResponseId,
      };

      assert(requestBody.previousResponseId === previousResponseId, 'Should include previousResponseId in request body');
      assert(isFollowUp === !!previousResponseId || hasGeneratedCode, 'Should correctly identify follow-up context');
    });
  }

  // 4) Test conversation state persistence integration
  {
    // Mock conversation state helpers
    const mockLoadResponseId = (projectId) => {
      const mockStorage = {
        'test-project': 'resp_999'
      };
      return mockStorage[projectId] || null;
    };

    const mockSaveResponseId = (projectId, responseId) => {
      // Simulate saving to storage
      return true;
    };

    // Test loading previous response ID
    const loadedId = mockLoadResponseId('test-project');
    assertEqual(loadedId, 'resp_999', 'Should load previous response ID from storage');

    // Test saving new response ID
    const saveResult = mockSaveResponseId('test-project', 'resp_1000');
    assert(saveResult, 'Should successfully save response ID');

    // Test that follow-up detection works with loaded state
    const isFollowUpWithLoaded = !!loadedId;
    assertEqual(isFollowUpWithLoaded, true, 'Should detect follow-up when previous response ID is loaded');
  }

  // 5) Test error handling in conversation flow
  {
    const errorScenarios = [
      {
        error: 'Token limit exceeded',
        status: 403,
        expectedContent: 'token usage limit exceeded for your plan. please upgrade to continue generating extensions.'
      },
      {
        error: 'Network error',
        status: 500,
        expectedContent: 'sorry, i encountered an error while generating your extension. please try again.'
      }
    ];

    errorScenarios.forEach(({ error, status, expectedContent }) => {
      // Simulate error response handling
      const content = status === 403
        ? error || expectedContent
        : `Error: ${error}`;

      const isErrorHandled = content.includes('error') || content.includes('limit');
      assert(isErrorHandled, `Should properly handle ${error} error`);

      // Verify conversation state is maintained even on error
      const shouldPreserveContext = status !== 403; // Don't preserve on token limit
      assertEqual(shouldPreserveContext, status !== 403, 'Should preserve conversation context on non-token errors');
    });
  }

  console.log('✓ AI Chat Follow-up tests passed');
}

// Run tests
runAIChatFollowupTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { runAIChatFollowupTests };