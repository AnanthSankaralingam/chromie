const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    template: null,
    all: false,
    dryRun: false,
    templatesDir: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && i + 1 < args.length) {
      options.template = args[i + 1];
      i++;
    } else if (args[i] === '--templates-dir' && i + 1 < args.length) {
      options.templatesDir = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      options.all = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  // Default to --all if no template specified
  if (!options.template && !options.all) {
    options.all = true;
  }

  // Default to current project templates directory if not specified
  if (!options.templatesDir) {
    options.templatesDir = path.join(process.cwd(), 'src', 'lib', 'data', 'templates');
  } else {
    // Resolve relative paths to absolute
    options.templatesDir = path.isAbsolute(options.templatesDir) 
      ? options.templatesDir 
      : path.resolve(process.cwd(), options.templatesDir);
  }

  return options;
}

// Load template metadata from all_templates.json
function loadTemplateMetadata(templatesDir) {
  const metadataPath = path.join(templatesDir, 'all_templates.json');
  
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Template metadata file not found: ${metadataPath}`);
  }

  const content = fs.readFileSync(metadataPath, 'utf-8');
  return JSON.parse(content);
}

// Recursively read all files from a template directory
function readTemplateFiles(templateName, frontendType, templatesDir) {
  const templateDir = path.join(templatesDir, templateName, frontendType);

  if (!fs.existsSync(templateDir)) {
    console.warn(`⚠️  Template directory not found: ${templateDir}`);
    return {};
  }

  const templateFiles = {};

  function readDirectory(dirPath, relativePath = '') {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const fileRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Recursively read subdirectories
        readDirectory(fullPath, fileRelativePath);
      } else if (entry.isFile()) {
        // Read file content
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          templateFiles[fileRelativePath] = content;
        } catch (error) {
          console.error(`❌ Error reading file ${fileRelativePath}:`, error.message);
        }
      }
    }
  }

  readDirectory(templateDir);
  return templateFiles;
}

// Migrate a single template/frontend combination to database
async function migrateTemplate(supabase, templateName, frontendType, files, dryRun = false) {
  if (Object.keys(files).length === 0) {
    console.log(`   ⚠️  No files found for ${templateName}/${frontendType}`);
    return { inserted: 0, updated: 0 };
  }

  console.log(`   📄 Found ${Object.keys(files).length} files`);

  // Prepare rows for upsert
  const rows = Object.entries(files).map(([filePath, content]) => ({
    template_name: templateName,
    frontend_type: frontendType,
    file_path: filePath,
    content: content
  }));

  if (dryRun) {
    console.log(`   🔍 [DRY RUN] Would insert/update ${rows.length} files:`);
    rows.forEach(row => {
      console.log(`      - ${row.file_path}`);
    });
    return { inserted: rows.length, updated: 0 };
  }

  // Upsert files (insert or update if exists)
  // Using upsert - Supabase will use the unique constraint automatically
  const { data, error } = await supabase
    .from('extension_templates')
    .upsert(rows, {
      onConflict: 'template_name,frontend_type,file_path'
    })
    .select('id');

  if (error) {
    console.error(`   ❌ Error upserting files:`, error.message);
    throw error;
  }

  const count = data ? data.length : 0;
  console.log(`   ✅ Upserted ${count} files`);
  return { inserted: count, updated: 0 };
}

// Migrate a single template (all frontend types)
async function migrateSingleTemplate(supabase, templateName, templatesMetadata, templatesDir, dryRun = false) {
  const template = templatesMetadata.find(t => t.title === templateName);
  
  if (!template) {
    console.error(`❌ Template "${templateName}" not found in all_templates.json`);
    return { inserted: 0, updated: 0 };
  }

  console.log(`\n📦 Migrating template: ${templateName}`);
  console.log(`   Category: ${template.category}`);
  console.log(`   Frontend types: ${template.supported_frontend_types.join(', ')}`);

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const frontendType of template.supported_frontend_types) {
    console.log(`\n   🎨 Frontend type: ${frontendType}`);
    
    const files = readTemplateFiles(templateName, frontendType, templatesDir);
    const result = await migrateTemplate(supabase, templateName, frontendType, files, dryRun);
    
    totalInserted += result.inserted;
    totalUpdated += result.updated;
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

// Migrate all templates
async function migrateAllTemplates(supabase, templatesMetadata, templatesDir, dryRun = false) {
  console.log(`\n🚀 Migrating all templates (${templatesMetadata.length} templates found)\n`);

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const template of templatesMetadata) {
    const result = await migrateSingleTemplate(supabase, template.title, templatesMetadata, templatesDir, dryRun);
    totalInserted += result.inserted;
    totalUpdated += result.updated;
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const options = parseArgs();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('PowerShell usage:');
    console.error('$env:SUPABASE_URL="https://<project>.supabase.co" $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" node .\\scripts\\migrate-templates.js [--template <name> | --all] [--templates-dir <path>] [--dry-run]');
    console.error('\nOptions:');
    console.error('  --template <name>     Migrate specific template only');
    console.error('  --all                Migrate all templates (default)');
    console.error('  --templates-dir <path>  Custom templates directory path (default: src/lib/data/templates)');
    console.error('  --dry-run            Preview without inserting to database');
    process.exit(1);
  }

  // Validate templates directory exists
  if (!fs.existsSync(options.templatesDir)) {
    console.error(`❌ Templates directory not found: ${options.templatesDir}`);
    process.exit(1);
  }

  console.log(`📁 Using templates directory: ${options.templatesDir}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Load template metadata
  let templatesMetadata;
  try {
    templatesMetadata = loadTemplateMetadata(options.templatesDir);
    console.log(`📋 Loaded ${templatesMetadata.length} template(s) from metadata`);
  } catch (error) {
    console.error('Failed to load template metadata:', error.message);
    process.exit(1);
  }

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made to the database\n');
  }

  // Migrate templates
  let result;
  try {
    if (options.template) {
      result = await migrateSingleTemplate(supabase, options.template, templatesMetadata, options.templatesDir, options.dryRun);
    } else {
      result = await migrateAllTemplates(supabase, templatesMetadata, options.templatesDir, options.dryRun);
    }

    console.log('\n' + '='.repeat(50));
    if (options.dryRun) {
      console.log(`🔍 DRY RUN COMPLETE`);
      console.log(`   Would insert/update: ${result.inserted} files`);
    } else {
      console.log(`✅ MIGRATION COMPLETE`);
      console.log(`   Inserted/Updated: ${result.inserted} files`);
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
