/**
 * Normalise product images in the Supabase `products` bucket so the gallery
 * renders them consistently:
 *   1. Opaque images (white-background JPEGs) → make the border-connected white
 *      transparent via an edge flood-fill (interior white, e.g. white shoes, is
 *      preserved because it is not connected to the frame border).
 *   2. Every image → trim to its content bounding box, then re-centre on a fixed
 *      transparent square canvas with constant padding, so all shoes appear at
 *      the same scale.
 *
 * Output is always a transparent PNG, re-uploaded under the SAME object name
 * (extension kept as-is so gallery filename derivation and picture_name stay
 * valid; Supabase serves it with contentType image/png).
 *
 * Modes:
 *   node scripts/normalize-product-images.mjs --test
 *        Process a few sample colour_ids, write before/after PNGs to
 *        scripts/_out/, DO NOT touch the bucket.
 *   node scripts/normalize-product-images.mjs --limit=20
 *        Process the first 20 bucket images (with local backup), overwrite.
 *   node scripts/normalize-product-images.mjs
 *        Process the whole bucket (with local backup), overwrite.
 *
 * Originals are backed up to ./image-backup/<name> before overwrite.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// ── Config ─────────────────────────────────────────────────────────────────
const CANVAS    = 700          // output square size (px)
const FILL      = 0.90         // fraction of canvas the trimmed shoe should fill
const WHITE     = 240          // R,G,B all >= this ⇒ treated as background white
const TRIM_THR  = 12           // sharp trim tolerance
const CONCURRENCY = 4
const BUCKET    = 'products'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const PUBLIC = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

const TEST   = process.argv.includes('--test')
const limitA = process.argv.find(a => a.startsWith('--limit='))
const LIMIT  = limitA ? parseInt(limitA.split('=')[1], 10) : Infinity

// ── Core transform: buffer → normalised transparent PNG buffer ───────────────
async function normalise(buf) {
  const { data: raw, info } = await sharp(buf).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels } = info   // channels === 4

  // Is the image already transparent? (sample the four corners)
  const cornerAlpha = [
    raw[3],
    raw[(W - 1) * channels + 3],
    raw[((H - 1) * W) * channels + 3],
    raw[(((H - 1) * W) + (W - 1)) * channels + 3],
  ]
  const alreadyTransparent = cornerAlpha.every(a => a < 16)

  // Opaque white background ⇒ edge flood-fill white → transparent.
  if (!alreadyTransparent) {
    const isWhite = (o) => raw[o] >= WHITE && raw[o + 1] >= WHITE && raw[o + 2] >= WHITE
    const visited = new Uint8Array(W * H)
    const stack = []
    const pushIf = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return
      const p = y * W + x
      if (visited[p]) return
      visited[p] = 1
      if (isWhite(p * channels)) stack.push(p)
    }
    for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1) }
    for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y) }
    while (stack.length) {
      const p = stack.pop()
      raw[p * channels + 3] = 0          // clear alpha
      const x = p % W, y = (p - x) / W
      pushIf(x - 1, y); pushIf(x + 1, y); pushIf(x, y - 1); pushIf(x, y + 1)
    }
  }

  // Rebuild, trim to content bbox.
  let trimmed = sharp(Buffer.from(raw), { raw: { width: W, height: H, channels } })
  try {
    trimmed = sharp(await trimmed.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: TRIM_THR })
      .png().toBuffer())
  } catch {
    trimmed = sharp(Buffer.from(raw), { raw: { width: W, height: H, channels } })  // uniform → skip trim
  }

  // Resize trimmed content into the inner box, then centre on transparent canvas.
  const inner = Math.round(CANVAS * FILL)
  const resized = await trimmed
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false,
                            background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()

  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 4,
                           background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, gravity: 'center' }])
    .png().toBuffer()
}

// ── Test mode ────────────────────────────────────────────────────────────────
async function runTest() {
  const ids = ['5316.9820', '5316.5620', '1701.9998', '5316K.9820', '1700K.5750']
  const { data } = await sb.from('products').select('colour_id,picture_name').in('colour_id', ids)
  const outDir = resolve(process.cwd(), 'scripts/_out')
  mkdirSync(outDir, { recursive: true })
  for (const r of data ?? []) {
    if (!r.picture_name) continue
    const res = await fetch(PUBLIC + encodeURIComponent(r.picture_name))
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(join(outDir, `${r.colour_id}_before.png`), await sharp(buf).png().toBuffer())
    const out = await normalise(buf)
    writeFileSync(join(outDir, `${r.colour_id}_after.png`), out)
    const m = await sharp(out).metadata()
    console.log(`${r.colour_id.padEnd(12)} → ${m.width}x${m.height} written`)
  }
  console.log(`\nWrote before/after to ${outDir}`)
}

// ── Bucket listing (paginated) ───────────────────────────────────────────────
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

async function runBucket() {
  const all = (await listAll()).slice(0, LIMIT)
  console.log(`${all.length} images to process (canvas ${CANVAS}, fill ${FILL})\n`)
  const backupDir = resolve(process.cwd(), 'image-backup')
  mkdirSync(backupDir, { recursive: true })

  let done = 0, ok = 0, err = 0
  const pool = Array.from({ length: CONCURRENCY }, async () => {
    while (all.length) {
      const name = all.shift()
      try {
        const res = await fetch(PUBLIC + encodeURIComponent(name))
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        const bkp = join(backupDir, name)
        if (!existsSync(bkp)) writeFileSync(bkp, buf)          // back up original once
        const out = await normalise(buf)
        const { error } = await sb.storage.from(BUCKET)
          .upload(name, out, { contentType: 'image/png', upsert: true })
        if (error) throw new Error(error.message)
        ok++
      } catch (e) {
        err++; process.stderr.write(`\n⚠ ${name}: ${e.message}\n`)
      }
      if (++done % 10 === 0 || !all.length)
        process.stdout.write(`\r  ${done}  ✓${ok} ✗${err}   `)
    }
  })
  await Promise.all(pool)
  console.log(`\n\n✅ done — ${ok} processed, ${err} errors. Originals backed up to ${backupDir}`)
}

await (TEST ? runTest() : runBucket())
