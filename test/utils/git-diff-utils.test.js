const { assertEqual, assert } = require('./test-helpers');
const { OLD_CONTENT, NEW_CONTENT } = require('./mock-data');
const diffUtils = require('../../src/lib/git-diff-utils');

function runTests() {
  console.log('Running git-diff-utils tests with JavaScript code...\n');

  // 1) Create diff and ensure headers/hunks exist
  const diff = diffUtils.createFileDiff(OLD_CONTENT, NEW_CONTENT, 'calculateTotal.js');
  console.log('Created diff for JavaScript function:\n', diff, '\n');
  const validation = diffUtils.validateUnifiedDiff(diff);
  assert(validation.valid, 'Diff should be valid');
  assert(/^--- a\//m.test(diff) && /^\+\+\+ b\//m.test(diff), 'Diff headers missing');
  assert(/@@\s+\-/.test(diff), 'Hunk header missing');

  // 2) Apply diff and verify result matches new implementation
  const applied = diffUtils.applyDiffToFile(OLD_CONTENT, diff, 'calculateTotal.js');
  assertEqual(diffUtils.normalizeLineEndings(applied), diffUtils.normalizeLineEndings(NEW_CONTENT), 
    'Applied diff should produce new implementation with tax calculation');

  // 3) Parse fenced diff response (as would come from LLM)
  const fenced = '```diff\n' + diff + '\n```';
  const parsed = diffUtils.parseDiffResponse(fenced);
  assertEqual(diffUtils.normalizeLineEndings(parsed), diffUtils.normalizeLineEndings(diff), 
    'Parsed fenced diff should match original diff');

  // 4) Malformed diff should error
  let threw = false;
  try {
    diffUtils.applyDiffToFile(OLD_CONTENT, 'not a diff', 'calculateTotal.js');
  } catch (e) {
    threw = true;
    assert(e.code === 'INVALID_DIFF', 'Should throw INVALID_DIFF for malformed');
  }
  assert(threw, 'Expected apply to throw on malformed diff');

  console.log('✓ All tests passed - diff utilities work correctly with JavaScript code');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };