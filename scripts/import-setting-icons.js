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
    console.error('$env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" node .\\scripts\\import-setting-icons.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // The three setting icons to import
  const iconFiles = ['setting-16.png', 'setting-48.png', 'setting-128.png'];
  const rows = [];

  for (const fileName of iconFiles) {
    const filePath = path.join(ICONS_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Icon file not found: ${filePath}`);
      continue;
    }

    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const content_base64 = buf.toString('base64');
    
    // Extract size from filename (e.g., "setting-16.png" -> "16")
    const sizeMatch = fileName.match(/(\d+)\.png$/);
    const sizes = sizeMatch ? [sizeMatch[1]] : [];
    
    // Preserve original filename in path_hint
    const path_hint = `icons/${fileName}`;
    const mime = 'image/png';
    const visibility = 'global';

    rows.push({
      hash,
      path_hint,
      sizes,
      mime,
      visibility,
      content_base64
    });

    console.log(`Prepared: ${path_hint} (size: ${sizes[0] || 'N/A'}, hash: ${hash.substring(0, 8)}...)`);
  }

  if (rows.length === 0) {
    console.error('No icons to import. Make sure the files exist in the icons directory.');
    process.exit(1);
  }

  console.log(`\nPreparing to insert ${rows.length} icons...`);
  
  const { data, error } = await supabase
    .from('shared_icons')
    .upsert(rows, { 
      onConflict: 'hash',
      ignoreDuplicates: false 
    })
    .select('hash, path_hint');

  if (error) {
    console.error('Upsert failed:', error.message || error);
    process.exit(1);
  }

  console.log(`\n✅ Successfully imported ${data ? data.length : 0} icons:`);
  if (data) {
    data.forEach(row => {
      console.log(`   - ${row.path_hint}`);
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
