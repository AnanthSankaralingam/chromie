/**
 * Builds loading-stage titles and instruction boxes for browser test overlays.
 * Bookends [0] and [3] share the same generic copy; middle slots [1][2] are manifest-driven.
 */

import {
  Monitor,
  Navigation,
  LayoutGrid,
  PanelRight,
  Puzzle,
  Settings2,
  PlusSquare,
  Code2,
  Globe,
} from "lucide-react"
import { analyzeManifest } from "@/lib/codegen/file-analysis/analyzers/manifest-analyzer"

/** @typedef {'embed' | 'side-by-side'} LoadingVariant */

const BOOKEND_STAGE_TITLE = "launching cloud browser"

function normalizeFiles(extensionFiles) {
  if (!Array.isArray(extensionFiles)) return []
  return extensionFiles.map((f) => ({
    file_path: f.file_path || f.fullPath || "",
    content: f.content ?? "",
  }))
}

function getManifestContent(extensionFiles) {
  const files = normalizeFiles(extensionFiles)
  const entry = files.find((f) => {
    const p = (f.file_path || "").replace(/\\/g, "/")
    return p === "manifest.json" || p.endsWith("/manifest.json")
  })
  return entry?.content?.trim() ? entry.content : null
}

/**
 * @returns {object} capability flags + parseError
 */
function deriveExtensionSurfaceCaps(manifestContent) {
  const caps = {
    parseError: false,
    hasPopup: false,
    hasSidePanel: false,
    hasOptions: false,
    optionsOpenInTab: false,
    hasNewTabOverride: false,
    hasBookmarksOverride: false,
    hasHistoryOverride: false,
    hasDevtoolsPage: false,
    hasContentScripts: false,
    hasBackground: false,
    hasOmnibox: false,
  }

  if (!manifestContent) {
    caps.parseError = true
    return caps
  }

  const analysis = analyzeManifest(manifestContent, "manifest.json")
  if (analysis.parseError) {
    caps.parseError = true
    return caps
  }

  let manifest
  try {
    manifest = JSON.parse(manifestContent)
  } catch {
    caps.parseError = true
    return caps
  }

  const action = manifest.action || manifest.browser_action || manifest.page_action
  if (action?.default_popup) caps.hasPopup = true

  if (manifest.side_panel?.default_path) caps.hasSidePanel = true

  if (manifest.options_page || manifest.options_ui?.page) {
    caps.hasOptions = true
    caps.optionsOpenInTab = !!(manifest.options_ui && manifest.options_ui.open_in_tab === true)
  }

  const overrides = manifest.chrome_url_overrides || {}
  if (overrides.newtab) caps.hasNewTabOverride = true
  if (overrides.bookmarks) caps.hasBookmarksOverride = true
  if (overrides.history) caps.hasHistoryOverride = true

  if (manifest.devtools_page) caps.hasDevtoolsPage = true
  if (manifest.omnibox) caps.hasOmnibox = true

  if (Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0) {
    caps.hasContentScripts = true
  }

  if (manifest.background) {
    const mv = manifest.manifest_version
    if (mv === 3 && manifest.background.service_worker) caps.hasBackground = true
    if (mv !== 3) {
      if (manifest.background.scripts?.length || manifest.background.page) caps.hasBackground = true
    }
  }

  return caps
}

function hasAnyTeachableSurface(caps) {
  return (
    caps.hasPopup ||
    caps.hasSidePanel ||
    caps.hasOptions ||
    caps.hasNewTabOverride ||
    caps.hasBookmarksOverride ||
    caps.hasHistoryOverride ||
    caps.hasDevtoolsPage ||
    caps.hasContentScripts ||
    caps.hasBackground ||
    caps.hasOmnibox
  )
}

