import llmService from "@/lib/services/llm-service"

let pdfParseClassPromise = null
let pdfPolyfillsPromise = null

async function ensurePdfjsNodePolyfills() {
  if (!pdfPolyfillsPromise) {
    pdfPolyfillsPromise = (async () => {
      if (typeof globalThis.DOMMatrix !== "undefined") return

      try {
        const canvas = await import("@napi-rs/canvas")
        if (canvas.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix
        if (canvas.ImageData) globalThis.ImageData = canvas.ImageData
        if (canvas.Path2D) globalThis.Path2D = canvas.Path2D
        console.log("[gov-rfp-processing] loaded pdfjs node polyfills from @napi-rs/canvas")
      } catch (error) {
        console.error("[gov-rfp-processing] failed to load @napi-rs/canvas:", error)
        throw new Error("PDF processing is unavailable in this environment")
      }

      if (typeof globalThis.DOMMatrix === "undefined") {
        throw new Error("DOMMatrix is not defined")
      }
    })()
  }
  await pdfPolyfillsPromise
}

async function loadPdfParseClass() {
  if (!pdfParseClassPromise) {
    pdfParseClassPromise = ensurePdfjsNodePolyfills().then(async () => {
      const mod = await import("pdf-parse")
      return mod.PDFParse
    })
  }
  return pdfParseClassPromise
}

const MAX_RFP_TEXT_CHARS = 24000
const MAX_CONTEXT_CHARS = 900

const rfpSummarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    capabilities: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    agencies: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
    },
    naics_codes: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
    },
    contract_keywords: {
      type: "array",
      items: { type: "string" },
      maxItems: 10,
    },
    fit_context: { type: "string" },
  },
  required: [
    "summary",
    "capabilities",
    "agencies",
    "naics_codes",
    "contract_keywords",
    "fit_context",
  ],
}

function compactText(value) {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseLlmJson(value) {
  const text = String(value || "").trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  }
}

function cleanStringArray(value, limit) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit)
}

function cleanNaicsCodes(value) {
  return cleanStringArray(value, 6)
    .map((code) => code.match(/\d{2,6}/)?.[0] || "")
    .filter(Boolean)
}

function normalizeRfpSummary(value) {
  return {
    processing_status: "processed",
    processed_at: new Date().toISOString(),
    summary: String(value?.summary || "").trim().slice(0, 1200),
    capabilities: cleanStringArray(value?.capabilities, 8),
    agencies: cleanStringArray(value?.agencies, 6),
    naics_codes: cleanNaicsCodes(value?.naics_codes),
    contract_keywords: cleanStringArray(value?.contract_keywords, 10),
    fit_context: String(value?.fit_context || "").trim().slice(0, MAX_CONTEXT_CHARS),
  }
}

export async function extractPdfText(buffer) {
  const PDFParse = await loadPdfParseClass()
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return compactText(result?.text || "")
  } finally {
    await parser.destroy()
  }
}

export async function processPastRfpPdf({ buffer, filename, companyName }) {
  const extractedText = await extractPdfText(buffer)
  if (!extractedText) {
    throw new Error("No readable text found in PDF")
  }

  const input = `Summarize this past completed RFP or solicitation so it can improve future government-contract fit scoring.

Rules:
- Use only the PDF text below.
- Focus on work the company has already pursued or completed: agency/customer, mission area, scope, deliverables, technical capabilities, NAICS, and domain language.
- fit_context should be a compact paragraph that helps an evaluator compare a new RFP against this past RFP. Mention signals that should raise fit and signals that would make a new RFP less similar.
- Do not include boilerplate, legal clauses, or generic procurement instructions unless they reveal the technical work.

Company: ${companyName || "Unknown company"}
Filename: ${filename}
PDF text:
${extractedText.slice(0, MAX_RFP_TEXT_CHARS)}`

  const response = await llmService.createResponse({
    provider: "gemini",
    model: process.env.GOV_RFP_PROCESSING_LLM_MODEL || "gemini-3.1-flash-lite",
    input,
    response_format: {
      type: "json_schema",
      name: "past_rfp_profile_context",
      schema: rfpSummarySchema,
    },
    temperature: 0.1,
    max_output_tokens: 1200,
    store: false,
  })

  const summary = normalizeRfpSummary(parseLlmJson(response?.output_text))
  if (!summary.summary && !summary.fit_context) {
    throw new Error("RFP summarization returned no usable context")
  }

  console.log("[gov-rfp-processing] processed", {
    filename,
    text_length: extractedText.length,
    capabilities: summary.capabilities.length,
    keywords: summary.contract_keywords.length,
  })

  return summary
}
