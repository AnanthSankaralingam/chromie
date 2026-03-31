/**
 * Update the default extension icons (icon16, icon48, icon128) in Supabase shared_icons.
 * Use this after replacing public/icons/icon16.png, icon48.png, icon128.png with the new Chromie logo.
 *
 * Usage (macOS):
 *   SUPABASE_URL="https://<project>.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<key>" \
 *   node scripts/update-default-extension-icons.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ICON_FILES = ['icon16.png', 'icon48.png', 'icon128.png'];

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ICONS_DIR = process.env.ICONS_DIR || path.join(process.cwd(), 'public', 'icons');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nUsage (macOS):');
    console.error('SUPABASE_URL="https://<project>.supabase.co" \\');
    console.error('SUPABASE_SERVICE_ROLE_KEY="<key>" \\');
    console.error('node scripts/update-default-extension-icons.js');
    process.exit(1);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    console.error(`Icons directory not found: ${ICONS_DIR}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const rows = [];
  for (const fileName of ICON_FILES) {
    const filePath = path.join(ICONS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing: ${filePath}`);
      process.exit(1);
    }
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const content_base64 = buf.toString('base64');
    const size = fileName.replace(/\D/g, '');
    const path_hint = `icons/${fileName}`;

    rows.push({
      hash,
      path_hint,
      sizes: size ? [size] : [],
      mime: 'image/png',
      visibility: 'global',
      content_base64
    });
    console.log(`Prepared: ${path_hint}`);
  }

  const { data, error } = await supabase
    .from('shared_icons')
    .upsert(rows, {
      onConflict: 'path_hint,visibility',
      ignoreDuplicates: false
    })
    .select('path_hint');

  if (error) {
    console.error('Upsert failed:', error.message || error);
    process.exit(1);
  }

  console.log('\n✅ Default extension icons updated in Supabase shared_icons:');
  (data || []).forEach((r) => console.log(`   - ${r.path_hint}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
