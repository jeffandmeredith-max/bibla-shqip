import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// SVG icon: dark background + gold open book symbol
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0e0e12"/>
  <!-- gold glow -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.38}" fill="none" stroke="#c8a96e" stroke-width="${size*0.015}" opacity="0.18"/>
  <!-- open book -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- left page -->
    <path d="M-${size*0.28} -${size*0.18} Q-${size*0.28} -${size*0.22} -${size*0.02} -${size*0.2} L-${size*0.02} ${size*0.18} Q-${size*0.28} ${size*0.16} -${size*0.28} ${size*0.12} Z"
      fill="#c8a96e" opacity="0.9"/>
    <!-- right page -->
    <path d="M${size*0.28} -${size*0.18} Q${size*0.28} -${size*0.22} ${size*0.02} -${size*0.2} L${size*0.02} ${size*0.18} Q${size*0.28} ${size*0.16} ${size*0.28} ${size*0.12} Z"
      fill="#c8a96e" opacity="0.9"/>
    <!-- spine -->
    <rect x="-${size*0.025}" y="-${size*0.21}" width="${size*0.05}" height="${size*0.39}" rx="${size*0.01}" fill="#0e0e12"/>
    <!-- lines on left page -->
    <line x1="-${size*0.22}" y1="-${size*0.08}" x2="-${size*0.06}" y2="-${size*0.09}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
    <line x1="-${size*0.22}" y1="${size*0.0}" x2="-${size*0.06}" y2="-${size*0.01}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
    <line x1="-${size*0.22}" y1="${size*0.08}" x2="-${size*0.09}" y2="${size*0.07}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
    <!-- lines on right page -->
    <line x1="${size*0.06}" y1="-${size*0.08}" x2="${size*0.22}" y2="-${size*0.09}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
    <line x1="${size*0.06}" y1="${size*0.0}" x2="${size*0.22}" y2="-${size*0.01}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
    <line x1="${size*0.06}" y1="${size*0.08}" x2="${size*0.19}" y2="${size*0.07}" stroke="#0e0e12" stroke-width="${size*0.018}" stroke-linecap="round" opacity="0.4"/>
  </g>
</svg>`

async function makeIcon(size, filename) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(`public/icons/${filename}`)
  console.log(`✓ ${filename}`)
}

await makeIcon(192, 'icon-192.png')
await makeIcon(512, 'icon-512.png')
await makeIcon(180, 'apple-touch-icon.png')
console.log('Icons generated in public/icons/')
