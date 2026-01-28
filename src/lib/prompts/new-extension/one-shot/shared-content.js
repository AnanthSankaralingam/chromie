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
- Width: 340-400px | Spacing: 12px, 16px, 20px, 24px | Border-radius: 12px
- Transitions: cubic-bezier(0.4, 0, 0.2, 1) 0.2s

Color Schemes (choose ONE):
- Glass Dark: BG #0f172a, Surface rgba(255,255,255,0.1) + blur(12px), Primary #818cf8, Text #f1f5f9/#94a3b8
- Sophisticated: Accent #0ea5e9/#8b5cf6, BG #18181b/#ffffff, Surface #27272a/#f4f4f5
- Vibrant: Gradient primary (#6366f1→#8b5cf6), BG #fafafa, Text #0f172a/#64748b

Components:
- Typography: system-ui, -apple-system | 13px body, 18px heading, 22px hero | Weights 600+ for headings | letter-spacing: -0.02em (headings)
- Buttons: Padding 10-12px 18-24px | Radius 12px or pill (999px) | Primary: gradient + white text | Hover: translateY(-1px) + shadow | Transition with cubic-bezier
- Inputs: Padding 10px 14px | Radius 12px | Focus: 2px primary border or ring (0 0 0 3px rgba(primary, 0.1))
- Cards: Padding 20-24px | Radius 12px | Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Glass option: border 1px rgba(255,255,255,0.18) + backdrop-filter

Premium Effects:
- Hover: scale(1.02) or translateY(-2px) + enhanced shadow
- Backdrop-filter: blur(12px) for overlays/glass
- Focus: Glowing ring with primary color
- Layered shadows for realistic depth
- Custom scrollbar styling (webkit-scrollbar)
</styling_requirements>`;