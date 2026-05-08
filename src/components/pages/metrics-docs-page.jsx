"use client"

import { useState } from "react"
import AppBar from "@/components/ui/app-bars/app-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/feedback/badge"
import { Check, Copy, BookOpen, Package, Rocket, Shield, Layers } from "lucide-react"
import Prism from "prismjs"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-markup"

const INSTALL_COMMAND = `npm install @chromieee/metrics`

const BACKGROUND_EXAMPLE = `// background.js
import { ChromieMetrics } from '@chromieee/metrics';

const metrics = ChromieMetrics.init({
  apiKey: 'chromie_live_xxxxx'  // Get one at https://chromie.dev
});

// Track events (sync)
metrics.trackEvent('button_click', { button_id: 'icon' });`

const UMD_EXAMPLE = `importScripts('chromie-metrics.umd.js');
const metrics = ChromieMetrics.ChromieMetrics.init({ apiKey: 'chromie_live_xxxxx' });`

const CONTENT_EXAMPLE = `// content.js
import { ChromieMetricsClient } from '@chromieee/metrics/content';

const metrics = ChromieMetricsClient.init();

// Track events (async) - URL and title captured automatically
await metrics.trackPageView();
await metrics.trackButtonClick('save_btn');
await metrics.trackEvent('custom:feature_used', { feature: 'export' });`

const POPUP_EXAMPLE = `// popup.js
import { ChromieMetricsClient } from '@chromieee/metrics/popup';

const metrics = ChromieMetricsClient.init();

await metrics.trackPageView('settings');
await metrics.trackButtonClick('export_btn');`

const EVENT_TYPES_EXAMPLE = `// Standard events
metrics.trackEvent('button_click', { button_id: 'save' });
metrics.trackEvent('page_view', { view: 'dashboard' });
metrics.trackEvent('api_call', { endpoint: '/users', status: 200 });
metrics.trackEvent('error', { message: 'Failed to load' });

// Custom events (use custom: prefix)
metrics.trackEvent('custom:feature_enabled', { feature: 'dark_mode' });`

const CONFIG_EXAMPLE = `ChromieMetrics.init({
  apiKey: 'chromie_live_xxxxx',     // Required
  batchSize: 20,                     // Events before sending (default: 20)
  flushInterval: 30000,              // Send interval in ms (default: 30000)
  debug: false,                      // Console logging (default: false)
  autoTrackLifecycle: true,          // Track install/update (default: true)
  maxRetries: 3,                     // Retry attempts (default: 3)
  maxQueueSize: 500                  // Max queued events (default: 500)
});`

const BACKGROUND_API_EXAMPLE = `// Initialize (singleton)
const metrics = ChromieMetrics.init(options);
const metrics = ChromieMetrics.getInstance();

// Track events (sync)
metrics.trackEvent(eventType, metadata);
metrics.trackButtonClick(buttonId, metadata);
metrics.trackPageView(viewName, metadata);

// Control
await metrics.flush();           // Send queued events immediately
metrics.disable();               // Pause tracking
metrics.enable();                // Resume tracking
metrics.isEnabled();             // Check status
metrics.getQueueLength();        // Pending events count
await metrics.getUserId();       // Get anonymous user ID
await metrics.destroy();         // Cleanup`

const CLIENT_API_EXAMPLE = `// Initialize (singleton)
const metrics = ChromieMetricsClient.init({ debug: false });
const metrics = ChromieMetricsClient.getInstance();

// Track events (async - sends to background)
await metrics.trackEvent(eventType, metadata);
await metrics.trackButtonClick(buttonId, metadata);
await metrics.trackPageView(viewName, metadata);  // viewName optional in content scripts
await metrics.trackApiCall(endpoint, metadata);
await metrics.trackError(error, metadata);`

