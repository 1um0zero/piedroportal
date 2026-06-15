/**
 * List products that have MULTIPLE angle images in the live `products` bucket.
 *
 * WHY: the per-image "trim → fill 90%" normalisation (src/lib/products/normalize-image.ts)
 * scales each angle independently so its content fills the frame. Because the
 * originals share a fixed camera scale, a side profile has a long content bbox
 * while a frontal/3-4 view has a short one — after per-image fill the frontal view
 * is blown up to the same size and looks "too big". This distortion happens to
 * EVERY product with non-profile angle views, so the set of affected products is
 * essentially "products with more than one angle image".
 *
 * (The local ./image-backup can't quantify magnitude: its multi-angle files are
 * already normalised, so they all measure the same. True magnitude needs the
 * Dataverse originals.)
 *
 *   node scripts/detect-image-scale-variance.mjs
 *
 * Output: console summary + scripts/_out/multi-angle-products.csv
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const OUT_DIR = resolve(process.cwd(), 'scripts/_out')
const BUCKET = 'products'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Group key = filename without trailing ".NN" angle suffix and extension, ignoring
// brand sub-folders. e.g. 1700.0393.01.png → 1700.0393 ; 5205.5636.png → 5205.5636
function productKey(name) {
  const base = name.split('/').pop()
  const noExt = base.replace(/\.(png|jpe?g)$/i, '')
  const m = noExt.match(/^(.*)\.(\d{2})$/)
  return m ? m[1] : noExt
}

async function listAll() {
  const names = []
  let offset = 0
  const PAGE = 100
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(error.message)
    const files = (data ?? []).filter(f => f.id && /\.(png|jpe?g)$/i.test(f.name))
    names.push(...files.map(f => f.name))
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  return names
}

const all = await listAll()
// Count distinct logical images per product (dedupe jpg/png of the same base).
const byProduct = new Map()
for (const name of all) {
  const k = productKey(name)
  const logical = name.replace(/\.(png|jpe?g)$/i, '')
  if (!byProduct.has(k)) byProduct.set(k, new Set())
  byProduct.get(k).add(logical)
}

const rows = [...byProduct.entries()]
  .map(([product, set]) => ({ product, angles: set.size }))
  .filter(r => r.angles >= 2)
  .sort((a, b) => b.angles - a.angles || a.product.localeCompare(b.product))

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'multi-angle-products.csv'),
  ['product,angle_images'].concat(rows.map(r => `${r.product},${r.angles}`)).join('\n'))

const total = byProduct.size
console.log(`Bucket images               : ${all.length}`)
console.log(`Distinct products           : ${total}`)
console.log(`Multi-angle (affected)      : ${rows.length}`)
console.log(`Single-image (unaffected)   : ${total - rows.length}`)
console.log(`\nSample of affected products (most angles first):`)
console.log('  imgs  product')
for (const r of rows.slice(0, 25)) {
  console.log(`  ${String(r.angles).padStart(4)}  ${r.product}`)
}
console.log(`\nFull list → scripts/_out/multi-angle-products.csv`)
