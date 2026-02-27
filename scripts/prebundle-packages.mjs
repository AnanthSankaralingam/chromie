#!/usr/bin/env node

/**
 * Pre-bundle whitelisted npm packages into self-contained ESM files
 * using native esbuild. These are generated artifacts (gitignored)
 * that get rebuilt on each deploy.
 *
 * Usage: node scripts/prebundle-packages.mjs
 */

import { build } from 'esbuild'
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const ROOT = join(__dirname, '..')
const VENDOR_DIR = join(ROOT, 'src', 'lib', 'build', 'vendor')
const WHITELIST_PATH = join(ROOT, 'src', 'lib', 'data', 'npm-package-whitelist.json')

const whitelist = JSON.parse(readFileSync(WHITELIST_PATH, 'utf-8'))

// Packages that need explicit browser entry points. Use package.json resolution
// (always exported) + relative path, since subpaths like uuid/dist/... are
// not in the package's exports field.
const BROWSER_ENTRY_OVERRIDES = {
  uuid: (pkgRoot) => join(pkgRoot, 'dist', 'esm-browser', 'index.js'),
  nanoid: (pkgRoot) => join(pkgRoot, 'index.browser.js'),
  // jszip: lib/ resolves readable-stream -> readable-stream-browser.js which requires Node's "stream".
  // Use pre-built dist/jszip.min.js (UMD) instead — already bundled for browser.
  jszip: (pkgRoot) => join(pkgRoot, 'dist', 'jszip.min.js'),
}

// Packages that only have named exports — add default export so "import X from 'pkg'" works
const PACKAGES_NEED_DEFAULT_EXPORT = ['pdfjs-dist']

// Clean and recreate vendor directory
rmSync(VENDOR_DIR, { recursive: true, force: true })
mkdirSync(VENDOR_DIR, { recursive: true })

console.log(`📦 Pre-bundling ${whitelist.length} whitelisted packages...\n`)

const results = []
const errors = []

for (const pkg of whitelist) {
  const outFile = join(VENDOR_DIR, `${pkg.name.replace('/', '__')}@${pkg.version}.js`)

  try {
    // Resolve the package entry point from node_modules
    let entryPoint
    try {
      const overrideFn = BROWSER_ENTRY_OVERRIDES[pkg.name]
      if (overrideFn) {
        const pkgJsonPath = require.resolve(`${pkg.name}/package.json`)
        const pkgRoot = dirname(pkgJsonPath)
        entryPoint = overrideFn(pkgRoot)
      } else {
        entryPoint = require.resolve(pkg.name)
      }
    } catch {
      console.warn(`  ⚠️  ${pkg.name}@${pkg.version} — not installed, skipping`)
      errors.push({ name: pkg.name, error: 'not installed' })
      continue
    }

    await build({
      entryPoints: [entryPoint],
      outfile: outFile,
      bundle: true,
      minify: true,
      format: 'esm',
      target: ['es2020'],
      platform: 'browser',
      // Use browser conditions to resolve browser-specific entry points
      conditions: ['browser', 'import', 'default'],
      // Suppress warnings about CommonJS to ESM conversion
      logLevel: 'error',
    })

    // Add default export for packages that only have named exports (e.g. pdfjs-dist)
    if (PACKAGES_NEED_DEFAULT_EXPORT.includes(pkg.name)) {
      let content = readFileSync(outFile, 'utf-8')
      if (!content.includes('export default')) {
        const match = content.match(/export\s*\{([^}]+)\}\s*;?\s*$/)
        if (match) {
          const exportNames = match[1]
            .split(',')
            .map((s) => {
              const asMatch = s.trim().match(/\s+as\s+(\w+)$/)
              return asMatch ? asMatch[1] : s.trim().split(/\s/)[0]
            })
            .filter(Boolean)
          if (exportNames.length > 0) {
            content += `\nexport default {${exportNames.join(',')}};`
            writeFileSync(outFile, content)
          }
        }
      }
    }

    results.push({ name: pkg.name, version: pkg.version, file: `${pkg.name.replace('/', '__')}@${pkg.version}.js` })
    console.log(`  ✅ ${pkg.name}@${pkg.version}`)
  } catch (err) {
    console.error(`  ❌ ${pkg.name}@${pkg.version} — ${err.message}`)
    errors.push({ name: pkg.name, error: err.message })
  }
}

// Generate index file that exports a Map of package name → { version, file }
const indexLines = [
  '/**',
  ' * Auto-generated vendor package index',
  ' * DO NOT EDIT — regenerate with: npm run prebundle',
  ' */',
  '',
  '// Map of package name → pre-bundled module content (as string)',
  '// Loaded lazily on first access to avoid reading all files at startup',
  '',
  'const VENDOR_MANIFEST = new Map([',
]

for (const r of results) {
  indexLines.push(`  ['${r.name}', { version: '${r.version}', file: '${r.file}' }],`)
}

indexLines.push('])')
indexLines.push('')
indexLines.push('export default VENDOR_MANIFEST')
indexLines.push('')

writeFileSync(join(VENDOR_DIR, 'index.js'), indexLines.join('\n'))

console.log(`\n✅ Bundled ${results.length}/${whitelist.length} packages`)
if (errors.length > 0) {
  console.log(`⚠️  ${errors.length} package(s) failed — extension builds will skip these`)
}
console.log(`📁 Output: src/lib/build/vendor/`)
