// Test script for chrome-api-docs.js
import { searchChromeExtensionAPI, fetchChromeApiDocs } from './src/lib/codegen/chrome-api-docs.js';

console.log('Testing Chrome API Docs...\n');

// Test 1: Search for a valid API
console.log('Test 1: Search for "storage" API');
const storageResult = searchChromeExtensionAPI('storage');
if (storageResult.error) {
  console.error('❌ FAIL:', storageResult.error);
} else {
  console.log('✓ SUCCESS');
  console.log('  Name:', storageResult.name);
  console.log('  Description:', storageResult.description?.substring(0, 60) + '...');
  console.log('  Permissions:', storageResult.permissions);
  console.log('  Has code example:', !!storageResult.code_example);
}

// Test 2: Search for invalid API
console.log('\nTest 2: Search for invalid API "fakeapi"');
const invalidResult = searchChromeExtensionAPI('fakeapi');
if (invalidResult.error) {
  console.log('✓ SUCCESS - correctly returned error');
  console.log('  Error:', invalidResult.error);
  console.log('  Available APIs count:', invalidResult.available_apis?.length);
  console.log('  Total APIs:', invalidResult.total_apis);
} else {
  console.error('❌ FAIL - should have returned an error');
}

// Test 3: Partial match search
console.log('\nTest 3: Partial match for "tab"');
const tabResult = searchChromeExtensionAPI('tab');
if (tabResult.error) {
  console.error('❌ FAIL:', tabResult.error);
} else {
  console.log('✓ SUCCESS - found:', tabResult.name);
}

// Test 4: Fetch multiple API docs
console.log('\nTest 4: Fetch docs for multiple APIs');
const multiDocs = fetchChromeApiDocs(['storage', 'tabs', 'notifications']);
if (multiDocs.includes('## storage API') && multiDocs.includes('## tabs API')) {
  console.log('✓ SUCCESS - documentation generated');
  console.log('  Doc length:', multiDocs.length, 'characters');
} else {
  console.error('❌ FAIL - documentation incomplete');
}

console.log('\n✅ All tests complete!');
