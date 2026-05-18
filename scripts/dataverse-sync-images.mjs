/**
 * Download product images from Dataverse → upload to Supabase Storage (bucket: products)
 *
 * Naming convention in Supabase:
 *   Main image  → {picture_name}           (picture_name already has .jpg from import)
 *   Gallery 02  → {picture_base}_02.jpg
 *   ...
 *   Gallery 08  → {picture_base}_08.jpg
 *
 * gallery_pic01 === main picture → skipped (already uploaded as main)
 *
 * Usage:
 *   node scripts/dataverse-sync-images.mjs           → all products
 *   node scripts/dataverse-sync-images.mjs --limit=50 → first 50 (for testing)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// ── Config ───────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DV_URL   = env.DATAVERSE_URL
const TOKEN_EP = `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`
const API      = `${DV_URL}/api/data/v9.2`
const BUCKET   = 'products'
const CONCURRENCY = 4   // parallel downloads

const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT    = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(TOKEN_EP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET,
      scope: `${DV_URL}/.default`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Dataverse image download ──────────────────────────────────────────────────

async function downloadImage(recordId, field, token) {
  const res = await fetch(
    `${API}/cr56f_wpp_style_colorses(${recordId})/${field}/$value`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' } }
  )
  if (res.status === 204 || res.status === 404) return null   // no image
  if (!res.ok) return null
  const buf = await res.arrayBuffer()
  if (!buf.byteLength) return null
  const ct = res.headers.get('content-type') ?? 'image/jpeg'
  return { data: Buffer.from(buf), contentType: ct }
}

// ── Supabase upload ───────────────────────────────────────────────────────────

async function uploadImage(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    })
  if (error) throw new Error(`Upload ${path}: ${error.message}`)
}

// ── Process one product ───────────────────────────────────────────────────────

async function processProduct({ id, picture_name }, token, stats) {
  if (!picture_name) { stats.skipped++; return }

  // picture_name already has .jpg suffix (e.g. "5305K.2036.jpg" or "5305K.2036.01.jpg")
  // base = name without .jpg, for gallery filenames
  const base = picture_name.replace(/\.jpg$/i, '')

  let uploaded = 0

  // ── Main image (cr56f_picture) ──
  const main = await downloadImage(id, 'cr56f_picture', token)
  if (main) {
    await uploadImage(picture_name, main.data, main.contentType)
    uploaded++
  }

  // ── Gallery images 02–08 (01 === main, skip) ──
  for (let n = 2; n <= 8; n++) {
    const field = `cr56f_gallery_pic${String(n).padStart(2, '0')}`
    const img   = await downloadImage(id, field, token)
    if (img) {
      const path = `${base}_${String(n).padStart(2, '0')}.jpg`
      await uploadImage(path, img.data, img.contentType)
      uploaded++
    }
  }

  if (uploaded > 0) stats.withImages++
  else stats.noImage++
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

async function pool(items, fn, concurrency) {
  let i = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await fn(item)
    }
  })
  await Promise.all(workers)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🖼️   Syncing images: Dataverse → Supabase Storage\n')

  // Get products from Supabase (paginate in chunks of 1000)
  let products = []
  let offset   = 0
  const PAGE   = 1000
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, picture_name')
      .eq('active', true)
      .order('style_name')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`Supabase fetch: ${error.message}`)
    products = products.concat(data ?? [])
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  if (LIMIT < Infinity) products = products.slice(0, LIMIT)
  console.log(`📋  ${products.length} active products to process\n`)

  const token = await getToken()
  console.log('✓  Authenticated with Dataverse\n')

  const stats = { withImages: 0, noImage: 0, skipped: 0, errors: 0 }
  let done = 0

  await pool(products, async (product) => {
    try {
      await processProduct(product, token, stats)
    } catch (err) {
      stats.errors++
      process.stderr.write(`\n⚠  ${product.picture_name}: ${err.message}\n`)
    }
    done++
    if (done % 10 === 0 || done === products.length) {
      process.stdout.write(
        `\r  ${done}/${products.length}  ` +
        `✓${stats.withImages} images  ` +
        `○${stats.noImage} empty  ` +
        `✗${stats.errors} errors   `
      )
    }
  }, CONCURRENCY)

  console.log('\n\n✅  Done!')
  console.log(`   With images : ${stats.withImages}`)
  console.log(`   No image    : ${stats.noImage}`)
  console.log(`   Skipped     : ${stats.skipped}`)
  console.log(`   Errors      : ${stats.errors}`)
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
