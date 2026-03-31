/**
 * Test Suite for Agent File Deletion Feature
 * 
 * Run these tests to verify the file deletion safety system
 * 
 * Usage: node test/agent-file-deletion.test.js
 */

import { canAgentDelete, PROTECTION_RULES } from '../src/lib/file-safety/protection-rules.js'

// Test utilities
let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    testsPassed++
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   ${error.message}`)
    testsFailed++
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    )
  }
}

// Test Suite
console.log('\n🧪 Testing Agent File Deletion Safety Rules\n')

// Critical Files Tests
test('Should block deletion of manifest.json', () => {
  const result = canAgentDelete('manifest.json', 10)
  assertEqual(result.allowed, false, 'manifest.json should not be deletable')
  assertEqual(result.requiresConfirmation, false)
})

test('Should block deletion of manifest.json in subdirectory', () => {
  const result = canAgentDelete('src/manifest.json', 10)
  assertEqual(result.allowed, false, 'manifest.json in any path should be blocked')
})

// Sensitive Files Tests
test('Should require confirmation for background.js', () => {
  const result = canAgentDelete('background.js', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, true)
})

test('Should require confirmation for popup.html', () => {
  const result = canAgentDelete('popup.html', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, true)
})

test('Should require confirmation for content.js', () => {
  const result = canAgentDelete('content.js', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, true)
})

// Safe Files Tests
test('Should allow deletion of helper.js without confirmation', () => {
  const result = canAgentDelete('scripts/helper.js', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, false)
})

test('Should allow deletion of styles.css without confirmation', () => {
  const result = canAgentDelete('styles/main.css', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, false)
})

test('Should allow deletion of README.md without confirmation', () => {
  const result = canAgentDelete('README.md', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, false)
})

// Protected Directory Tests
test('Should require confirmation for files in icons/', () => {
  const result = canAgentDelete('icons/icon-128.png', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, true)
})

test('Should require confirmation for files in assets/', () => {
  const result = canAgentDelete('assets/logo.png', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, true)
})

// File Extension Tests
test('Should block deletion of .exe files', () => {
  const result = canAgentDelete('scripts/malware.exe', 10)
  assertEqual(result.allowed, false)
})

test('Should block deletion of .py files', () => {
  const result = canAgentDelete('scripts/script.py', 10)
  assertEqual(result.allowed, false)
})

test('Should allow deletion of .json files (except manifest)', () => {
  const result = canAgentDelete('config/settings.json', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, false)
})

// Minimum Files Tests
test('Should block deletion when only MIN_PROJECT_FILES remain', () => {
  const result = canAgentDelete('helper.js', PROTECTION_RULES.MIN_PROJECT_FILES)
  assertEqual(result.allowed, false)
})

test('Should block deletion when below MIN_PROJECT_FILES', () => {
  const result = canAgentDelete('helper.js', 1)
  assertEqual(result.allowed, false)
})

test('Should allow deletion when above MIN_PROJECT_FILES', () => {
  const result = canAgentDelete('helper.js', 5)
  assertEqual(result.allowed, true)
})

// Edge Cases
test('Should handle files with no extension', () => {
  const result = canAgentDelete('LICENSE', 10)
  assertEqual(result.allowed, false) // No .txt extension
})

test('Should handle uppercase extensions', () => {
  const result = canAgentDelete('script.JS', 10)
  assertEqual(result.allowed, true) // Should normalize to lowercase
})

test('Should handle nested paths correctly', () => {
  const result = canAgentDelete('src/utils/helpers/string-utils.js', 10)
  assertEqual(result.allowed, true)
  assertEqual(result.requiresConfirmation, false)
})

test('Should handle files with multiple dots', () => {
  const result = canAgentDelete('config.production.json', 10)
  assertEqual(result.allowed, true)
})

// Summary
console.log('\n📊 Test Results:')
console.log(`   ✅ Passed: ${testsPassed}`)
console.log(`   ❌ Failed: ${testsFailed}`)
console.log(`   📈 Total:  ${testsPassed + testsFailed}`)

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!\n')
  process.exit(0)
} else {
  console.log('\n💥 Some tests failed!\n')
  process.exit(1)
}
