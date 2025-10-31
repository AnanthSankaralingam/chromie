const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), 'icons');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('PowerShell usage:');
    console.error('$env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" $env:OUTPUT_DIR="c:\\Users\\shank\\chromie\\debug-icons" node .\\scripts\\fetch-shared-icons-debug.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  console.log('Fetching all shared icons from database...');
  
  // Fetch all global icons
  const { data: iconRows, error } = await supabase
    .from('shared_icons')
    .select('path_hint, content_base64, visibility, sizes, mime, hash')
    .eq('visibility', 'global');

  if (error) {
    console.error('Failed to fetch shared icons:', error);
    process.exit(1);
  }

  if (!iconRows || iconRows.length === 0) {
    console.log('No shared icons found in database.');
    return;
  }

  console.log(`Found ${iconRows.length} global shared icons.`);
  console.log('\nSaving icons locally...\n');

  let savedCount = 0;
  let skippedCount = 0;

  for (const icon of iconRows) {
    try {
      const { path_hint, content_base64, visibility } = icon;
      
      // Decode base64 content
      const buffer = Buffer.from(content_base64, 'base64');
      
      // Create local file path
      // path_hint is like "icons/icon16.png", so we'll save it as debug-icons/icons/icon16.png
      const localPath = path.join(OUTPUT_DIR, path_hint);
      const localDir = path.dirname(localPath);
      
      // Create directory structure if needed
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      
      // Check if file already exists
      if (fs.existsSync(localPath)) {
        console.log(`[SKIP] ${path_hint} (already exists)`);
        skippedCount++;
        continue;
      }
      
      // Write file
      fs.writeFileSync(localPath, buffer);
      console.log(`[SAVED] ${path_hint} (${visibility}, ${buffer.length} bytes)`);
      savedCount++;
    } catch (e) {
      console.error(`[ERROR] Failed to save icon ${icon.path_hint}:`, e.message);
    }
  }

  console.log('\n========================================');
  console.log(`Total icons found: ${iconRows.length}`);
  console.log(`Icons saved: ${savedCount}`);
  console.log(`Icons skipped (already exist): ${skippedCount}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});