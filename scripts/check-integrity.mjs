/**
 * check-integrity.mjs
 *
 * Scans all data files and audio directory for problems:
 *   - Entries missing videoId
 *   - Entries missing audioFile field in data
 *   - Entries whose audioFile is listed but the .webm doesn't exist on disk
 *   - Duplicate day numbers within a month
 *
 * Exits with code 1 and prints a report if any issues are found.
 * Exits with code 0 and a ✅ message if everything looks good.
 *
 * Run: node scripts/check-integrity.mjs
 * Called by: .github/workflows/daily-rebuild.yml
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const AUDIO_DIR = join(ROOT, 'public', 'audio')

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

const issues = []
const info = []

// ── Check each month data file ────────────────────────────────────────────────

for (const monthKey of MONTH_KEYS) {
  const filePath = join(DATA_DIR, `${monthKey}.js`)
  if (!existsSync(filePath)) continue

  const content = readFileSync(filePath, 'utf8')
  const match = content.match(/export const \w+ = (\[[\s\S]*\])/)
  if (!match) {
    issues.push(`❌ ${monthKey}.js: could not parse export array`)
    continue
  }

  let entries
  try {
    entries = JSON.parse(match[1])
  } catch (e) {
    issues.push(`❌ ${monthKey}.js: JSON parse error — ${e.message}`)
    continue
  }

  info.push(`  ${monthKey}.js — ${entries.length} days`)

  const seenDays = new Set()
  for (const entry of entries) {
    const label = `${monthKey} day ${entry.day}`

    // Duplicate days
    if (seenDays.has(entry.day)) {
      issues.push(`❌ ${label}: duplicate day number`)
    }
    seenDays.add(entry.day)

    // Missing videoId
    if (!entry.videoId) {
      issues.push(`❌ ${label}: missing videoId`)
    }

    // Empty readings (chapters failed to fetch)
    if (!entry.readings || entry.readings.length === 0) {
      issues.push(`❌ ${label} (videoId: ${entry.videoId}): empty readings — chapter fetch likely failed`)
    }

    // Missing audioFile field
    if (!entry.audioFile) {
      issues.push(`⚠️  ${label} (videoId: ${entry.videoId}): missing audioFile in data`)
      continue
    }

    // audioFile listed but .webm missing on disk
    const audioPath = join(AUDIO_DIR, entry.audioFile)
    if (!existsSync(audioPath)) {
      issues.push(`⚠️  ${label}: audioFile "${entry.audioFile}" listed but file not found on disk`)
    }
  }
}

// ── Check for orphaned audio files (on disk but not referenced) ───────────────

if (existsSync(AUDIO_DIR)) {
  const referencedFiles = new Set()
  for (const monthKey of MONTH_KEYS) {
    const filePath = join(DATA_DIR, `${monthKey}.js`)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    for (const m of content.matchAll(/"audioFile":\s*"([^"]+)"/g)) {
      referencedFiles.add(m[1])
    }
  }

  const diskFiles = readdirSync(AUDIO_DIR).filter(f => f.endsWith('.webm'))
  for (const f of diskFiles) {
    if (!referencedFiles.has(f)) {
      info.push(`  ℹ️  Orphaned audio file (not in any data file): ${f}`)
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('📋 Integrity check summary:')
for (const line of info) console.log(line)
console.log('')

if (issues.length === 0) {
  console.log('✅ All checks passed — no issues found.')
  process.exit(0)
} else {
  console.log(`🚨 Found ${issues.length} issue(s):\n`)
  for (const issue of issues) console.log('  ' + issue)
  console.log('')
  // Write issues to a file so the workflow can read them for the email body
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(join(ROOT, 'integrity-report.txt'), issues.join('\n'), 'utf8')
  })
  process.exit(1)
}
