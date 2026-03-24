/**
 * fetch-playlist.mjs
 *
 * Uses the YouTube RSS feed (never blocked) to discover new videos,
 * then uses yt-dlp only for individual new videos to get chapter timestamps.
 *
 * Run: node scripts/fetch-playlist.mjs
 * Called automatically by: .github/workflows/daily-rebuild.yml
 */

import { execSync, spawnSync } from 'child_process'
import { writeFileSync, readFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'src', 'data')

const PLAYLIST_ID = 'PL-20shMe4LIKvWmIz3sSlq_RH-IaqIR5_'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`

// Albanian month names → key used in the app
const MONTH_MAP = {
  'Janar':   { key: 'january',   label: 'Janar',   exportName: 'january'   },
  'Shkurt':  { key: 'february',  label: 'Shkurt',  exportName: 'february'  },
  'Mars':    { key: 'march',     label: 'Mars',    exportName: 'march'     },
  'Prill':   { key: 'april',     label: 'Prill',   exportName: 'april'     },
  'Maj':     { key: 'may',       label: 'Maj',     exportName: 'may'       },
  'Qershor': { key: 'june',      label: 'Qershor', exportName: 'june'      },
  'Korrik':  { key: 'july',      label: 'Korrik',  exportName: 'july'      },
  'Gusht':   { key: 'august',    label: 'Gusht',   exportName: 'august'    },
  'Shtator': { key: 'september', label: 'Shtator', exportName: 'september' },
  'Tetor':   { key: 'october',   label: 'Tetor',   exportName: 'october'   },
  'Nëntor':  { key: 'november',  label: 'Nëntor',  exportName: 'november'  },
  'Dhjetor': { key: 'december',  label: 'Dhjetor', exportName: 'december'  },
}

// Try to find yt-dlp
function getYtDlpPath() {
  const candidates = [
    'yt-dlp',
    'C:/Users/jeffa/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe/yt-dlp.exe',
  ]
  for (const c of candidates) {
    try {
      execSync(`"${c}" --version`, { stdio: 'pipe' })
      return c
    } catch {}
  }
  return 'yt-dlp'
}

// Fetch playlist via YouTube RSS feed — lightweight, never blocked
async function fetchRssFeed() {
  console.log('⏳ Fetching playlist via RSS feed…')
  const res = await fetch(RSS_URL)
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  const xml = await res.text()

  // Parse video IDs and titles from Atom XML
  const videos = []
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g
  let m
  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1]
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
    if (idMatch && titleMatch) {
      videos.push({ id: idMatch[1], title: titleMatch[1] })
    }
  }
  console.log(`  Found ${videos.length} videos in RSS feed`)
  return videos
}

// Get chapters for a single video via yt-dlp.
// Primary: --dump-json (proper JSON). Fallback: --print %(chapters)s.
function fetchChapters(ytdlp, videoId) {
  const cookiesFile = process.env.COOKIES_FILE
  const cookiesArgs = cookiesFile ? ['--cookies', cookiesFile] : []
  const url = `https://www.youtube.com/watch?v=${videoId}`

  // Strategy list: each entry is [label, args, parser]
  const strategies = [
    {
      label: 'dump-json + ejs:github',
      args: ['--dump-json', '--no-download', '--ignore-errors',
             '--remote-components', 'ejs:github', ...cookiesArgs, url],
      parse: parseJsonChapters,
    },
    {
      label: 'dump-json + web client',
      args: ['--dump-json', '--no-download', '--ignore-errors',
             '--extractor-args', 'youtube:player_client=web', ...cookiesArgs, url],
      parse: parseJsonChapters,
    },
    {
      label: 'print chapters + ejs:github',
      args: ['--print', '%(chapters)s', '--no-download', '--ignore-errors',
             '--remote-components', 'ejs:github', ...cookiesArgs, url],
      parse: parsePrintChapters,
    },
    {
      label: 'print chapters + web client',
      args: ['--print', '%(chapters)s', '--no-download', '--ignore-errors',
             '--extractor-args', 'youtube:player_client=web', ...cookiesArgs, url],
      parse: parsePrintChapters,
    },
    {
      label: 'dump-json + default',
      args: ['--dump-json', '--no-download', '--ignore-errors', ...cookiesArgs, url],
      parse: parseJsonChapters,
    },
  ]

  for (const { label, args, parse } of strategies) {
    const result = spawnSync(ytdlp, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    const output = result.stdout?.trim() || ''
    const stderr = result.stderr?.trim() || ''

    if (stderr) {
      // Log first few lines of stderr for diagnostics (skip noisy warnings)
      const important = stderr.split('\n').filter(l =>
        l.includes('ERROR') || l.includes('error') || l.includes('WARNING')
      ).slice(0, 3)
      if (important.length) {
        console.log(`    [${label}] ${important.join(' | ')}`)
      }
    }

    const chapters = parse(output)
    if (chapters && chapters.length > 0) {
      console.log(`    ✓ Strategy "${label}" returned ${chapters.length} chapters`)
      return chapters
    }
  }

  console.log(`    ✗ All strategies returned no chapters`)
  return []
}

