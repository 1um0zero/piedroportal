#!/usr/bin/env node
/**
 * Optimise raster images under /public so nobody has to think about it.
 *
 *   node scripts/optimize-images.mjs                 # scan ALL of public/
 *   node scripts/optimize-images.mjs a.png b.jpg     # only these files
 *   npm run optimize-images                          # = scan all
 *
 * Runs automatically in .githooks/pre-commit on staged images, so any picture
 * dropped into /public is shrunk before it lands in a commit.
 *
 * Behaviour:
 *  - Resizes so the longest edge ≤ MAX_DIM (never enlarges).
 *  - Re-encodes (mozjpeg for JPG, max-compression for PNG).
 *  - Keeps the SAME filename/extension → never breaks code references.
 *  - Only rewrites a file if the result is actually smaller (and only touches
 *    images over the size/však dimension budget), so it's safe to re-run.
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const MAX_DIM = 2000              // longest edge
const SIZE_BUDGET = 400 * 1024    // only bother with files above this…
const TRIGGER_DIM = 2000          // …or wider/taller than this
const exts = new Set(['.png', '.jpg', '.jpeg'])

function listAll(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listAll(p))
    else if (exts.has(path.extname(e.name).toLowerCase())) out.push(p)
  }
  return out
}

const args = process.argv.slice(2)
const files = (args.length ? args : listAll('public'))
  .filter((f) => exts.has(path.extname(f).toLowerCase()) && fs.existsSync(f))

let saved = 0, touched = 0
for (const file of files) {
  const before = fs.statSync(file).size
  let meta
  try { meta = await sharp(file).metadata() } catch { continue }
  const tooBig = before > SIZE_BUDGET
  const tooLarge = Math.max(meta.width ?? 0, meta.height ?? 0) > TRIGGER_DIM
  if (!tooBig && !tooLarge) continue // already lean — leave it alone (idempotent)

  const ext = path.extname(file).toLowerCase()
  let pipe = sharp(file).resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
  pipe = ext === '.png'
    ? pipe.png({ compressionLevel: 9, adaptiveFiltering: true }) // lossless: safe for logos/diagrams
    : pipe.jpeg({ quality: 82, mozjpeg: true })

  const buf = await pipe.toBuffer()
  if (buf.length < before) {
    fs.writeFileSync(file, buf)
    saved += before - buf.length
    touched++
    console.log(`  ${file}  ${(before / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB`)
  }
}

if (touched) console.log(`✓ optimised ${touched} image(s), saved ${(saved / 1024 / 1024).toFixed(2)}MB`)
else console.log('✓ images already optimised')
