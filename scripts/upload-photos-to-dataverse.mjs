/**
 * Upload local product photos to Dataverse image columns.
 *
 * Mapping:
 *   1700.0393.01.png → cr56f_picture + cr56f_gallery_pic01 (main = gallery01)
 *   1700.0393.02.png → cr56f_gallery_pic02
 *   ...
 *   1700.0393.08.png → cr56f_gallery_pic08
 *
 * Usage:
 *   node scripts/upload-photos-to-dataverse.mjs
 *   node scripts/upload-photos-to-dataverse.mjs "C:\other\folder"  [--dry-run]
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, extname } from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb      = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const API     = `${env.DATAVERSE_URL}/api/data/v9.2`
const DRY_RUN = process.argv.includes('--dry-run')

const BASE_DIR = process.argv.find((a, i) => i > 1 && !a.startsWith('--'))
  ?? 'C:\\Users\\Jorge\\OneDrive - Umzero\\platuz\\Clientes\\piedro\\fotos\\wetransfer_more-images_2026-05-19_1231'

// Gallery file number → Dataverse image field
const FIELD_MAP = {
  '01': ['cr56f_picture', 'cr56f_gallery_pic01'],  // main = also gallery_pic01
  '02': ['cr56f_gallery_pic02'],
  '03': ['cr56f_gallery_pic03'],
  '04': ['cr56f_gallery_pic04'],
  '05': ['cr56f_gallery_pic05'],
  '06': ['cr56f_gallery_pic06'],
  '07': ['cr56f_gallery_pic07'],
  '08': ['cr56f_gallery_pic08'],
}

// ── Auth ──────────────────────────────────────────────────────────────────────
console.log('Authenticating with Dataverse...')
const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials',
      client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET,
      scope: `${env.DATAVERSE_URL}/.default` }) }
)).json()
console.log('✓ Authenticated\n')

// ── Scan local folder ─────────────────────────────────────────────────────────
function listImages(dir) {
  const result = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      const isProductFolder = /^\d{4}[A-Z]?\.\d{4}/.test(entry)
      if (isProductFolder) {
        for (const file of readdirSync(full)) {
          const ext = extname(file).toLowerCase()
          if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            // Extract number: 1700.0393.02.png → "02"
            const match = file.match(/\.(\d{2})\.(png|jpg|jpeg)$/i)
            if (match) result.push({ colourId: entry, file: join(full, file), num: match[1], name: file })
          }
        }
      } else {
        result.push(...listImages(full))
      }
    }
  }
  return result
}

console.log('Scanning folder...')
const images = listImages(BASE_DIR)
console.log(`Found ${images.length} files across ${new Set(images.map(i => i.colourId)).size} models\n`)

if (DRY_RUN) {
  images.slice(0, 5).forEach(i => console.log(` ${i.name} → ${(FIELD_MAP[i.num] ?? []).join(', ')}`))
  console.log('\n[dry-run] No uploads.')
  process.exit(0)
}

// ── Get Dataverse IDs from Supabase ───────────────────────────────────────────
const colourIds = [...new Set(images.map(i => i.colourId))]
const { data: products } = await sb
  .from('products')
  .select('id, colour_id')
  .in('colour_id', colourIds)

const idMap = Object.fromEntries((products ?? []).map(p => [p.colour_id, p.id]))
console.log(`Found ${Object.keys(idMap).length}/${colourIds.length} products in DB\n`)

// ── Upload to Dataverse ───────────────────────────────────────────────────────
let uploaded = 0, skipped = 0, errors = 0

for (const { colourId, file, num, name } of images) {
  const dataverseId = idMap[colourId]
  if (!dataverseId) { skipped++; continue }

  const fields = FIELD_MAP[num]
  if (!fields) { skipped++; continue }

  // PATCH with base64-encoded PNG — no quality loss, no format conversion
  const base64 = readFileSync(file).toString('base64')
  const body = Object.fromEntries(fields.map(f => [f, base64]))

  const res = await fetch(`${API}/cr56f_wpp_style_colorses(${dataverseId})`, {
    method: 'PATCH',
    headers: {
      Authorization:  `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'OData-Version':'4.0',
    },
    body: JSON.stringify(body),
  })

  if (res.ok || res.status === 204) {
    uploaded += fields.length
  } else {
    const err = await res.text().catch(() => res.status)
    console.error(`\n✗ ${name}: ${res.status} ${String(err).slice(0,120)}`)
    errors++
  }

  if ((uploaded + errors) % 20 === 0)
    process.stdout.write(`\r  ${uploaded} uploaded, ${errors} errors, ${skipped} skipped...`)
}

console.log(`\n\n✅ Done!`)
console.log(`   Uploaded : ${uploaded} (field writes)`)
console.log(`   Skipped  : ${skipped}`)
console.log(`   Errors   : ${errors}`)