// Parse chapters from --dump-json output (proper JSON)
function parseJsonChapters(output) {
  if (!output || output === 'NA' || output === 'None') return []
  try {
    const data = JSON.parse(output)
    if (!data.chapters || !Array.isArray(data.chapters)) return []
    return data.chapters.map(ch => ({
      title: fixEncoding(ch.title || ''),
      start: Math.round(ch.start_time || 0),
    }))
  } catch {
    return []
  }
}

// Parse chapters from --print %(chapters)s output (Python repr format)
function parsePrintChapters(output) {
  if (!output || output === 'NA' || output === 'None') return []
  const entries = []
  const re = /\{'start_time':\s*([\d.]+),\s*'title':\s*'([^']+)',\s*'end_time':\s*([\d.]+)\}/g
  let m
  while ((m = re.exec(output)) !== null) {
    entries.push({
      title: fixEncoding(m[2]),
      start: Math.round(parseFloat(m[1])),
    })
  }
  return entries
}

function parseTitle(title) {
  // Decode HTML entities
  title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  const match = title.match(/\]\s*(\d+)\s+(\S+)\s*$/)
  if (!match) return null
  return { day: parseInt(match[1], 10), monthName: match[2] }
}

function fixEncoding(str) {
  return str
    // Replace Unicode replacement character (U+FFFD) that appears when Ë gets corrupted
    .replace(/\uFFFD/g, 'ë')
    .replace(/ZANAFLLA/g, 'Zanafilla')
    .replace(/Zanaflla/gi, 'Zanafilla')
    .replace(/ZANAFILLA/g, 'Zanafilla')
    .replace(/MATEU/g, 'Mateu')
    .replace(/MARKU/g, 'Marku')
    .replace(/LUKA/g, 'Luka')
    .replace(/VEPRAT/g, 'Veprat')
    .replace(/EZRA/g, 'Ezdra')
    .replace(/EZDRA/g, 'Ezdra')
    .replace(/NEHEMIA/g, 'Nehemia')
    .replace(/ESTERI/g, 'Esteri')
    .replace(/JOBI/g, 'Jobi')
    .replace(/ROMAK[^\s]VE/gi, 'Romakëve')
    .replace(/ROMAKËVE/g, 'Romakëve')
    .replace(/1 E KORINTASVE/g, '1 e Korintasve')
    .replace(/2 E KORINTASVE/g, '2 e Korintasve')
    .replace(/GALATASVE/g, 'Galatasve')
    .replace(/EFESIANËVE/g, 'Efesianëve')
    .replace(/FILIPIANËVE/g, 'Filipianëve')
    .replace(/KOLOSIANËVE/g, 'Kolosianëve')
    .replace(/FJAL.T E URTA/gi, 'Fjalët E Urta')
    .replace(/HYRJE/gi, 'Hyrje')
    .replace(/\b([A-ZËÇ]{2,})\b/g, (w) => w[0] + w.slice(1).toLowerCase())
    .trim()
}

function generateDataFile(exportName, entries) {
  return [
    `// Auto-generated by scripts/fetch-playlist.mjs — do not edit manually`,
    `export const ${exportName} = ${JSON.stringify(entries, null, 2)}`,
  ].join('\n') + '\n'
}

function generateIndexFile(months) {
  const imports = months.map((m) => `import { ${m.exportName} } from './${m.exportName}'`).join('\n')
  const entries = months.map((m) => `  { key: '${m.key}', label: '${m.label}', days: ${m.exportName} }`).join(',\n')
  return [
    `// Auto-generated by scripts/fetch-playlist.mjs — do not edit manually`,
    imports, '',
    `export const MONTHS = [\n${entries}\n]`, '',
  ].join('\n')
}

// Get all existing video IDs from committed data files
function getExistingVideoIds() {
  const ids = new Set()
  if (!existsSync(DATA_DIR)) return ids
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith('.js') || file === 'months.js') continue
    const content = readFileSync(join(DATA_DIR, file), 'utf8')
    for (const m of content.matchAll(/"videoId":\s*"([^"]+)"/g)) {
      ids.add(m[1])
    }
  }
  return ids
}

// Read existing data file entries by month
function getExistingByMonth() {
  const byMonth = {}
  if (!existsSync(DATA_DIR)) return byMonth
  for (const [monthName, info] of Object.entries(MONTH_MAP)) {
    const filePath = join(DATA_DIR, `${info.exportName}.js`)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    // Re-parse JSON array from the export
    const match = content.match(/export const \w+ = (\[[\s\S]*\])/)
    if (!match) continue
    try {
      byMonth[monthName] = JSON.parse(match[1])
    } catch {}
  }
  return byMonth
}

