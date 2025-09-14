export const HYPERAGENT_PROMPT = `
<hyperagent_test_script_requirements>
MANDATORY: Generate a custom HyperAgent test script that specifically tests this extension's functionality.

The HyperAgent script must be tailored to the specific extension you just created:

FOR SIDE PANEL EXTENSIONS:
- Navigate to relevant test websites if the extension targets specific sites
- Open the side panel using the extension icon or context menu
- Interact with side panel controls and buttons
- Verify side panel functionality works as expected
- Test communication between side panel and content scripts if applicable

FOR POPUP EXTENSIONS:
- Navigate to relevant test websites if the extension targets specific sites  
- Click the extension icon to open popup
- Interact with popup buttons and controls
- Verify popup functionality works correctly
- Test any webpage interactions triggered from popup

FOR OVERLAY/CONTENT SCRIPT EXTENSIONS:
- Navigate to the specific websites the extension targets
- Verify overlay elements appear on the page
- Interact with overlay buttons and controls
- Test the main functionality described in the user request
- Verify content script modifications work correctly

FOR GENERIC EXTENSIONS:
- Navigate to relevant test pages based on extension purpose
- Test the primary functionality described in the user request
- Verify all extension components work together

CUSTOMIZATION REQUIREMENTS:
1. Use the actual extension name in console logs
2. Navigate to specific URLs that are relevant to this extension's purpose
3. Include specific selectors and interactions based on the extension's UI
4. Test the exact functionality described in the user's original request
5. Include realistic test scenarios for this particular extension
6. Add specific verification steps for the extension's expected outcomes

Generate a complete, functional HyperAgent test script with:
- Specific navigation to relevant test sites (use real URLs when possible)
- Actual UI interaction steps for this extension
- Verification of the extension's specific functionality
- Proper error handling with descriptive messages
- Console logging that shows what's being tested

The script should read like a real test for this specific extension, not a generic template.

EXAMPLES OF GOOD HYPERAGENT TEST SCRIPTS:

For a YouTube video bookmarker:
\`\`\`
// Test YouTube Video Bookmarker Extension
console.log('Testing YouTube Video Bookmarker on real video page');
await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await page.waitForSelector('.extension-overlay', { timeout: 5000 });
await page.click('.bookmark-button');
await page.waitForSelector('.bookmark-success-message');
console.log('✅ Video bookmarking functionality verified');
\`\`\`

For a dark mode toggle:
\`\`\`
// Test Dark Mode Toggle Extension  
console.log('Testing Dark Mode Toggle on Wikipedia');
await page.goto('https://en.wikipedia.org/wiki/Main_Page');
const originalBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.click('[data-extension-id] button'); // Click extension icon
await page.click('.dark-mode-toggle');
await page.waitForTimeout(1000);
const newBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('✅ Dark mode toggle verified - background changed');
\`\`\`

For a price tracker:
\`\`\`
// Test Amazon Price Tracker Extension
console.log('Testing Price Tracker on Amazon product page');
await page.goto('https://www.amazon.com/dp/B08N5WRWNW');
await page.waitForSelector('.price-tracker-overlay');
await page.click('.track-price-button');
await page.waitForSelector('.tracking-confirmation');
console.log('✅ Price tracking functionality verified');
\`\`\`
</hyperagent_test_script_requirements>`