const ARCHITECTURE_EXAMPLE = `┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Content Script  │    │  Popup Script   │    │ Background      │
│ (Lightweight)   │    │  (Lightweight)  │    │ (Full SDK)      │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │   chrome.runtime.sendMessage()              │
         └──────────────────────┴──────────────────────┤
                                                       │
                                              ┌────────▼────────┐
                                              │ Queue & Batch   │
                                              │ Retry & Storage │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Chromie API    │
                                              └─────────────────┘`

const ENTRY_POINTS = [
  { entry: "@chromieee/metrics", useIn: "Background script", bundle: "~10KB min" },
  { entry: "@chromieee/metrics/content", useIn: "Content scripts", bundle: "~1.5KB min" },
  { entry: "@chromieee/metrics/popup", useIn: "Popup/options pages", bundle: "~1.3KB min" },
]

const CONFIG_ROWS = [
  { option: "apiKey", required: "Yes", defaultValue: "-", details: "Your metrics API key from chromie.dev" },
  { option: "batchSize", required: "No", defaultValue: "20", details: "Events queued before sending a batch" },
  { option: "flushInterval", required: "No", defaultValue: "30000", details: "Background flush interval in milliseconds" },
  { option: "debug", required: "No", defaultValue: "false", details: "Console logging for SDK internals" },
  { option: "autoTrackLifecycle", required: "No", defaultValue: "true", details: "Auto-track install/update/uninstall events" },
  { option: "maxRetries", required: "No", defaultValue: "3", details: "Retry attempts for failed requests" },
  { option: "maxQueueSize", required: "No", defaultValue: "500", details: "Maximum number of queued events" },
]

const BACKGROUND_METHOD_ROWS = [
  { method: "trackEvent(eventType, metadata)", returns: "void", notes: "Track a standard or custom event" },
  { method: "trackButtonClick(buttonId, metadata)", returns: "void", notes: "Convenience event helper" },
  { method: "trackPageView(viewName, metadata)", returns: "void", notes: "Track view-level interactions" },
  { method: "flush()", returns: "Promise<void>", notes: "Immediately send queued events" },
  { method: "disable()", returns: "void", notes: "Pause event collection and sending" },
  { method: "enable()", returns: "void", notes: "Resume event collection" },
  { method: "isEnabled()", returns: "boolean", notes: "Check current tracking state" },
  { method: "getQueueLength()", returns: "number", notes: "Inspect queued event count" },
  { method: "getUserId()", returns: "Promise<string>", notes: "Get anonymous user identifier" },
  { method: "destroy()", returns: "Promise<void>", notes: "Cleanup listeners/resources" },
]

const CLIENT_METHOD_ROWS = [
  { method: "trackEvent(eventType, metadata)", returns: "Promise<void>", notes: "Send custom/standard event to background" },
  { method: "trackButtonClick(buttonId, metadata)", returns: "Promise<void>", notes: "Convenience event helper" },
  { method: "trackPageView(viewName, metadata)", returns: "Promise<void>", notes: "viewName optional in content scripts" },
  { method: "trackApiCall(endpoint, metadata)", returns: "Promise<void>", notes: "Track API interaction telemetry" },
  { method: "trackError(error, metadata)", returns: "Promise<void>", notes: "Track exceptions and failures" },
]

