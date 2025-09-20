/**
 * Simplified test file for JSON formatter utility
 * Tests single-line vs multi-line formatting and syntax validation
 */

import { formatManifestJson } from '../../src/lib/utils/json-formatter.js'

// Test data - focused on core functionality
const testManifests = {
  // Single-line manifest (problematic format that needs fixing)
  singleLine: '{"manifest_version":3,"name":"Test Extension","version":"1.0.0","permissions":["activeTab"],"action":{"default_popup":"popup.html"}}',

  // Multi-line manifest (already properly formatted)
  multiLine: `{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0.0",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup.html"
  }
}`,

  // Object manifest
  objectManifest: {
    manifest_version: 3,
    name: "Test Extension",
    version: "1.0.0",
    permissions: ["activeTab"],
    action: {
      default_popup: "popup.html"
    }
  },

  // Invalid JSON (should throw error)
  invalidJson: '{"manifest_version":3,"name":"Test Extension","version":"1.0.0","permissions":["activeTab"],"action":{"default_popup":"popup.html"}}'
}

// Test functions
function runTests() {
  console.log('🧪 Starting JSON Formatter Tests...\n')

  let passedTests = 0
  let totalTests = 0

  function test(name, testFn) {
    totalTests++
    try {
      testFn()
      console.log(`✅ ${name}`)
      passedTests++
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
    }
  }

  // Test 1: Single-line JSON should be formatted to multi-line
  test('Single-line JSON converts to multi-line', () => {
    const result = formatManifestJson(testManifests.singleLine)
    const parsed = JSON.parse(result)
    
    // Should parse correctly
    if (parsed.manifest_version !== 3) {
      throw new Error('Single-line JSON not parsed correctly')
    }
    
    // Should have newlines (multi-line)
    if (!result.includes('\n')) {
      throw new Error('Single-line JSON should be converted to multi-line format')
    }
    
    // Should have proper indentation
    if (!result.includes('  ')) {
      throw new Error('Formatted JSON should have proper indentation')
    }
  })

  // Test 2: Multi-line JSON should remain properly formatted
  test('Multi-line JSON stays properly formatted', () => {
    const result = formatManifestJson(testManifests.multiLine)
    const parsed = JSON.parse(result)
    
    // Should parse correctly
    if (parsed.manifest_version !== 3) {
      throw new Error('Multi-line JSON not parsed correctly')
    }
    
    // Should still have newlines
    if (!result.includes('\n')) {
      throw new Error('Multi-line JSON should maintain newlines')
    }
  })

  // Test 3: Object input should be formatted to multi-line
  test('Object input converts to multi-line', () => {
    const result = formatManifestJson(testManifests.objectManifest)
    const parsed = JSON.parse(result)
    
    // Should parse correctly
    if (parsed.manifest_version !== 3) {
      throw new Error('Object input not parsed correctly')
    }
    
    // Should have newlines
    if (!result.includes('\n')) {
      throw new Error('Object input should be converted to multi-line format')
    }
  })

  // Test 4: Invalid JSON should throw error
  test('Invalid JSON throws error', () => {
    try {
      formatManifestJson('{"invalid": json}')
      throw new Error('Should have thrown an error for invalid JSON')
    } catch (error) {
      if (!error.message.includes('Failed to format manifest.json')) {
        throw new Error('Should throw specific error for invalid JSON')
      }
    }
  })

  // Test 5: Syntax validation - valid JSON should work
  test('Valid JSON syntax passes', () => {
    const result = formatManifestJson(testManifests.singleLine)
    
    // Should not throw and should be valid JSON
    JSON.parse(result)
  })

  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.')
  }

  return { passed: passedTests, total: totalTests }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests, testManifests }
