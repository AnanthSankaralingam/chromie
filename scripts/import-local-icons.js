const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ICONS_DIR = process.env.ICONS_DIR || path.join(process.cwd(), 'icons');
  const ICON_VISIBILITY = process.env.ICON_VISIBILITY || 'global';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nExample usage (Unix shells like macOS/Linux):');
    console.error('SUPABASE_URL="https://<project>.supabase.co" \\');
    console.error('SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \\');
    console.error('ICONS_DIR="./icons" \\');
    console.error('node ./scripts/import-setting-icons.js');
    console.error('\nExample usage (PowerShell):');
    console.error('$env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" node .\\scripts\\import-setting-icons.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  if (!fs.existsSync(ICONS_DIR)) {
    console.error(`Icons directory does not exist: ${ICONS_DIR}`);
    process.exit(1);
  }

  // Collect all PNG icons in the directory (generic, reusable)
  const iconFiles = fs.readdirSync(ICONS_DIR).filter((file) =>
    file.toLowerCase().endsWith('.png')
  );

  // Group icons by base name (e.g., "setting-16.png", "setting-48.png" -> "setting")
  const iconGroups = {};

  for (const fileName of iconFiles) {
    const filePath = path.join(ICONS_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Icon file not found: ${filePath}`);
      continue;
    }

    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const content_base64 = buf.toString('base64');
    
    // Extract base name and size from filename
    // Pattern: "setting-16.png" -> baseName: "setting", size: "16"
    // Pattern: "icon16.png" -> baseName: "icon", size: "16"
    // Pattern: "icon.png" -> baseName: "icon", size: null
    let baseName, size;
    
    // Try pattern with hyphen first: "name-16.png"
    const hyphenMatch = fileName.match(/^(.+)-(\d+)\.png$/i);
    if (hyphenMatch) {
      baseName = hyphenMatch[1];
      size = hyphenMatch[2];
    } else {
      // Try pattern without hyphen: "name16.png" (size at end before extension)
      const noHyphenMatch = fileName.match(/^(.+?)(\d+)\.png$/i);
      if (noHyphenMatch) {
        baseName = noHyphenMatch[1];
        size = noHyphenMatch[2];
      } else {
        // No size suffix, use filename without extension as base name
        baseName = fileName.replace(/\.png$/i, '');
        size = null;
      }
    }

    if (!iconGroups[baseName]) {
      iconGroups[baseName] = {
        baseName,
        files: []
      };
    }

    iconGroups[baseName].files.push({
      fileName,
      size,
      hash,
      content_base64,
      fileSize: buf.length
    });

    console.log(`Found: ${fileName} -> base: "${baseName}", size: ${size || 'N/A'}`);
  }

  // Consolidate grouped icons into rows
  const rows = [];

  for (const baseName in iconGroups) {
    const group = iconGroups[baseName];
    const files = group.files;

    // Extract all sizes and sort them
    const sizes = files
      .map(f => f.size)
      .filter(s => s !== null)
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Use the largest file (highest size number) for content_base64
    // If no sizes, use the first file
    const largestFile = sizes.length > 0
      ? files.find(f => f.size === sizes[sizes.length - 1])
      : files[0];

    // Create a deterministic hash based on base name and all file hashes
    const hashInput = baseName + files.map(f => f.hash).sort().join('');
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const path_hint = `icons/${baseName}.png`;
    const mime = 'image/png';
    const visibility = ICON_VISIBILITY;

    rows.push({
      hash,
      path_hint,
      sizes,
      mime,
      visibility,
      content_base64: largestFile.content_base64
    });

    console.log(`Prepared: ${path_hint} (sizes: [${sizes.join(', ')}], files: ${files.length}, hash: ${hash.substring(0, 8)}...)`);
  }

  if (rows.length === 0) {
    console.error('No icons to import. Make sure the files exist in the icons directory.');
    process.exit(1);
  }

  console.log(`\nPreparing to insert ${rows.length} icons...`);
  
  const { data, error } = await supabase
    .from('shared_icons')
    .upsert(rows, { 
      onConflict: 'path_hint,visibility',
      ignoreDuplicates: false 
    })
    .select('hash, path_hint, sizes');

  if (error) {
    console.error('Upsert failed:', error.message || error);
    process.exit(1);
  }

  console.log(`\n✅ Successfully imported ${data ? data.length : 0} icon groups:`);
  if (data) {
    data.forEach(row => {
      const sizesStr = row.sizes && row.sizes.length > 0 ? ` (sizes: [${row.sizes.join(', ')}])` : '';
      console.log(`   - ${row.path_hint}${sizesStr}`);
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
