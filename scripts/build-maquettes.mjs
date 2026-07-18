#!/usr/bin/env node
/**
 * Turn Piedro's per-model maquette PDFs (vector line-drawings with the leather
 * pieces numbered ①②③…) into crisp, minified SVGs and upload them to the public
 * Supabase `maquettes` bucket at  <style>.svg .
 *
 *   node scripts/build-maquettes.mjs            # all PDFs in the source dir
 *   node scripts/build-maquettes.mjs 3467 3310  # just these styles
 *
 * The maquette filename IS the style number (e.g. 3467.pdf → style_name "3467"),
 * so the Upper-leather picker resolves a model's drawing straight from
 * product.style_name. A tiny manifest of the styles that HAVE a maquette is
 * written to src/lib/maquettes-manifest.json so the form only offers the picker
 * when a drawing exists — no broken-image flashes.
 *
 * Source PDFs live OUTSIDE the repo (Jorge's OneDrive) — inputs only, never
 * committed. Override the dir with MAQUETTES_SRC in .env.local if it moves.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as mupdf from 'mupdf'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
process.loadEnvFile(path.join(ROOT, '.env.local'))

const BUCKET = 'maquettes'
const SRC_DIR = process.env.MAQUETTES_SRC ||
  'C:/Users/Jorge/OneDrive - Umzero/platuz/Clientes/piedro/custom made/maquetes/pdf'
const MANIFEST = path.join(ROOT, 'src', 'lib', 'maquettes-manifest.json')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// PDF (single page) → minified SVG string. Vector paths only; coordinates are
// rounded to whole units (the canvas is ~540px wide, sub-pixel is invisible) and
// the inkscape editor cruft is stripped — ~66KB → ~42KB, ~10KB over the wire.
function pdfToSvg(buf) {
  const doc = mupdf.Document.openDocument(buf, 'application/pdf')
  const page = doc.loadPage(0)
  const out = new mupdf.Buffer()
  const writer = new mupdf.DocumentWriter(out, 'svg', '')
  const dev = writer.beginPage(page.getBounds())
  page.run(dev, mupdf.Matrix.identity)
  writer.endPage()
  writer.close()
  return out.asString()
    .replace(/-?\d+\.\d+/g, m => Math.round(parseFloat(m)).toString())
    .replace(/\s+xmlns:inkscape="[^"]*"/g, '')
    .replace(/\s+inkscape:[a-z-]+="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\n/g, '')
    .trim()
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['image/svg+xml'],
      fileSizeLimit: '2MB',
    })
    if (error) throw error
    console.log(`✓ created public bucket "${BUCKET}"`)
  }
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) throw new Error(`source dir not found: ${SRC_DIR}`)
  await ensureBucket()

  const only = process.argv.slice(2)
  const files = fs.readdirSync(SRC_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .filter(f => !only.length || only.includes(f.replace(/\.pdf$/i, '')))
    .sort()

  const styles = []
  let done = 0
  for (const file of files) {
    const style = file.replace(/\.pdf$/i, '')
    try {
      const svg = pdfToSvg(fs.readFileSync(path.join(SRC_DIR, file)))
      const { error } = await supabase.storage.from(BUCKET).upload(`${style}.svg`, svg, {
        contentType: 'image/svg+xml',
        cacheControl: '31536000',
        upsert: true,
      })
      if (error) throw error
      styles.push(style)
      done++
      if (done % 20 === 0) console.log(`  … ${done}/${files.length}`)
    } catch (e) {
      console.warn(`  ⚠ ${file}: ${e.message}`)
    }
  }

  styles.sort()
  fs.writeFileSync(MANIFEST, JSON.stringify(styles) + '\n')
  console.log(`✓ uploaded ${done}/${files.length} maquettes → bucket "${BUCKET}"`)
  console.log(`✓ manifest: ${path.relative(ROOT, MANIFEST)} (${styles.length} styles)`)
}

main().catch(e => { console.error(e); process.exit(1) })
