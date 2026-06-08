/**
 * Upload product photos from local folder to Supabase Storage
 * and update picture_name in products table.
 *
 * Folder structure expected:
 *   <baseDir>/
 *     <any subfolder>/
 *       <colour_id>/          e.g. 1700.0393
 *         1700.0393.01.png    (main image)
 *         1700.0393.02.png    (gallery 2)
 *         ...
 *         1700.0393.08.png    (gallery 8)
 *
 * Usage: node scripts/upload-local-photos.mjs [--dry-run]
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, extname } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb      = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET  = 'products'
const DRY_RUN = process.argv.includes('--dry-run')

// Pass folder as argument: node scripts/upload-local-photos.mjs "C:\path\to\folder"
// Or set default here:
const BASE_DIR = process.argv.find((a, i) => i > 1 && !a.startsWith('--'))
  ?? 'C:\\Users\\Jorge\\OneDrive - Umzero\\platuz\\Clientes\\piedro\\fotos\\wetransfer_more-images_2026-05-19_1231'

// ── Collect all image files ───────────────────────────────────────────────────

function listImages(dir) {
  const result = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // Could be subfolder (e.g. "14 Shoes images") or product folder (e.g. "1700.0393")
      const isProductFolder = /^\d{4}[A-Z]?\.\d{4}/.test(entry)
      if (isProductFolder) {
        // This is a product folder — collect images inside
        for (const file of readdirSync(full)) {
          const ext = extname(file).toLowerCase()
          if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            result.push({ colourId: entry, file: join(full, file), name: file })
          }
        }
      } else {
        // Subfolder — recurse
        result.push(...listImages(full))
      }
    }
  }
  return result
}

console.log('Scanning folder...')
const images = listImages(BASE_DIR)
console.log(`Found ${images.length} image files\n`)

if (!images.length) { console.log('No images found.'); process.exit(0) }

// Show summary by model
const byModel = {}
images.forEach(({ colourId }) => { byModel[colourId] = (byModel[colourId] ?? 0) + 1 })
console.log(`Models: ${Object.keys(byModel).length}`)
Object.entries(byModel).slice(0, 8).forEach(([m, n]) => console.log(`  ${m}: ${n} image(s)`))
if (Object.keys(byModel).length > 8) console.log(`  ...`)

if (DRY_RUN) { console.log('\n[dry-run] No uploads.'); process.exit(0) }

// ── Upload & update ───────────────────────────────────────────────────────────

let uploaded = 0, dbUpdated = 0, errors = 0
const mainImages = {}  // colourId → storageName (for DB update)

for (const { colourId, file, name } of images) {
  // Storage path = filename as-is (e.g. 1700.0393.01.png)
  const storageName = name

  try {
    const buf = readFileSync(file)
    const contentType = extname(name).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
    const { error } = await sb.storage.from(BUCKET).upload(storageName, buf, { contentType, upsert: true })
    if (error) throw new Error(error.message)
    uploaded++

    // Track the .01 file as the main image for this colourId
    if (/\.01\.(png|jpg|jpeg)$/i.test(name)) {
      mainImages[colourId] = storageName
    }
  } catch (err) {
    errors++
    console.error(`\n✗ ${name}: ${err.message}`)
  }

  if (uploaded % 20 === 0) process.stdout.write(`\r  Uploaded ${uploaded}/${images.length}...`)
}

console.log(`\r✓ ${uploaded} files uploaded  (${errors} errors)\n`)

// ── Update picture_name in products table ─────────────────────────────────────

const colourIds = Object.keys(mainImages)
console.log(`Updating picture_name for ${colourIds.length} products...`)

for (const colourId of colourIds) {
  const newPictureName = mainImages[colourId]
  const { error } = await sb.from('products')
    .update({ picture_name: newPictureName })
    .eq('colour_id', colourId)
  if (error) { console.error(`DB error ${colourId}:`, error.message); errors++ }
  else dbUpdated++
}

console.log(`✓ ${dbUpdated} products updated in DB\n`)
console.log(`✅ Done! ${uploaded} uploaded, ${dbUpdated} DB records updated, ${errors} errors`)
