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
      "use the toolbar puzzle icon and extension menu to explore.",
      "visit normal sites to exercise content scripts.",
    ]
  }

  if (caps.hasSidePanel) {
    items.push("click your extension toolbar icon to open the side panel.")
  }
  if (caps.hasPopup && items.length < 3) {
    items.push("click your extension toolbar icon to open the popup.")
  }
  if (caps.hasOptions && items.length < 3) {
    items.push(
      caps.optionsOpenInTab
        ? "open extension options from the extension menu (it opens in a tab)."
        : "open extension options from the extension menu."
    )
  }
  if (caps.hasNewTabOverride && items.length < 3) {
    items.push("open a new tab to see your extension's new tab page.")
  }
  if (caps.hasBookmarksOverride && items.length < 3) {
    items.push("open bookmarks to test your extension's bookmarks page.")
  }
  if (caps.hasHistoryOverride && items.length < 3) {
    items.push("open history to test your extension's history page.")
  }
  if (caps.hasContentScripts && items.length < 3) {
    items.push("visit matching websites to trigger your content scripts.")
  }
  if (caps.hasBackground && items.length < 3) {
    items.push("keep this session open while background tasks run.")
  }
  if (caps.hasDevtoolsPage && items.length < 3) {
    items.push("open DevTools on a tab to test your extension.")
  }
  if (caps.hasOmnibox && items.length < 3) {
    items.push("type your extension keyword in the address bar.")
  }

  if (items.length === 0) {
    return [
      "we didn't find a popup, side panel, or page override in this build.",
      "open the puzzle menu to see what actions are available.",
      "if you use content scripts, browse matching sites to trigger them.",
    ]
  }

  if (items.length === 1) {
    items.push("use the same clicks and menus you use in desktop chrome.")
    items.push("permissions still follow your extension setup.")
  } else if (items.length === 2) {
    items.push("this follows the same toolbar flow as desktop chrome.")
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
    items.push("side panel: click your extension toolbar icon, then open side panel.")
  }
  if (caps.hasPopup && items.length < 3) {
    items.push("popup: use the puzzle icon, or pin your extension.")
  }
  if (caps.hasOptions && items.length < 3) {
    items.push(
      caps.optionsOpenInTab
        ? "options: open from the extensions menu (opens in a tab)."
        : "options: right-click extension icon → options."
    )
  }
  if (caps.hasNewTabOverride && items.length < 3) {
    items.push("new tab page: open a new tab — your override loads in this session.")
  }
  if (caps.hasBookmarksOverride && items.length < 3) {
    items.push("bookmarks: open bookmarks manager to test your page.")
  }
  if (caps.hasHistoryOverride && items.length < 3) {
    items.push("history: open history to test your page.")
  }
  if (caps.hasContentScripts && items.length < 3) {
    items.push("content scripts: visit matching sites to trigger them.")
  }
  if (caps.hasDevtoolsPage && items.length < 3) {
    items.push("devtools: open DevTools on a tab to test your extension.")
  }
  if (caps.hasOmnibox && items.length < 3) {
    items.push("omnibox: type your keyword in the address bar.")
  }
  if (caps.hasBackground && items.length < 3) {
    items.push("background: keep this session open while tasks run.")
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
      "test it like a user would.",
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
    title: "where to click first",
    items: itemsDeclared(caps),
  }

  const howTo = {
    icon: pickIconForHowTo(caps),
    iconColor: "purple",
    title: "how to test your extension",
    items: itemsHowTo(caps, variant),
  }

  return {
    loadingStages: [
      { title: bookend.title },
      { title: declared.title },
      { title: howTo.title },
      { title: bookend.title },
    ],
    instructionBoxes: [bookend, declared, howTo, bookend],
  }
}
