#!/usr/bin/env node
/**
 * Test script to send a welcome email. Run: node --env-file=.env scripts/send-test-welcome-email.mjs
 * Or: node scripts/send-test-welcome-email.mjs (loads .env manually if --env-file not available)
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const envPath = join(root, '.env')

if (existsSync(envPath) && !process.env.RESEND_API_KEY) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[key] = val
      }
    }
  })
}

const { default: emailService } = await import('../src/lib/services/email-service.js')

const result = await emailService.sendWelcomeEmail({
  email: 'amistry3121@gmail.com',
  name: 'Test User',
  user_metadata: { full_name: 'Test User' }
})

console.log(result.success ? 'Email sent successfully!' : 'Failed:', result.error)