function stageTitleSurfaces(caps) {
  if (caps.parseError || !hasAnyTeachableSurface(caps)) {
    return "your extension bundle"
  }
  const tags = []
  if (caps.hasSidePanel) tags.push("side panel")
  if (caps.hasPopup) tags.push("popup")
  if (caps.hasOptions) tags.push("options")
  if (caps.hasNewTabOverride) tags.push("new tab")
  if (caps.hasContentScripts) tags.push("content scripts")
  if (caps.hasBackground) tags.push("background")
  if (caps.hasBookmarksOverride) tags.push("bookmarks page")
  if (caps.hasHistoryOverride) tags.push("history page")
  if (caps.hasDevtoolsPage) tags.push("devtools page")
  if (caps.hasOmnibox) tags.push("omnibox")
  const joined = tags.slice(0, 5).join(" · ")
  return joined ? `your manifest: ${joined}` : "your extension bundle"
}

function pickIconForDeclared(caps) {
  if (caps.hasSidePanel) return PanelRight
  if (caps.hasPopup) return Puzzle
  if (caps.hasOptions) return Settings2
  if (caps.hasNewTabOverride) return PlusSquare
  if (caps.hasContentScripts) return Code2
  return LayoutGrid
}

function pickIconForHowTo(caps) {
  if (caps.hasSidePanel || caps.hasPopup) return Navigation
  if (caps.hasOptions) return Settings2
  return Globe
}

/**
 * Up to 3 bullets: what's declared (static phrasing from caps).
 */
function itemsDeclared(caps) {
  const items = []

  if (caps.parseError) {
    return [
      "couldn't read manifest.json — tips below still apply once the browser opens.",
      "use the toolbar puzzle icon and extension menu to explore.",
      "visit normal sites to exercise content scripts if your project uses them.",
    ]
  }

  if (caps.hasSidePanel) {
    items.push(
      "side panel is declared — in chromium it shows under your extension's toolbar icon."
    )
  }
  if (caps.hasPopup && items.length < 3) {
    items.push('action / default_popup is declared — toolbar icon opens this popup.')
  }
  if (caps.hasOptions && items.length < 3) {
    items.push(
      caps.optionsOpenInTab
        ? "options_ui is declared with open_in_tab — options open as a full tab."
        : "options page is declared — chrome exposes it via the extension menu → options."
    )
  }
  if (caps.hasNewTabOverride && items.length < 3) {
    items.push("chrome_url_overrides.newtab is declared — replaces the new tab page.")
  }
  if (caps.hasBookmarksOverride && items.length < 3) {
    items.push("chrome_url_overrides.bookmarks is declared — replaces the bookmarks manager page.")
  }
  if (caps.hasHistoryOverride && items.length < 3) {
    items.push("chrome_url_overrides.history is declared — replaces the history page.")
  }
  if (caps.hasContentScripts && items.length < 3) {
    items.push("content_scripts are declared — scripts inject on URLs matching your manifest.")
  }
  if (caps.hasBackground && items.length < 3) {
    items.push(
      "background worker or scripts are declared — they keep running while this session is open."
    )
  }
  if (caps.hasDevtoolsPage && items.length < 3) {
    items.push("devtools_page is declared — an extension page wired into developer tools.")
  }
  if (caps.hasOmnibox && items.length < 3) {
    items.push("omnibox keyword is declared — typing it in the address bar drives your extension.")
  }

  if (items.length === 0) {
    return [
      "no toolbar popup, side panel, or overrides found — may be minimal or non-ui.",
      "once loaded, check the puzzle menu for anything chrome registered.",
      "if you only ship content scripts, browse sites that match your matches.",
    ]
  }

  if (items.length === 1) {
    items.push("chrome exposes these the same way as desktop once install completes.")
    items.push("permissions still follow manifest.json.")
  } else if (items.length === 2) {
    items.push("same toolbar icon flow as desktop chromium.")
  }

  return items.slice(0, 3)
}

/**
 * Up to 3 bullets: how to operate in the cloud browser (tailored + edge cases).
 */
