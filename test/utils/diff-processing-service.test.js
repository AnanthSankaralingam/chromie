const { assert, assertEqual } = require('./test-helpers');
const { OLD_CONTENT, NEW_CONTENT } = require('./mock-data');
const diffUtils = require('../../src/lib/git-diff-utils');
const { DiffProcessingService } = require('../../src/lib/diff-processing-service.js');

function runDiffProcessingServiceTests() {
  console.log('Running DiffProcessingService tests...');

  // 1) Apply fenced unified diff to a JS file and validate result
  {
    const svc = new DiffProcessingService({ initialFiles: { 'calculateTotal.js': OLD_CONTENT } });
    const diff = diffUtils.createFileDiff(OLD_CONTENT, NEW_CONTENT, 'calculateTotal.js');
    const responseText = '```diff\n' + diff + '\n```';
    const res = svc.processFollowUpResponse({ responseText });
    assertEqual(res.errors.length, 0, 'No errors expected when applying valid JS diff');
    assert(res.updated.includes('calculateTotal.js'), 'calculateTotal.js should be updated');
    assertEqual(diffUtils.normalizeLineEndings(svc.getFile('calculateTotal.js')), diffUtils.normalizeLineEndings(NEW_CONTENT), 'Updated content must match NEW_CONTENT');
  }

  // 2) Rollback on invalid JSON
  {
    const originalManifest = '{"name":"Test","version":"1.0.0"}';
    // Introduce an invalid JSON change (missing closing quote)
    const nextManifest = '{"name":"Test,"version":"1.0.0"}';
    const diff = diffUtils.createFileDiff(originalManifest, nextManifest, 'manifest.json');
    const svc = new DiffProcessingService({ initialFiles: { 'manifest.json': originalManifest } });
    const res = svc.processFollowUpResponse({ responseText: diff });
    assertEqual(res.updated.length, 0, 'No files should be updated due to invalid JSON');
    assertEqual(res.errors.length, 1, 'One error expected for invalid JSON');
    assert(res.errors[0].error && (res.errors[0].error.code === 'VALIDATION_FAILED' || /Validation failed/.test(res.errors[0].error.message)), 'Should report VALIDATION_FAILED');
    assertEqual(svc.getFile('manifest.json'), originalManifest, 'File should be rolled back to original content');
  }

  // 3) Headerless hunk with defaultFilePath
  {
    const before = 'console.log("hello");\n';
    const after = 'console.log("hello world");\n';
    const fullDiff = diffUtils.createFileDiff(before, after, 'content.js');
    // Extract only hunk lines without headers
    const hunkOnly = fullDiff.split('\n').filter(l => l.startsWith('@@') || l.startsWith(' ') || l.startsWith('+') || l.startsWith('-')).join('\n');
    const svc = new DiffProcessingService({ initialFiles: { 'content.js': before } });
    const res = svc.processFollowUpResponse({ responseText: hunkOnly, defaultFilePath: 'content.js' });
    assertEqual(res.errors.length, 0, 'Headerless hunk should be accepted with defaultFilePath');
    assertEqual(diffUtils.normalizeLineEndings(svc.getFile('content.js')), diffUtils.normalizeLineEndings(after), 'Headerless diff should be applied correctly');
  }

  // 4) JS validation should fail on unbalanced brackets and rollback
  {
    const before = 'function a(){ return 1; }\n';
    const after = 'function a(){ return 1; \n'; // missing closing brace
    const diff = diffUtils.createFileDiff(before, after, 'broken.js');
    const svc = new DiffProcessingService({ initialFiles: { 'broken.js': before } });
    const res = svc.processFollowUpResponse({ responseText: diff });
    assertEqual(res.updated.length, 0, 'No update expected due to invalid JS');
    assertEqual(res.errors.length, 1, 'One error expected for invalid JS');
    assertEqual(svc.getFile('broken.js'), before, 'JS file should be rolled back');
  }

  // 5) ESM code should pass structural validation and apply
  {
    const before = '';
    const after = 'import x from "./x.js";\nexport function add(a,b){ return a+b; }\n';
    const diff = diffUtils.createFileDiff(before, after, 'esm.js');
    const svc = new DiffProcessingService({ initialFiles: { 'esm.js': before } });
    const res = svc.processFollowUpResponse({ responseText: diff });
    assertEqual(res.errors.length, 0, 'ESM code should be accepted with structural validation');
    assertEqual(svc.getFile('esm.js'), after, 'ESM file should be updated');
  }

  // 6) Multi-file diff application
  {
    const a1 = 'console.log("A1");\n';
    const a2 = 'console.log("A2");\n';
    const b1 = '{"a":1}\n';
    const b2 = '{"a":2}\n';
    const diff1 = diffUtils.createFileDiff(a1, a2, 'a.js');
    const diff2 = diffUtils.createFileDiff(b1, b2, 'b.json');
    const combined = diff1 + '\n' + diff2; // multi-file diff
    const svc = new DiffProcessingService({ initialFiles: { 'a.js': a1, 'b.json': b1 } });
    const res = svc.processFollowUpResponse({ responseText: combined });
    assertEqual(res.errors.length, 0, 'Multi-file diff should apply with no errors');
    assert(res.updated.includes('a.js') && res.updated.includes('b.json'), 'Both files should be updated');
    assertEqual(svc.getFile('a.js'), a2, 'a.js should be updated');
    assertEqual(svc.getFile('b.json'), b2, 'b.json should be updated');
  }

  // 7) Conversation context methods
  {
    const svc = new DiffProcessingService();
    svc.addMessage('user', 'Hello');
    svc.addMessage('assistant', 'Hi');
    svc.addMessage('user', 'Change it');
    const context = svc.getConversationContext(2);
    assertEqual(context.length, 2, 'Should return last N messages');
    assertEqual(context[0].role, 'assistant', 'Order should be preserved');
    assertEqual(context[1].content, 'Change it', 'Latest message content should match');
  }

  // 8) Supabase preparation
  {
    const svc = new DiffProcessingService({ initialFiles: { 'a.js': 'console.log(1);\n', 'b.json': '{"k":1}\n' } });
    const prepared = svc.prepareForSupabase();
    const byPath = Object.fromEntries(prepared.map(p => [p.path, p]));
    assert(byPath['a.js'] && byPath['a.js'].mimeType.includes('javascript'), 'a.js should have JS mimeType');
    assert(byPath['b.json'] && byPath['b.json'].mimeType.includes('json'), 'b.json should have JSON mimeType');
  }

  console.log('✓ DiffProcessingService tests passed');
}

if (require.main === module) {
  runDiffProcessingServiceTests();
}

module.exports = { runDiffProcessingServiceTests };