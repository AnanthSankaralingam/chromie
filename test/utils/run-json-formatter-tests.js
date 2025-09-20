#!/usr/bin/env node

/**
 * Test runner for JSON formatter tests
 * Run with: node test/utils/run-json-formatter-tests.js
 */

import { runTests } from './json-formatter.test.js'

console.log('🚀 Running JSON Formatter Tests...\n')

const results = runTests()

if (results.passed === results.total) {
  console.log('\n✅ All tests passed successfully!')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed.')
  process.exit(1)
}