function itemsHowTo(caps, variant) {
  const items = []

  if (caps.parseError) {
    items.push("click the puzzle icon → find your extension → pin or open whatever chrome lists.")
    items.push("open ordinary tabs and sites; interact like local chrome.")
    if (variant === "side-by-side") {
      items.push("logs on the right; AI agent tab for scripted runs.")
    } else {
      items.push("try toolbar menus if a popup or side panel doesn't appear immediately.")
    }
    return items.slice(0, 3)
  }

  if (caps.hasSidePanel) {
    items.push(
      "side panel: click your extension icon in the toolbar, then open side panel from chrome's menu for that icon."
    )
  }
  if (caps.hasPopup && items.length < 3) {
    items.push("popup: puzzle icon → your extension, or pin it — same as desktop chrome.")
  }
  if (caps.hasOptions && items.length < 3) {
    items.push(
      caps.optionsOpenInTab
        ? "options: chrome extensions menu → your extension → options (opens as a tab here too)."
        : "options: right-click the extension icon → options, or extensions page → details → options."
    )
  }
  if (caps.hasNewTabOverride && items.length < 3) {
    items.push("new tab page: open a new tab — your override loads in this session.")
  }
  if (caps.hasBookmarksOverride && items.length < 3) {
    items.push("bookmarks UI: open the bookmarks manager — your override replaces that page.")
  }
  if (caps.hasHistoryOverride && items.length < 3) {
    items.push("history UI: open history — your override replaces that page.")
  }
  if (caps.hasContentScripts && items.length < 3) {
    items.push("content scripts: navigate to URLs that match your matches (e.g. https pages for <all_urls>).")
  }
  if (caps.hasDevtoolsPage && items.length < 3) {
    items.push("devtools extension page: open devtools on a tab when testing that integration.")
  }
  if (caps.hasOmnibox && items.length < 3) {
    items.push("omnibox: focus the address bar, type your keyword, then the suggestion flow from your manifest.")
  }
  if (caps.hasBackground && items.length < 3) {
    items.push("background: keep the session open — events fire without a visible window.")
  }

  if (items.length === 0) {
    items.push("browse normally; use the puzzle icon if you need to find toolbar actions.")
    items.push("this chromium session mirrors local behavior — same clicks, same surfaces.")
  }

  if (items.length === 1) {
    items.push("real chromium in the cloud — interact like your own browser.")
  }

  const hintSideBySide = "logs on the right; AI agent tab for scripted runs."
  if (variant === "side-by-side") {
    if (items.length >= 3) {
      const appended = `${items[2]} · ${hintSideBySide}`
      items[2] = appended.length <= 220 ? appended : hintSideBySide
    } else {
      while (items.length < 2) {
        items.push("use the toolbar puzzle icon and extension menus like desktop chrome.")
      }
      items.push(hintSideBySide)
    }
  } else if (items.length === 2) {
    items.push("real chromium in the cloud — interact like your own browser.")
  }

  return items.slice(0, 3)
}

function genericInstructionBookend() {
  return {
    icon: Monitor,
    iconColor: "blue",
    title: "real chromium, in the cloud",
    items: [
      "same engine as desktop chrome.",
      "your extension runs only here — use tabs and menus like local chrome.",
      "first connect: ~15–30s.",
    ],
  }
}

/**
 * @param {Array<{ file_path?: string, fullPath?: string, content?: string }>} extensionFiles
 * @param {LoadingVariant} variant
 */
export function buildBrowserTestLoadingArrays(extensionFiles, variant = "embed") {
  const manifestContent = getManifestContent(extensionFiles)
  const caps = deriveExtensionSurfaceCaps(manifestContent)

  const bookend = genericInstructionBookend()

  const declared = {
    icon: pickIconForDeclared(caps),
    iconColor: "green",
    title: "what your manifest declares",
    items: itemsDeclared(caps),
  }

  const howTo = {
    icon: pickIconForHowTo(caps),
    iconColor: "purple",
    title: "how to use it in this browser",
    items: itemsHowTo(caps, variant),
  }

  return {
    loadingStages: [
      { title: BOOKEND_STAGE_TITLE },
      { title: stageTitleSurfaces(caps) },
      { title: "how to open each surface" },
      { title: BOOKEND_STAGE_TITLE },
    ],
    instructionBoxes: [bookend, declared, howTo, bookend],
  }
}
