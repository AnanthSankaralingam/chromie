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