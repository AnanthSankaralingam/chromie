const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ICONS_DIR = process.env.ICONS_DIR || path.join(process.cwd(), 'icons');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('PowerShell usage:');
    console.error('$env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" $env:ICONS_DIR="c:\\Users\\shank\\chromie\\icons" node .\\scripts\\migrate-shared-icons.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const exists = fs.existsSync(ICONS_DIR);
  if (!exists) {
    console.error(`Icons directory not found: ${ICONS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(ICONS_DIR, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name).filter(n => n.toLowerCase().endsWith('.png'));
  if (files.length === 0) {
    console.log('No .png icons found.');
    return;
  }

  const rows = [];
  for (const fileName of files) {
    const filePath = path.join(ICONS_DIR, fileName);
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const content_base64 = buf.toString('base64');
    const digits = fileName.match(/\d+/g) || [];
    const sizes = Array.from(new Set(digits)).map(String);
    const path_hint = path.posix.join('icons', fileName.replace(/\\/g, '/'));
    const mime = 'image/png';
    const visibility = 'global';

    // Create separate rows for each icon size referenced in the filename
    if (sizes.length > 0) {
      for (const size of sizes) {
        const sizePathHint = `icons/icon${size}.png`;
        // Create unique hash by combining file hash with size-specific path
        const sizeHash = crypto.createHash('sha256').update(hash + sizePathHint).digest('hex');
        rows.push({ 
          hash: sizeHash, 
          path_hint: sizePathHint, 
          sizes: [size], 
          mime, 
          visibility, 
          content_base64 
        });
      }
    } else {
      // For files without size numbers, use the original filename
      rows.push({ hash, path_hint, sizes, mime, visibility, content_base64 });
    }
  }

  console.log(`Preparing to insert ${rows.length} icons (from ${files.length} files)...`);
  const { data, error } = await supabase
    .from('shared_icons')
    .insert(rows, { onConflict: 'hash', ignoreDuplicates: true })
    .select('hash');

  if (error) {
    console.error('Upsert failed:', error.message || error);
    process.exit(1);
  }

  console.log(`Upserted ${data ? data.length : 0} icons.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

// PowerShell usage:
// $env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" $env:ICONS_DIR="c:\Users\shank\chromie\icons" node .\scripts\migrate-shared-icons.js


