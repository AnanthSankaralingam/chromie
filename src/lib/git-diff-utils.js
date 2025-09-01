// Minimal git-style unified diff utilities for line-based text files.
// Focused on being small and dependency-free for use in the /generate API.

/**
 * Normalize line endings to \n for deterministic diffing/applying.
 * @param {string} text
 * @returns {string}
 */
function normalizeLineEndings(text) {
  if (typeof text !== "string") return "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Determine the predominant line ending of given content to preserve on output.
 * @param {string} original
 * @returns {"\n"|"\r\n"}
 */
function detectPreferredEOL(original) {
  if (/\r\n/.test(original)) return "\r\n";
  return "\n";
}

/**
 * Simple LCS-based diff to produce a sequence of operations.
 * Each op is: { type: 'equal'|'insert'|'delete', lines: string[] }
 * @param {string[]} aLines
 * @param {string[]} bLines
 */
function computeDiffOps(aLines, bLines) {
  const n = aLines.length;
  const m = bLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      // equal
      const lines = [];
      while (i < n && j < m && aLines[i] === bLines[j]) {
        lines.push(aLines[i]);
        i++; j++;
      }
      ops.push({ type: 'equal', lines });
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // delete from a
      const lines = [aLines[i]];
      i++;
      // coalesce contiguous deletes
      while (i < n && (j >= m || dp[i + 1]?.[j] >= dp[i]?.[j + 1])) {
        if (i < n && (j >= m || aLines[i] !== bLines[j])) {
          lines.push(aLines[i]);
          i++;
        } else break;
      }
      ops.push({ type: 'delete', lines });
    } else {
      // insert from b
      const lines = [bLines[j]];
      j++;
      // coalesce contiguous inserts
      while (j < m && (i >= n || dp[i + 1]?.[j] < dp[i]?.[j + 1])) {
        if (j < m && (i >= n || aLines[i] !== bLines[j])) {
          lines.push(bLines[j]);
          j++;
        } else break;
      }
      ops.push({ type: 'insert', lines });
    }
  }
  if (i < n) ops.push({ type: 'delete', lines: aLines.slice(i) });
  if (j < m) ops.push({ type: 'insert', lines: bLines.slice(j) });
  return ops;
}

/**
 * Build unified diff hunks from diff ops with context lines.
 * @param {string[]} aLines
 * @param {string[]} bLines
 * @param {{type:string,lines:string[]}[]} ops
 * @param {number} context - number of context lines around changes
 */
function buildUnifiedHunks(aLines, bLines, ops, context = 3) {
  const hunks = [];
  let aIndex = 0; // current pointer in aLines
  let bIndex = 0; // current pointer in bLines

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === 'equal') {
      aIndex += op.lines.length;
      bIndex += op.lines.length;
      continue;
    }

    // Determine the start of the changed block: include up to `context` lines of previous equals
    let preContext = [];
    let preContextCount = 0;
    // Look back to find tail of previous equal block
    if (k > 0 && ops[k - 1].type === 'equal') {
      preContext = ops[k - 1].lines.slice(-context);
      preContextCount = preContext.length;
    }

    // Collect the changed block lines
    const hunkLines = [];
    // Add pre-context as neutral lines
    preContext.forEach(line => hunkLines.push({ sign: ' ', text: line }));

    // Process contiguous change ops, and include trailing equal context of next equal
    let aRemoved = 0;
    let bAdded = 0;
    let t = k;
    for (; t < ops.length && ops[t].type !== 'equal'; t++) {
      const cur = ops[t];
      if (cur.type === 'delete') {
        cur.lines.forEach(line => { hunkLines.push({ sign: '-', text: line }); aRemoved++; });
      } else if (cur.type === 'insert') {
        cur.lines.forEach(line => { hunkLines.push({ sign: '+', text: line }); bAdded++; });
      }
    }

    // Post-context from the next equal op
    let postContext = [];
    if (t < ops.length && ops[t].type === 'equal') {
      postContext = ops[t].lines.slice(0, context);
    }
    postContext.forEach(line => hunkLines.push({ sign: ' ', text: line }));

    // Compute starting line numbers and counts for header
    // Old file: start is 1-based index at beginning of preContext from current aIndex-preContextCount
    const aHunkStart = (aIndex - preContextCount) + 1;
    // New file: start is 1-based index at beginning of preContext from current bIndex-preContextCount
    const bHunkStart = (bIndex - preContextCount) + 1;

    // Count lines for header (for files with no lines in a or b within hunk, count should be 0)
    const aHunkCount = preContext.length + aRemoved + postContext.length;
    const bHunkCount = preContext.length + bAdded + postContext.length;

    hunks.push({
      header: `@@ -${aHunkStart},${aHunkCount} +${bHunkStart},${bHunkCount} @@`,
      lines: hunkLines,
    });

    // Advance indices: equal pre-context already counted in previous equal, so adjust using removed/added and post-context
    aIndex = aIndex - preContextCount + aRemoved + postContext.length;
    bIndex = bIndex - preContextCount + bAdded + postContext.length;

    // Skip the next equal op partially consumed for postContext
    if (t < ops.length && ops[t].type === 'equal') {
      // Reduce the next equal op by the postContext amount
      ops[t] = { type: 'equal', lines: ops[t].lines.slice(postContext.length) };
    }
    // Move k to t - 1 because for-loop will k++
    k = t - 1;
  }

  return hunks;
}

