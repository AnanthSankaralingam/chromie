const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Icon files to update
const icons = [
  { path: 'icons/icon16.png', sizes: ['16'] },
  { path: 'icons/icon48.png', sizes: ['48'] },
  { path: 'icons/icon128.png', sizes: ['128'] }
];

async function updateIcon(iconPath, sizes) {
  const fullPath = path.join(__dirname, iconPath);

  console.log(`Reading ${iconPath}...`);
  const fileBuffer = fs.readFileSync(fullPath);
  const base64Content = fileBuffer.toString('base64');
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  console.log(`  Hash: ${hash}`);
  console.log(`  Size: ${fileBuffer.length} bytes`);

  // Check if icon with this path_hint already exists
  const { data: existingIcon } = await supabase
    .from('shared_icons')
    .select('hash')
    .eq('path_hint', iconPath)
    .eq('visibility', 'global')
    .single();

  let result;
  if (existingIcon) {
    // Update existing icon
    console.log(`  Updating existing icon...`);
    result = await supabase
      .from('shared_icons')
      .update({
        hash: hash,
        sizes: sizes,
        mime: 'image/png',
        content_base64: base64Content
      })
      .eq('path_hint', iconPath)
      .eq('visibility', 'global');
  } else {
    // Insert new icon
    console.log(`  Inserting new icon...`);
    result = await supabase
      .from('shared_icons')
      .insert({
        hash: hash,
        path_hint: iconPath,
        sizes: sizes,
        mime: 'image/png',
        visibility: 'global',
        content_base64: base64Content
      });
  }

  if (result.error) {
    console.error(`  Error updating ${iconPath}:`, result.error);
    return false;
  }

  console.log(`  ✓ Successfully updated ${iconPath}`);
  return true;
}

async function main() {
  console.log('Starting icon update...\n');

  let successCount = 0;
  for (const icon of icons) {
    const success = await updateIcon(icon.path, icon.sizes);
    if (success) successCount++;
    console.log('');
  }

  console.log(`\nCompleted: ${successCount}/${icons.length} icons updated successfully`);
}

main().catch(console.error);
