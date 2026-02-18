export const CONSOLE_LOGGING_REQUIREMENTS = `
<console_logging_requirements>
MANDATORY: Add console.log statements to track key events. Include the filename in each log:
- Log script initialization: console.log('[CHROMIE:filename.js] Script loaded')
- Log important operations and user interactions
- Log errors: console.error('[CHROMIE:filename.js] Error:', error)

All console.log, console.error, console.warn, and console.info MUST include the filename (e.g., [CHROMIE:background.js], [CHROMIE:newtab.js]).
</console_logging_requirements>`;

export const ICON_CONFIGURATION = `
<icon_configuration>
MANDATORY: Use ONLY these available icon files:
icons/add.png, icons/bulb.png, icons/calendar-icon.png, icons/check.png, icons/cloud-icon.png,  
icons/download.png, icons/globe.png, icons/heart-icon.png, icons/home-icon.png, icons/cross.png,
icons/icon16.png, icons/icon48.png, icons/icon128.png, icons/info.png, icons/menu-burger.png, 
icons/refresh.png, icons/search-icon.png, icons/settings-sliders.png, icons/note-icon.png,
icons/timer-icon.png, icons/trash.png, icons/user.png, icons/users-alt.png, icons/world.png
</icon_configuration>`;

export const STYLING_REQUIREMENTS = `
<styling_requirements>
MANDATORY: Create cutting-edge styles.css with modern, premium aesthetics.

Core Principles:
- Width: 340-400px | Min-height: 400px (for popups) | Spacing: 12px, 16px, 20px, 24px | Border-radius: 12px
- HTML/Body: Set margin: 0; padding: 0; width: 100%; min-height: 100%; to ensure proper container sizing
- Transitions: cubic-bezier(0.4, 0, 0.2, 1) 0.2s

Color Schemes (choose ONE and adapt to user request as needed). Use white/gray/black palettes—avoid blue, purple, or other saturated accent colors:
- Light: BG #ffffff, Surface #f5f5f5, Surface-alt #e5e5e5, Primary #171717, Text #171717/#525252
- Dark: BG #0a0a0a, Surface #262626, Surface-alt #404040, Primary #fafafa, Text #fafafa/#a3a3a3
- Glass Light: BG #ffffff, Surface rgba(0,0,0,0.04) + blur(12px), Primary #262626, Text #171717/#737373

Components:
- Typography: system-ui, -apple-system | 13px body, 18px heading, 22px hero | Weights 600+ for headings | letter-spacing: -0.02em (headings)
- Buttons: Padding 10-12px 18-24px | Radius 12px or pill (999px) | Primary: solid black/white or gray gradient | Hover: translateY(-1px) + shadow | Transition with cubic-bezier
- Inputs: Padding 10px 14px | Radius 12px | Focus: 2px gray/black border or ring (0 0 0 3px rgba(0,0,0,0.08))
- Cards: Padding 20-24px | Radius 12px | Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Glass option: border 1px rgba(255,255,255,0.18) + backdrop-filter
- Icons: MANDATORY - include in styles.css: img.icon, img[src*="icons/"], img[src*="chrome-extension://"] { max-width: 24px; max-height: 24px; width: auto; height: auto; object-fit: contain; } (PNG icons are 128-512px native; without this they render huge)

Premium Effects:
- Hover: scale(1.02) or translateY(-2px) + enhanced shadow
- Backdrop-filter: blur(12px) for overlays/glass
- Focus: Subtle gray/black ring (avoid colored glows)
- Layered shadows for realistic depth
- Custom scrollbar styling (webkit-scrollbar)
</styling_requirements>`;

export const POPUP_STYLING_REQUIREMENTS = `
<popup_styling_requirements>
CRITICAL: For popup extensions, always include these base styles to prevent UI cutoff:
html, body {
  margin: 0;
  padding: 0;
  width: 380px;
  min-height: 400px;
  overflow-x: hidden;
}
body {
  display: flex;
  flex-direction: column;
}
#app {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
</popup_styling_requirements>`;

export const CHROME_MESSAGING_API_RULES = `
<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>`;