/**
 * Generate a unified diff between two versions of a file.
 * @param {string} oldContent
 * @param {string} newContent
 * @param {string} filePath
 * @returns {string} unified diff
 */
function createFileDiff(oldContent, newContent, filePath = "file.txt") {
  const preferredEOL = detectPreferredEOL(oldContent);
  const a = normalizeLineEndings(oldContent).split("\n");
  const b = normalizeLineEndings(newContent).split("\n");
  // If file ends with newline, split will create trailing empty, keep behavior consistent for both
  const ops = computeDiffOps(a, b);
  const hunks = buildUnifiedHunks(a, b, ops, 3);
  const headerA = `--- a/${filePath}`;
  const headerB = `+++ b/${filePath}`;
  const body = hunks.map(h => [h.header, ...h.lines.map(l => `${l.sign}${l.text}`)].join("\n")).join("\n");
  const diff = [headerA, headerB, body].filter(Boolean).join("\n");
  console.log("[git-diff-utils] Created diff for", filePath, "hunks:", hunks.length);
  return diff.replace(/\n/g, preferredEOL);
}

/**
 * Basic validation for a unified diff string.
 * @param {string} diff
 * @returns {{valid:boolean, errors:string[]}}
 */
function validateUnifiedDiff(diff) {
  const errors = [];
  if (!diff || typeof diff !== 'string') {
    errors.push('Diff must be a non-empty string');
  } else {
    const hasHeaders = /^(---\s+a\/|\+\+\+\s+b\/)/m.test(diff);
    if (!hasHeaders) errors.push('Missing file headers (--- a/ and +++ b/)');
    const hasHunk = /^@@\s+\-\d+(,\d+)?\s+\+\d+(,\d+)?\s+@@/m.test(diff);
    if (!hasHunk) errors.push('Missing hunk headers (@@ -a,+b @@)');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Ensure headers exist; if missing, add using provided filePath.
 * @param {string} diff
 * @param {string} filePath
 */
function ensureFileHeaders(diff, filePath = "file.txt") {
  let out = diff || "";
  if (!/^---\s+a\//m.test(out)) {
    out = `--- a/${filePath}\n` + out;
  }
  if (!/\+\+\+\s+b\//m.test(out)) {
    out = out.replace(/^---\s+a\/.*$/m, (m0) => `${m0}\n+++ b/${filePath}`);
  }
  return out;
}

/**
 * Parse a unified diff string into structured hunks.
 * @param {string} diffText
 */
function parseUnifiedDiff(diffText) {
  const text = normalizeLineEndings(diffText);
  const lines = text.split("\n");
  const hunks = [];
  let i = 0;
  // Skip file headers if present
  while (i < lines.length && (lines[i].startsWith('--- ') || lines[i].startsWith('+++ '))) {
    i++;
  }
  while (i < lines.length) {
    if (!lines[i].startsWith('@@ ')) { i++; continue; }
    const header = lines[i];
    i++;
    const hunkLines = [];
    while (i < lines.length && !lines[i].startsWith('@@ ')) {
      const line = lines[i];
      if (line.startsWith(' ') || line.startsWith('-') || line.startsWith('+')) {
        hunkLines.push({ sign: line.charAt(0), text: line.slice(1) });
      } else if (line.trim() === '') {
        // blank context line
        hunkLines.push({ sign: ' ', text: '' });
      } else {
        // Unexpected line, break hunk
        break;
      }
      i++;
    }
    hunks.push({ header, lines: hunkLines });
  }
  return hunks;
}

/**
 * Apply a unified diff to an original file content.
 * Throws on mismatch to prevent corrupt updates.
 * @param {string} originalContent
 * @param {string} diffString
 * @param {string} filePath
 * @returns {string}
 */
function applyDiffToFile(originalContent, diffString, filePath = "file.txt") {
  const preferredEOL = detectPreferredEOL(originalContent);
  const base = normalizeLineEndings(originalContent);
  const baseLines = base.split("\n");
  const ensured = ensureFileHeaders(diffString, filePath);
  const { valid, errors } = validateUnifiedDiff(ensured);
  if (!valid) {
    const err = new Error(`Invalid unified diff: ${errors.join('; ')}`);
    err.code = 'INVALID_DIFF';
    throw err;
  }
  const hunks = parseUnifiedDiff(ensured);
  let output = [];
  let baseIndex = 0; // pointer in baseLines

  for (const hunk of hunks) {
    const m = /@@\s+\-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(hunk.header);
    if (!m) {
      const err = new Error(`Malformed hunk header: ${hunk.header}`);
      err.code = 'MALFORMED_HUNK';
      throw err;
    }
    const aStart = parseInt(m[1], 10) || 1; // 1-based
    // Copy unchanged lines up to aStart-1
    const targetIndex = aStart - 1; // 0-based index to start applying hunk
    if (targetIndex < baseIndex) {
      const err = new Error(`Overlapping hunks or incorrect ordering at header: ${hunk.header}`);
      err.code = 'OVERLAP_HUNKS';
      throw err;
    }
    // Push unchanged region
    while (baseIndex < targetIndex) {
      output.push(baseLines[baseIndex] ?? "");
      baseIndex++;
    }
    // Now process hunk lines
    for (const { sign, text } of hunk.lines) {
      if (sign === ' ') {
        // context: must match next base line
        const current = baseLines[baseIndex] ?? "";
        if (current !== text) {
          console.log(`[git-diff-utils] Context mismatch at line ${baseIndex + 1}:`);
          console.log(`[git-diff-utils] Expected: '${text}'`);
          console.log(`[git-diff-utils] Got: '${current}'`);
          console.log(`[git-diff-utils] Original file lines around ${baseIndex + 1}:`);
          for (let i = Math.max(0, baseIndex - 2); i <= Math.min(baseLines.length - 1, baseIndex + 2); i++) {
            console.log(`[git-diff-utils] Line ${i + 1}: '${baseLines[i]}'`);
          }
          const err = new Error(`Context mismatch while applying diff at '${text}' (got '${current}')`);
          err.code = 'CONTEXT_MISMATCH';
          throw err;
        }
        output.push(current);
        baseIndex++;
      } else if (sign === '-') {
        // deletion: must match next base line and skip
        const current = baseLines[baseIndex] ?? "";
        if (current !== text) {
          const err = new Error(`Deletion mismatch while applying diff at '${text}' (got '${current}')`);
          err.code = 'DELETE_MISMATCH';
          throw err;
        }
        baseIndex++;
      } else if (sign === '+') {
        // addition: insert line
        output.push(text);
      } else {
        const err = new Error(`Unknown diff line sign '${sign}'`);
        err.code = 'UNKNOWN_SIGN';
        throw err;
      }
    }
  }
  // Append remaining lines after last hunk
  while (baseIndex < baseLines.length) {
    output.push(baseLines[baseIndex] ?? "");
    baseIndex++;
  }
  const result = output.join("\n").replace(/\n/g, preferredEOL);
  console.log("[git-diff-utils] Applied diff to", filePath, "result lines:", output.length);
  return result;
}

/**
 * Extract unified diff from raw LLM response text, handling common code fences.
 * @param {string} text
 * @returns {string}
 */
function parseDiffResponse(text) {
  if (!text || typeof text !== 'string') return '';
  const raw = text.trim();
  // Try to extract from fenced code blocks first (```diff ... ```)
  const fenceRegex = /```(diff|patch)?\n([\s\S]*?)```/i;
  const m = fenceRegex.exec(raw);
  if (m) {
    let content = m[2];
    // Remove a single leading newline added by formatting
    if (content.startsWith('\n')) content = content.slice(1);
    // Remove a single trailing newline that often precedes closing ```
    if (content.endsWith('\n')) content = content.slice(0, -1);
    console.log('[git-diff-utils] Extracted diff from fenced block');
    return content;
  }
  // If unified diff headers present, return as-is
  if (/^---\s+a\//m.test(raw) && /^\+\+\+\s+b\//m.test(raw)) {
    return raw;
  }
  // If lines look like a hunk without headers, return raw for caller to add headers
  if (/^@@\s+\-\d+/.test(raw)) {
    return raw;
  }
  // Otherwise, attempt to isolate lines starting with diff markers
  const candidate = raw.split(/\n/).filter(l => l.startsWith('@@ ') || l.startsWith('+') || l.startsWith('-') || l.startsWith(' ')).join('\n');
  return candidate || raw;
}

module.exports = {
  createFileDiff,
  applyDiffToFile,
  parseDiffResponse,
  validateUnifiedDiff,
  normalizeLineEndings,
  ensureFileHeaders,
  // Expose internals for tests
  _internal: { computeDiffOps, buildUnifiedHunks, parseUnifiedDiff, detectPreferredEOL },
};


