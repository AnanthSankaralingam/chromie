"use strict";

// DiffProcessingService: orchestrates unified diff handling for extension files.
// Minimal, focused on:
// - Parsing LLM diff responses
// - Applying diffs safely with rollback
// - Validating JS/JSON files
// - Conversation context helpers
// - Preparing files for Supabase storage (hooks)

const path = require("path");
const {
  applyDiffToFile,
  parseDiffResponse,
  ensureFileHeaders,
  validateUnifiedDiff,
} = require("./git-diff-utils.js");

class DiffProcessingService {
  /**
   * @param {Object} options
   * @param {Record<string,string>} [options.initialFiles] in-memory file map path->content
   * @param {number} [options.contextSize] reserved for future context usage
   * @param {any} [options.supabaseClient] optional client; not required
   */
  constructor(options = {}) {
    this.files = { ...(options.initialFiles || {}) }; // path -> content
    this.history = {}; // path -> stack of previous contents for rollback
    this.messages = []; // conversation messages
    this.contextSize = typeof options.contextSize === "number" ? options.contextSize : 10;
    this.supabaseClient = options.supabaseClient || null;
  }

  // -----------------------------
  // Conversation context helpers
  // -----------------------------
  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
    if (this.messages.length > 1000) this.messages.shift();
  }

  getConversationContext(limit = this.contextSize) {
    return this.messages.slice(-limit);
  }

  // -----------------------------
  // Public file map helpers
  // -----------------------------
  getFilesSnapshot() {
    return { ...this.files };
  }

  setFiles(filesMap) {
    this.files = { ...(filesMap || {}) };
    this.history = {};
  }

  getFile(filePath) {
    return this.files[filePath] ?? "";
  }

  setFile(filePath, content) {
    this.files[filePath] = typeof content === "string" ? content : "";
  }

  // -----------------------------
  // Core: process follow-up LLM response containing diffs
  // -----------------------------
  /**
   * Process an LLM response that may include a unified diff (possibly code-fenced).
   * Applies changes to in-memory files with validation and rollback.
   *
   * @param {Object} args
   * @param {string} args.responseText raw LLM response text
   * @param {string} [args.defaultFilePath] used if diff lacks headers
   * @returns {{updated:string[], errors:Array<{filePath:string,error:Error}>, logs:string[]}}
   */
  processFollowUpResponse({ responseText, defaultFilePath } = {}) {
    const logs = [];
    const errors = [];
    const updated = [];

    if (!responseText || typeof responseText !== "string") {
      console.log("[diff-service] Empty or invalid responseText provided")
      return { updated, errors: [{ filePath: defaultFilePath || "", error: new Error("Empty responseText") }], logs };
    }

    console.log("[diff-service] Processing follow-up response, length:", responseText.length);
    console.log("[diff-service] Raw response preview (first 300 chars):", responseText.substring(0, 300));

    const extracted = parseDiffResponse(responseText);
    logs.push("extracted_diff_length=" + extracted.length);
    console.log("[diff-service] Extracted diff length:", extracted.length);
    console.log("[diff-service] Extracted diff preview (first 300 chars):", extracted.substring(0, 300));

    if (extracted.length === 0) {
      console.log("[diff-service] No diff content extracted from response");
      console.log("[diff-service] Response contains markdown:", responseText.includes('```'));
      console.log("[diff-service] Response contains diff markers:", responseText.includes('@@') || responseText.includes('---') || responseText.includes('+++'));
      return { updated, errors: [{ filePath: defaultFilePath || "", error: new Error("No diff content extracted") }], logs };
    }

    // Split into file-specific diffs (supports both single and multi-file diff)
    const diffs = this.#splitDiffByFiles(extracted, defaultFilePath);
    if (diffs.length === 0) {
      errors.push({ filePath: defaultFilePath || "", error: new Error("No diff hunks detected") });
      return { updated, errors, logs };
    }

    for (const { filePath, diff } of diffs) {
      try {
        console.log(`[diff-service] Processing diff for ${filePath}, diff length: ${diff.length}`);
        console.log(`[diff-service] Diff preview for ${filePath}:`, diff.substring(0, 200));

        let ensured = ensureFileHeaders(diff, filePath);
        console.log(`[diff-service] Ensured headers for ${filePath}, new length: ${ensured.length}`);

        const { valid, errors: vErrors } = validateUnifiedDiff(ensured);
        console.log(`[diff-service] Validation result for ${filePath}:`, { valid, errors: vErrors });

        if (!valid) {
          // Try to add missing hunk headers as a fallback
          if (!ensured.includes('@@ ')) {
            console.log(`[diff-service] Attempting to add missing hunk headers for ${filePath}`);
            ensured = this.#addMissingHunkHeaders(ensured, filePath);
            console.log(`[diff-service] After adding headers, diff length: ${ensured.length}`);
          }

          // Re-validate after fallback attempt
          const { valid: reValid, errors: reErrors } = validateUnifiedDiff(ensured);
          if (!reValid) {
            const e = new Error(`Invalid diff for ${filePath}: ${(reErrors || vErrors || []).join("; ")}. Diff preview: ${ensured.substring(0, 200)}`);
            e.code = "INVALID_DIFF";
            throw e;
          }
        }

        const original = this.getFile(filePath);
        console.log(`[diff-service] Original content for ${filePath} (first 200 chars):`, original.substring(0, 200));
        console.log(`[diff-service] Original content length: ${original.length} characters`);

        this.#pushHistory(filePath, original);
        const nextContent = applyDiffToFile(original, ensured, filePath);

        const isValid = this.#validateFileContent(filePath, nextContent);
        if (!isValid.ok) {
          // Rollback
          this.#rollback(filePath);
          const err = new Error(`Validation failed for ${filePath}: ${isValid.message}`);
          err.code = "VALIDATION_FAILED";
          throw err;
        }

        this.setFile(filePath, nextContent);
        updated.push(filePath);
        logs.push(`updated:${filePath}`);
        console.log("[diff-service] Updated file:", filePath);
      } catch (error) {
        console.error("[diff-service] Error applying diff for", filePath, error?.message);
        errors.push({ filePath, error });
      }
    }

    return { updated, errors, logs };
  }

  // -----------------------------
  // Supabase integration hooks (minimal)
  // -----------------------------
  /**
   * Prepare current files for Supabase storage.
   * @returns {Array<{path:string, content:string, mimeType:string}>}
   */
  prepareForSupabase() {
    return Object.keys(this.files).map((p) => ({
      path: p,
      content: this.files[p] ?? "",
      mimeType: this.#resolveMimeType(p),
    }));
  }

  /**
   * Optionally upload prepared files to Supabase if a client was provided.
   * This is a no-op if no client is present. Callers may also ignore this and
   * handle uploads themselves.
   *
   * @param {Object} args
   * @param {string} args.bucket
   * @param {string} [args.prefix]
   * @returns {Promise<{uploaded:number, errors:Array<{path:string, error:any}>}>}
   */
  async uploadPreparedFiles({ bucket, prefix = "" } = {}) {
    const results = { uploaded: 0, errors: [] };
    if (!this.supabaseClient) {
      console.log("[diff-service] No Supabase client provided; skip upload.");
      return results;
    }
    const files = this.prepareForSupabase();
    for (const f of files) {
      try {
        const objectPath = prefix ? `${prefix}/${f.path}` : f.path;
        const body = typeof Blob !== "undefined"
          ? new Blob([f.content], { type: f.mimeType })
          : (typeof Buffer !== "undefined" ? Buffer.from(f.content || "", "utf-8") : f.content || "");
        const { error } = await this.supabaseClient
          .storage
          .from(bucket)
          .upload(objectPath, body, { upsert: true, contentType: f.mimeType });
        if (error) throw error;
        results.uploaded++;
      } catch (error) {
        console.error("[diff-service] Upload error for", f.path, error?.message);
        results.errors.push({ path: f.path, error });
      }
    }
    return results;
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------
  /**
   * Split unified diff text into per-file diffs using headers.
   * Falls back to defaultFilePath if no headers are present.
   * @param {string} diffText
   * @param {string} [defaultFilePath]
   * @returns {Array<{filePath:string, diff:string}>}
   */
  #splitDiffByFiles(diffText, defaultFilePath) {
    const text = String(diffText || "");
    const parts = [];

    // Look for sequences that start with --- a/ and +++ b/ to delimit files
    const headerRegex = /^---\s+a\/(.+)\n\+\+\+\s+b\/(.+)$/gm;
    let match;
    const indices = [];
    while ((match = headerRegex.exec(text)) !== null) {
      indices.push({ index: match.index, filePath: match[2] });
    }
    if (indices.length === 0) {
      // Treat entire diff as for one file
      if (!defaultFilePath) return [];
      parts.push({ filePath: defaultFilePath, diff: text });
      return parts;
    }
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i].index;
      const end = i + 1 < indices.length ? indices[i + 1].index : text.length;
      const slice = text.slice(start, end).trim();
      const filePath = indices[i].filePath.trim();
      parts.push({ filePath, diff: slice });
    }
    return parts;
  }

  #pushHistory(filePath, previousContent) {
    if (!this.history[filePath]) this.history[filePath] = [];
    this.history[filePath].push(previousContent);
  }

  #rollback(filePath) {
    const stack = this.history[filePath];
    if (stack && stack.length > 0) {
      const prev = stack.pop();
      this.setFile(filePath, prev);
      console.log("[diff-service] Rolled back file:", filePath);
    }
  }

  #resolveMimeType(filePath) {
    const ext = (path.extname(filePath || "").toLowerCase()) || "";
    switch (ext) {
      case ".json": return "application/json";
      case ".js":
      case ".jsx": return "text/javascript";
      case ".ts":
      case ".tsx": return "text/typescript";
      case ".css": return "text/css";
      case ".html": return "text/html";
      default: return "text/plain";
    }
  }

  /**
   * Validate content by extension. JSON is strictly validated; JS is best-effort.
   * @param {string} filePath
   * @param {string} content
   * @returns {{ok:boolean, message?:string}}
   */
  #validateFileContent(filePath, content) {
    const ext = (path.extname(filePath || "").toLowerCase()) || "";
    if (ext === ".json") {
      try {
        JSON.parse(content || "");
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e?.message || "Invalid JSON" };
      }
    }
    if (ext === ".js" || ext === ".jsx" || ext === ".ts" || ext === ".tsx") {
      // Best-effort JS/TS syntax check without external deps:
      const looksLikeESM = /(^|\n)\s*(import\s+|export\s+)/.test(content || "");
      try {
        if (!looksLikeESM) {
          // CommonJS/function-body compatible quick parse
          // eslint-disable-next-line no-new-func
          new Function("\n" + (content || ""));
          return { ok: true };
        }
        // For ESM, perform lightweight bracket/quote balance check as fallback
        const balance = this.#checkStructuralBalance(content || "");
        if (!balance.ok) return balance;
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e?.message || "Invalid JS" };
      }
    }
    return { ok: true };
  }

  /**
   * Very lightweight structural balance check for JS when full parse is unavailable.
   * @param {string} text
   * @returns {{ok:boolean, message?:string}}
   */
  /**
   * Fallback method to add missing hunk headers to a diff that has file headers but no @@ lines
   * @param {string} diff
   * @param {string} filePath
   * @returns {string}
   */
  #addMissingHunkHeaders(diff, filePath) {
    const lines = diff.split('\n');
    const result = [];
    let foundFileHeaders = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Copy file headers as-is
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        result.push(line);
        foundFileHeaders = true;
        continue;
      }

      // If we found file headers and the next line doesn't start with @@, add a hunk header
      if (foundFileHeaders && !line.startsWith('@@ ') && line.trim() !== '') {
        // Add a generic hunk header for the entire file
        // This assumes the diff contains the full new content
        const lineCount = lines.slice(i).filter(l => l.trim() !== '').length;
        result.push(`@@ -1,0 +1,${lineCount} @@`);
        foundFileHeaders = false; // Only add one hunk header per file
      }

      result.push(line);
    }

    return result.join('\n');
  }

  #checkStructuralBalance(text) {
    const stack = [];
    let inSingle = false, inDouble = false, inTemplate = false;
    let escape = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (!inDouble && !inTemplate && ch === "'" && !inSingle) { inSingle = true; continue; }
      else if (inSingle && ch === "'") { inSingle = false; continue; }
      if (!inSingle && !inTemplate && ch === '"' && !inDouble) { inDouble = true; continue; }
      else if (inDouble && ch === '"') { inDouble = false; continue; }
      if (!inSingle && !inDouble && ch === "`" && !inTemplate) { inTemplate = true; continue; }
      else if (inTemplate && ch === "`") { inTemplate = false; continue; }
      if (inSingle || inDouble || inTemplate) continue;
      if (ch === "(") stack.push(")");
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if ((ch === ")" || ch === "}" || ch === "]") && stack.pop() !== ch) {
        return { ok: false, message: "Unbalanced brackets" };
      }
    }
    if (inSingle || inDouble || inTemplate) {
      return { ok: false, message: "Unterminated string/template" };
    }
    if (stack.length !== 0) {
      return { ok: false, message: "Unbalanced brackets" };
    }
    return { ok: true };
  }
}

module.exports = { DiffProcessingService };