// Fetch playlist via yt-dlp — used as fallback when RSS is unavailable
function fetchPlaylistViaYtDlp(ytdlp) {
  console.log('⏳ Fetching playlist via yt-dlp (RSS fallback)…')
  const cookiesFile = process.env.COOKIES_FILE
  const cookiesArgs = cookiesFile ? ['--cookies', cookiesFile] : []
  const args = [
    '--flat-playlist',
    '--print', '%(id)s\t%(title)s',
    '--ignore-errors',
    ...cookiesArgs,
    `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
  ]
  const result = spawnSync(ytdlp, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  const videos = []
  for (const line of (result.stdout || '').split('\n')) {
    const tab = line.indexOf('\t')
    if (tab === -1) continue
    const id = line.slice(0, tab).trim()
    const title = line.slice(tab + 1).trim()
    if (id && title) videos.push({ id, title })
  }
  console.log(`  Found ${videos.length} videos via yt-dlp`)
  return videos
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ytdlp = getYtDlpPath()

// Log yt-dlp version for diagnostics
try {
  const ver = execSync(`"${ytdlp}" --version`, { encoding: 'utf8' }).trim()
  console.log(`yt-dlp version: ${ver}`)
} catch {}

let rssVideos
try {
  rssVideos = await fetchRssFeed()
} catch (err) {
  console.warn('⚠ RSS fetch failed:', err.message)
  console.warn('  Trying yt-dlp playlist fallback…')
  rssVideos = fetchPlaylistViaYtDlp(ytdlp)
  if (rssVideos.length === 0) {
    console.warn('  yt-dlp fallback also returned no videos — skipping update.')
    process.exit(0)
  }
}

const existingIds = getExistingVideoIds()
const byMonth = getExistingByMonth()

// Find new videos not yet in our data files
const newVideos = rssVideos.filter((v) => !existingIds.has(v.id))
console.log(`  ${existingIds.size} existing, ${newVideos.length} new video(s) to add`)

// Also check for existing entries with empty readings that need chapter fetching
let needsChapterFetch = false
for (const [monthName, entries] of Object.entries(byMonth)) {
  for (const entry of entries) {
    if (entry.readings && entry.readings.length === 0 && entry.videoId) {
      console.log(`  📥 Re-fetching chapters for ${entry.date} (${entry.videoId})…`)
      const readings = fetchChapters(ytdlp, entry.videoId)
      const filtered = readings.filter(
        (r) => r.title.toLowerCase() !== 'hyrje' || readings.length === 1
      )
      if (filtered.length > 0) {
        entry.readings = filtered
        needsChapterFetch = true
        console.log(`  ✓ Updated ${entry.date} with ${filtered.length} readings`)
      }
    }
  }
}

if (newVideos.length === 0 && !needsChapterFetch) {
  console.log('✅ All videos already in data files — nothing to update.')
  process.exit(0)
}

// For each new video, fetch chapters via yt-dlp and add to data
for (const video of newVideos) {
  const parsed = parseTitle(video.title)
  if (!parsed) {
    console.warn(`  ⚠ Could not parse title: "${video.title}"`)
    continue
  }

  const { day, monthName } = parsed
  const monthInfo = MONTH_MAP[monthName]
  if (!monthInfo) {
    console.warn(`  ⚠ Unknown month: "${monthName}"`)
    continue
  }

  console.log(`  📥 Fetching chapters for ${day} ${monthName} (${video.id})…`)
  const allReadings = fetchChapters(ytdlp, video.id)
  const readings = allReadings.filter(
    (r) => r.title.toLowerCase() !== 'hyrje' || allReadings.length === 1
  )

  const entry = {
    day,
    date: `${day} ${monthName}`,
    videoId: video.id,
    readings,
  }

  if (!byMonth[monthName]) byMonth[monthName] = []
  // Avoid duplicates
  if (!byMonth[monthName].find((e) => e.videoId === video.id)) {
    byMonth[monthName].push(entry)
    console.log(`  ✓ Added ${day} ${monthName} with ${readings.length} readings`)
  }
}

// Sort and write updated data files
mkdirSync(DATA_DIR, { recursive: true })

const monthOrder = Object.keys(MONTH_MAP)
const presentMonths = monthOrder
  .filter((m) => byMonth[m] && byMonth[m].length > 0)
  .map((m) => MONTH_MAP[m])

for (const monthInfo of presentMonths) {
  const entries = byMonth[monthInfo.label].sort((a, b) => a.day - b.day)
  const filePath = join(DATA_DIR, `${monthInfo.exportName}.js`)
  writeFileSync(filePath, generateDataFile(monthInfo.exportName, entries), 'utf8')
  console.log(`✓ ${monthInfo.exportName}.js — ${entries.length} days`)
}

const indexContent = generateIndexFile(presentMonths)
writeFileSync(join(DATA_DIR, 'months.js'), indexContent, 'utf8')
console.log(`✓ months.js — ${presentMonths.length} months`)

console.log('\n✅ Done.')
