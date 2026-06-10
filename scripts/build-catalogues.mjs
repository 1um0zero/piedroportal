#!/usr/bin/env node
/**
 * Turn the catalogue PDFs in _catalogues_src/ into flip-book page images.
 *
 *   node scripts/build-catalogues.mjs            # all catalogues
 *   node scripts/build-catalogues.mjs kids-en    # just one
 *
 * Each PDF page is rendered to a JPG (~1400px wide, mozjpeg) and uploaded to the
 * public Supabase `catalogues` bucket at  <slug>/page-NNN.jpg . A small manifest
 * (page counts + public base URL) is written to src/lib/catalogues-manifest.json
 * so the viewer knows how many pages to leaf through — no PDF ever reaches the
 * browser. The same bucket is what the back-office upload flow will use later.
 *
 * Source PDFs live OUTSIDE the build (_catalogues_src/) — they are inputs only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import * as mupdf from 'mupdf'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
process.loadEnvFile(path.join(ROOT, '.env.local'))

const BUCKET = 'catalogues'
const SRC_DIR = path.join(ROOT, '_catalogues_src')
const MANIFEST = path.join(ROOT, 'src', 'lib', 'catalogues-manifest.json')
const LEAF_W = 1000 // width of a single book leaf in px (a spread = 2 leaves)

// Which PDF maps to which catalogue. type/lang drive the viewer's grouping.
const CATALOGUES = [
  { slug: 'kids-en',   type: 'kids',   lang: 'en', file: 'Piedro Kids Collection 2026 ENG-LR.pdf' },
  { slug: 'kids-nl',   type: 'kids',   lang: 'nl', file: 'Piedro Kids Collection 2026 NL-LR.pdf' },
  { slug: 'adults-en', type: 'adults', lang: 'en', file: 'Piedro Adults Collection 2026 ENG-LR.pdf' },
  { slug: 'adults-nl', type: 'adults', lang: 'nl', file: 'Piedro Adults Collection 2026 NL_LR.pdf' },
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw error
    console.log(`✓ created public bucket "${BUCKET}"`)
  }
}

async function renderCatalogue(cat) {
  const pdfPath = path.join(SRC_DIR, cat.file)
  if (!fs.existsSync(pdfPath)) { console.warn(`  ⚠ missing ${cat.file} — skipped`); return null }

  // Drop any previously-rendered files for this catalogue (e.g. earlier naming).
  const { data: existing } = await supabase.storage.from(BUCKET).list(cat.slug, { limit: 1000 })
  if (existing?.length) {
    await supabase.storage.from(BUCKET).remove(existing.map((f) => `${cat.slug}/${f.name}`))
  }

  const doc = mupdf.Document.openDocument(fs.readFileSync(pdfPath), 'application/pdf')
  const numPages = doc.countPages()
  console.log(`\n▶ ${cat.slug} — ${numPages} PDF pages`)

  // The PDFs are laid out as spreads (one landscape page = two book leaves) with
  // single portrait covers. Split each spread into left/right leaves so a real
  // two-up page-flip rejoins them seamlessly at the spine; keep covers single.
  const encode = (buf) => sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  let leaf = 0
  const upload = async (buf) => {
    leaf++
    const key = `${cat.slug}/leaf-${String(leaf).padStart(3, '0')}.jpg`
    const { error } = await supabase.storage.from(BUCKET)
      .upload(key, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(`upload ${key}: ${error.message}`)
  }

  for (let n = 1; n <= numPages; n++) {
    const page = doc.loadPage(n - 1)
    const [x0, y0, x1, y1] = page.getBounds()
    const w = x1 - x0, h = y1 - y0
    const isSpread = w > h
    const scale = (isSpread ? LEAF_W * 2 : LEAF_W) / w
    const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false)
    const png = Buffer.from(pixmap.asPNG())
    const pw = pixmap.getWidth(), ph = pixmap.getHeight()
    pixmap.destroy()

    if (isSpread) {
      const half = Math.floor(pw / 2)
      await upload(await encode(await sharp(png).extract({ left: 0, top: 0, width: half, height: ph }).toBuffer()))
      await upload(await encode(await sharp(png).extract({ left: half, top: 0, width: pw - half, height: ph }).toBuffer()))
    } else {
      await upload(await encode(png))
    }
    process.stdout.write(`\r  page ${n}/${numPages} → ${leaf} leaves   `)
  }
  console.log('')
  return { slug: cat.slug, type: cat.type, lang: cat.lang, leaves: leaf }
}

async function main() {
  const only = process.argv.slice(2)
  const todo = only.length ? CATALOGUES.filter((c) => only.includes(c.slug)) : CATALOGUES
  await ensureBucket()

  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
  const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { baseUrl, catalogues: [] }
  const bySlug = new Map(prev.catalogues.map((c) => [c.slug, c]))

  for (const cat of todo) {
    const out = await renderCatalogue(cat)
    if (out) bySlug.set(out.slug, out)
  }

  const manifest = {
    baseUrl,
    catalogues: CATALOGUES.map((c) => bySlug.get(c.slug)).filter(Boolean),
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n✓ manifest → ${path.relative(ROOT, MANIFEST)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
