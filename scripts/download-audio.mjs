/**
 * download-audio.mjs
 *
 * Reads all data files, finds entries that are missing an audioFile,
 * downloads the audio from YouTube using yt-dlp, saves as .webm,
 * and updates the audioFile field in the data file.
 *
 * Run: node scripts/download-audio.mjs
 * Called automatically by: .github/workflows/daily-audio.yml
 */

import { execSync, spawnSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs'
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

const MONTH_NAMES_ALB = [
  'Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
  'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'
]

function getYtDlpPath() {
  for (const c of ['yt-dlp', 'yt-dlp.exe']) {
    try {
      execSync(`${c} --version`, { stdio: 'pipe' })
      return c
    } catch {}
  }
  return 'yt-dlp'
}

function parseEntries(content) {
  // Extract all entry objects from the JS data file using regex
  const entries = []
  const re = /\{[^{}]*"videoId"[^{}]*\}/gs
  for (const match of content.matchAll(re)) {
    try {
      // Convert JS object-ish to valid JSON for parsing
      const json = match[0]
        .replace(/\/\/[^\n]*/g, '')   // remove comments
        .replace(/,\s*\}/g, '}')      // trailing commas
      const obj = JSON.parse(json)
      if (obj.videoId) entries.push(obj)
    } catch {}
  }
  return entries
}

const ytdlp = getYtDlpPath()
let anyDownloaded = false

for (let i = 0; i < MONTH_KEYS.length; i++) {
  const monthKey = MONTH_KEYS[i]
  const monthName = MONTH_NAMES_ALB[i]
  const filePath = join(DATA_DIR, `${monthKey}.js`)

  if (!existsSync(filePath)) continue

  let content = readFileSync(filePath, 'utf8')

  // Find all entries with a videoId but no audioFile field
  // We do a line-by-line search for entries missing audioFile
  const entryRegex = /\{[\s\S]*?"videoId":\s*"([^"]+)"[\s\S]*?\}/g
  let match
  let updated = false

  while ((match = entryRegex.exec(content)) !== null) {
    const entryStr = match[0]
    const videoId = match[1]

    // Skip if audioFile already present in this entry block
    if (entryStr.includes('"audioFile"')) continue

    // Find the day number for the filename
    const dayMatch = entryStr.match(/"day":\s*(\d+)/)
    if (!dayMatch) continue
    const day = dayMatch[1]

    const audioFilename = `${monthKey}-${day}.webm`
    const audioPath = join(AUDIO_DIR, audioFilename)

    // Skip if file already exists on disk
    if (existsSync(audioPath)) {
      console.log(`  ℹ ${audioFilename} already on disk — adding to data file`)
    } else {
      console.log(`⬇ Downloading audio for ${day} ${monthName} (${videoId})…`)
      const result = spawnSync(
        ytdlp,
        [
          '-x',
          '--audio-format', 'opus',
          '-o', audioPath.replace('.webm', '.%(ext)s'),
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        { encoding: 'utf8', stdio: 'inherit' }
      )

      // yt-dlp saves as .opus then we rename to .webm
      const opusPath = audioPath.replace('.webm', '.opus')
      if (existsSync(opusPath)) {
        const { renameSync } = await import('fs')
        renameSync(opusPath, audioPath)
        console.log(`  ✓ Saved as ${audioFilename}`)
      } else if (!existsSync(audioPath)) {
        console.warn(`  ✗ Download failed for ${videoId} — skipping`)
        continue
      }
    }

    // Insert audioFile field into the data file after the videoId line
    content = content.replace(
      `"videoId": "${videoId}"`,
      `"videoId": "${videoId}",\n    "audioFile": "${audioFilename}"`
    )
    updated = true
    anyDownloaded = true
    console.log(`  ✓ Updated data file with audioFile: ${audioFilename}`)
  }

  if (updated) {
    writeFileSync(filePath, content, 'utf8')
    console.log(`✓ Saved ${monthKey}.js`)
  }
}

if (!anyDownloaded) {
  console.log('✅ All entries already have audio — nothing to do.')
} else {
  console.log('\n✅ Done. New audio files ready to commit.')
}