function CopyCodeButton({ value, copiedKey, setCopiedKey, copyId }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(copyId)
      setTimeout(() => setCopiedKey(null), 1800)
    } catch (error) {
      console.error("Failed to copy code snippet:", error)
    }
  }

  return (
    <Button
      size="iconSm"
      variant="outline"
      onClick={onCopy}
      className="h-8 w-8 border-slate-700 bg-slate-900/95 text-slate-200 hover:text-white hover:bg-slate-800"
      title={copiedKey === copyId ? "Copied" : "Copy code"}
      aria-label={copiedKey === copyId ? "Copied" : "Copy code"}
    >
      {copiedKey === copyId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

const LANGUAGE_MAP = {
  javascript: "javascript",
  js: "javascript",
  bash: "bash",
  sh: "bash",
  html: "markup",
  markup: "markup",
}

function DocsCodeBlock({ code, language = "javascript", copiedKey, setCopiedKey, copyId }) {
  const prismLanguage = LANGUAGE_MAP[language] || "javascript"
  const grammar = Prism.languages[prismLanguage] || Prism.languages.javascript
  const highlightedCode = Prism.highlight(code, grammar, prismLanguage)

  return (
    <div className="group relative">
      <div className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-auto">
          <CopyCodeButton value={code} copiedKey={copiedKey} setCopiedKey={setCopiedKey} copyId={copyId} />
        </div>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 pr-12 text-sm leading-6 text-slate-100">
        <code
          className={`language-${prismLanguage}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  )
}

function DocsTable({ headers, rows, renderRow }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 font-medium text-slate-200 border-b border-slate-800">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-800 last:border-0">
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MetricsDocsPage() {
  const [copiedKey, setCopiedKey] = useState(null)

  const sectionLinks = [
    { href: "#installation", label: "Installation" },
    { href: "#quick-start", label: "Quick Start" },
    { href: "#event-types", label: "Event Types" },
    { href: "#configuration", label: "Configuration" },
    { href: "#api-reference", label: "API Reference" },
    { href: "#automatic-tracking", label: "Automatic Tracking" },
    { href: "#architecture", label: "Architecture" },
    { href: "#privacy", label: "Privacy" },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AppBar />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 pb-12 pt-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="mb-3 flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-slate-300" />
            <h2 className="text-sm font-semibold text-slate-100">Docs Navigation</h2>
          </div>
          <nav className="space-y-1">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-800 text-slate-200 border-slate-700">SDK</Badge>
              <Badge className="bg-slate-800 text-slate-200 border-slate-700">Chrome Extensions</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">@chromieee/metrics</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Lightweight metrics SDK for Chrome extensions. Zero dependencies, automatic batching, and offline support.
            </p>
          </div>

          <section id="installation" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Installation</h2>
            <p className="text-sm text-slate-400">Install from npm:</p>
            <DocsCodeBlock
              code={INSTALL_COMMAND}
              language="bash"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="install"
            />
          </section>

          <section id="quick-start" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Quick Start</h2>
            <p className="text-slate-300">
              Use the entry point that matches your extension context.
            </p>

            <DocsTable
              headers={["Entry Point", "Use In", "Bundle Size"]}
              rows={ENTRY_POINTS}
              renderRow={(row) => (
                <>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-100">{row.entry}</td>
                  <td className="px-4 py-3 text-slate-300">{row.useIn}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.bundle}</td>
                </>
              )}
            />

            <h3 className="text-lg font-semibold text-white pt-1">1) Background script (required)</h3>
            <DocsCodeBlock
              code={BACKGROUND_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="background"
            />

            <h3 className="text-lg font-semibold text-white">Background using UMD (service worker)</h3>
            <DocsCodeBlock
              code={UMD_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="umd"
            />

            <h3 className="text-lg font-semibold text-white">2) Content scripts (optional)</h3>
            <DocsCodeBlock
              code={CONTENT_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="content"
            />

            <h3 className="text-lg font-semibold text-white">3) Popup/options scripts (optional)</h3>
            <DocsCodeBlock
              code={POPUP_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="popup"
            />
          </section>

          <section id="event-types" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Event Types</h2>
            <p className="text-sm text-slate-400">Standard and custom events:</p>
            <DocsCodeBlock
              code={EVENT_TYPES_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="events"
            />
          </section>

          <section id="configuration" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Configuration</h2>
            <DocsTable
              headers={["Option", "Required", "Default", "Details"]}
              rows={CONFIG_ROWS}
              renderRow={(row) => (
                <>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-100">{row.option}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{row.required}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.defaultValue}</td>
                  <td className="px-4 py-3 text-slate-300">{row.details}</td>
                </>
              )}
            />
            <p className="text-sm text-slate-400">Initialize with explicit options:</p>
            <DocsCodeBlock
              code={CONFIG_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="config"
            />
          </section>

          <section id="api-reference" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">API Reference</h2>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-100">Background Script (`ChromieMetrics`)</h3>
              <DocsTable
                headers={["Method", "Returns", "Notes"]}
                rows={BACKGROUND_METHOD_ROWS}
                renderRow={(row) => (
                  <>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-100">{row.method}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.returns}</td>
                    <td className="px-4 py-3 text-slate-300">{row.notes}</td>
                  </>
                )}
              />
            </div>
            <DocsCodeBlock
              code={BACKGROUND_API_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="bg-api"
            />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-100">Content/Popup Scripts (`ChromieMetricsClient`)</h3>
              <DocsTable
                headers={["Method", "Returns", "Notes"]}
                rows={CLIENT_METHOD_ROWS}
                renderRow={(row) => (
                  <>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-100">{row.method}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.returns}</td>
                    <td className="px-4 py-3 text-slate-300">{row.notes}</td>
                  </>
                )}
              />
            </div>
            <DocsCodeBlock
              code={CLIENT_API_EXAMPLE}
              language="javascript"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="client-api"
            />
          </section>

          <section id="automatic-tracking" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Automatic Tracking</h2>
            <p className="text-slate-300">
              The background SDK automatically tracks install, update (including <code>previous_version</code>), and uninstall lifecycle events.
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Rocket className="h-5 w-5 text-slate-300 mt-0.5" />
                <div className="space-y-1">
                  <p>- Install: first-time extension installation</p>
                  <p>- Update: extension version changes</p>
                  <p>- Uninstall: tracked via uninstall URL support</p>
                  <p className="text-slate-400 pt-1">Disable with <code>autoTrackLifecycle: false</code>.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="architecture" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Architecture</h2>
            <p className="text-sm text-slate-400">Data flow:</p>
            <DocsCodeBlock
              code={ARCHITECTURE_EXAMPLE}
              language="markup"
              copiedKey={copiedKey}
              setCopiedKey={setCopiedKey}
              copyId="architecture"
            />
            <Card className="border-slate-800 bg-slate-900">
              <CardContent className="p-4 text-sm text-slate-300 flex items-start gap-3">
                <Layers className="h-4 w-4 mt-0.5 text-slate-300" />
                Content and popup clients send lightweight messages to the background script, which handles queueing, retry logic, local persistence, and batched API delivery.
              </CardContent>
            </Card>
          </section>

          <section id="privacy" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold text-white">Privacy</h2>
            <div className="flex items-center gap-2 text-slate-200">
              <Shield className="h-4 w-4 text-slate-300" />
              <p className="text-sm">Built for anonymous product analytics in extensions.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2 text-sm text-slate-300">
              <p>- Anonymous UUIDs only (no personal data)</p>
              <p>- No cookies or tracking pixels</p>
              <p>- Local storage only via <code>chrome.storage.local</code></p>
              <p>- Opt-out anytime with <code>metrics.disable()</code></p>
            </div>
          </section>

          <div className="pt-2">
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              variant="outline"
              className="border-slate-700 text-slate-200 hover:text-white hover:bg-slate-900"
            >
              <Package className="h-4 w-4 mr-2" />
              Back to top
            </Button>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .language-javascript .token.comment {
          color: #6b7280;
        }
        .language-javascript .token.keyword {
          color: #c4b5fd;
        }
        .language-javascript .token.function {
          color: #93c5fd;
        }
        .language-javascript .token.string {
          color: #86efac;
        }
        .language-javascript .token.number,
        .language-javascript .token.boolean {
          color: #fca5a5;
        }
        .language-javascript .token.operator,
        .language-javascript .token.punctuation {
          color: #cbd5e1;
        }
        .language-bash .token.function,
        .language-bash .token.builtin,
        .language-bash .token.keyword {
          color: #93c5fd;
        }
        .language-bash .token.string {
          color: #86efac;
        }
        .language-markup .token.tag,
        .language-markup .token.punctuation {
          color: #cbd5e1;
        }
      `}</style>
    </div>
  )
}
