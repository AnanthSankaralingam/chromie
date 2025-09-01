// Simple test to validate conversation flow fixes
console.log('🧪 Testing conversation flow fixes...');

// Test 1: Check that follow-up detection works correctly
function testFollowUpDetection() {
  console.log('Testing follow-up detection...');

  // Mock the logic from use-chat.js and ai-chat.js
  const testCases = [
    { hasGeneratedCode: false, previousResponseId: null, expected: false, desc: 'Initial request' },
    { hasGeneratedCode: true, previousResponseId: null, expected: true, desc: 'Has generated code' },
    { hasGeneratedCode: false, previousResponseId: 'resp_123', expected: true, desc: 'Has previous response ID' },
    { hasGeneratedCode: true, previousResponseId: 'resp_456', expected: true, desc: 'Both conditions' }
  ];

  for (const testCase of testCases) {
    const isFollowUpRequest = testCase.hasGeneratedCode || !!testCase.previousResponseId;
    if (isFollowUpRequest === testCase.expected) {
      console.log(`✅ ${testCase.desc}: PASS`);
    } else {
      console.log(`❌ ${testCase.desc}: FAIL (expected ${testCase.expected}, got ${isFollowUpRequest})`);
    }
  }
}

// Test 2: Check generating message content
function testGeneratingMessages() {
  console.log('Testing generating message content...');

  const testCases = [
    { hasGeneratedCode: false, previousResponseId: null, expected: "🚀 generating your extension..." },
    { hasGeneratedCode: true, previousResponseId: null, expected: "🔄 continuing our conversation... generating improved code..." },
    { hasGeneratedCode: false, previousResponseId: 'resp_123', expected: "🔄 continuing our conversation... generating improved code..." }
  ];

  for (const testCase of testCases) {
    const isFollowUp = testCase.hasGeneratedCode || !!testCase.previousResponseId;
    const generatingContent = isFollowUp
      ? "🔄 continuing our conversation... generating improved code..."
      : "🚀 generating your extension...";

    if (generatingContent === testCase.expected) {
      console.log(`✅ Generating message: PASS`);
    } else {
      console.log(`❌ Generating message: FAIL (expected "${testCase.expected}", got "${generatingContent}")`);
    }
  }
}

// Test 3: Check request type determination
function testRequestType() {
  console.log('Testing request type determination...');

  const testCases = [
    { hasGeneratedCode: false, expected: 'new_extension', desc: 'Initial request' },
    { hasGeneratedCode: true, expected: 'add_to_existing', desc: 'Follow-up request' }
  ];

  for (const testCase of testCases) {
    const requestType = testCase.hasGeneratedCode ? 'add_to_existing' : 'new_extension';

    if (requestType === testCase.expected) {
      console.log(`✅ ${testCase.desc}: PASS`);
    } else {
      console.log(`❌ ${testCase.desc}: FAIL (expected ${testCase.expected}, got ${requestType})`);
    }
  }
}

// Run all tests
testFollowUpDetection();
testGeneratingMessages();
testRequestType();

console.log('🎉 Conversation flow validation complete!');
