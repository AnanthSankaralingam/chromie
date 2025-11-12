/**
 * Export Project Descriptions from Supabase
 *
 * This script exports project descriptions from the projects table to a CSV file.
 * It excludes specific test/admin user IDs and includes all projects (including archived).
 *
 * PowerShell Usage:
 * $env:SUPABASE_URL="https://bxzxoixtutqpmqjkjvbh.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"; node scripts/export-project-descriptions.js
 *
 * Output: project-descriptions-YYYY-MM-DD-HHmmss.csv
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Excluded user IDs (test/admin accounts)
const EXCLUDED_USER_IDS = [
  '9a8f99bf-1bd4-4981-818f-66c9b12c902d',
  '7dd57b8f-0771-418d-b0f9-db0277f7b475',
  '4b177790-b70b-47e9-bd25-1979d24770fe'
];

// Initialize Supabase client with service role key (bypasses RLS)
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

// Escape CSV field (handle quotes and commas)
function escapeCSV(field) {
  if (field === null || field === undefined) {
    return '';
  }

  // Convert to string and replace all newlines with spaces
  let stringField = String(field).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

  // If field contains comma or quote, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

// Generate timestamped filename
function generateFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `project-descriptions-${year}-${month}-${day}-${hours}${minutes}${seconds}.csv`;
}

// Main export function
async function exportProjectDescriptions() {
  console.log('Starting project descriptions export...\n');

  try {
    const supabase = initSupabase();

    // Query projects table, excluding specified user IDs
    console.log('Fetching projects from Supabase...');
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, user_id, name, description, has_generated_code, created_at, archived')
      .not('user_id', 'in', `(${EXCLUDED_USER_IDS.join(',')})`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    console.log(`Found ${projects.length} projects (excluding ${EXCLUDED_USER_IDS.length} admin/test users)\n`);

    // Prepare CSV content
    const headers = ['Project Name', 'Description', 'Has Generated Code', 'Created At', 'Archived', 'User ID', 'Project ID'];
    const csvRows = [headers.join(',')];

    // Add data rows
    projects.forEach(project => {
      const row = [
        escapeCSV(project.name),
        escapeCSV(project.description),
        escapeCSV(project.has_generated_code),
        escapeCSV(project.created_at),
        escapeCSV(project.archived),
        escapeCSV(project.user_id),
        escapeCSV(project.id)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Save to file
    const filename = generateFilename();
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log(`✓ Export successful!`);
    console.log(`✓ File saved: ${filename}`);
    console.log(`✓ Total projects exported: ${projects.length}`);

    // Summary stats
    const activeProjects = projects.filter(p => !p.archived).length;
    const archivedProjects = projects.filter(p => p.archived).length;
    const withDescription = projects.filter(p => p.description && p.description.trim().length > 0).length;

    console.log(`\nSummary:`);
    console.log(`  - Active projects: ${activeProjects}`);
    console.log(`  - Archived projects: ${archivedProjects}`);
    console.log(`  - With descriptions: ${withDescription}`);

  } catch (error) {
    console.error('Error during export:', error.message);
    process.exit(1);
  }
}

// Run the export
exportProjectDescriptions();
