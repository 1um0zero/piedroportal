#!/usr/bin/env node
/**
 * Build the flat shoe assets the Additions Insights heat map paints on, from a
 * real Piedro **maquette** — the per-model technical side-drawing (clean vector
 * outline of an actual shoe, heel-left / toe-right). We take one representative
 * model, flood-fill its outer silhouette and keep only the outer contour, so the
 * interior leather-panel seams and the numbered colour tokens are dropped — a
 * clean shoe shape the heat can be painted inside.
 *
 * Why a maquette and not the CUSTOM 3D last: the last (no_additions_l.glb) is a
 * bare mould — it does not read as a shoe. The maquette is a drawing of the
 * finished shoe (sole, heel, laces, collar), so staff and customers immediately
 * recognise it.
 *
 * Outputs:
 *   public/insights/shoe-mask.png     — white silhouette on black (heat clip)
 *   public/insights/shoe-outline.png  — dark outer contour on transparent
 *   src/components/insights/shoe-geometry.json — canvas size + silhouette bounds
 *
 *   node scripts/build-shoe-maquette.mjs         # default style 3467
 *   node scripts/build-shoe-maquette.mjs 3310    # a different maquette
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
process.loadEnvFile(path.join(ROOT, '.env.local'))

const STYLE = process.argv[2] || '3467'      // a clean lace-up, the generic case
const RENDER_W = 1400                          // silhouette resolution
const TAB_CUT_Y = 135                          // trim the "PIEDRO" pull-tab spike
const OUTLINE_R = 3                            // contour half-thickness (px)

const OUT_DIR = path.join(ROOT, 'public', 'insights')
const GEO_OUT = path.join(ROOT, 'src', 'components', 'insights', 'shoe-geometry.json')

// ── 1. Fetch + rasterise the maquette to a line-art bitmap ───────────────────
const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/maquettes/${STYLE}.svg`
const res = await fetch(url)
if (!res.ok) throw new Error(`fetch maquette ${STYLE}: ${res.status}`)
const svg = Buffer.from(await res.arrayBuffer())

const { data, info } = await sharp(svg, { density: 400 })
  .resize(RENDER_W, null, { fit: 'inside' })
  .flatten({ background: '#fff' })
  .grayscale()
  .raw()
  .toBuffer({ resolveWithObject: true })

const w = info.width, h = info.height, ch = info.channels
const line = new Uint8Array(w * h)                 // 1 = dark drawing pixel
for (let i = 0; i < w * h; i++) line[i] = data[i * ch] < 128 ? 1 : 0

// ── 2. Flood-fill the exterior, then invert → filled silhouette ──────────────
const outside = new Uint8Array(w * h)
const stack = []
for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x) }
for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1) }
while (stack.length) {
  const p = stack.pop()
  if (outside[p] || line[p]) continue
  outside[p] = 1
  const x = p % w, y = (p - x) / w
  if (x > 0) stack.push(p - 1)
  if (x < w - 1) stack.push(p + 1)
  if (y > 0) stack.push(p - w)
  if (y < h - 1) stack.push(p + w)
}
const sil = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) sil[i] = outside[i] ? 0 : 1
// Trim the narrow logo pull-tab that spikes above the collar line.
for (let y = 0; y < TAB_CUT_Y; y++) for (let x = 0; x < w; x++) sil[y * w + x] = 0

// ── 3. Outer contour = dilated silhouette boundary ───────────────────────────
const boundary = new Uint8Array(w * h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!sil[y * w + x]) continue
  if (x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
      !sil[y * w + x - 1] || !sil[y * w + x + 1] || !sil[(y - 1) * w + x] || !sil[(y + 1) * w + x]) {
    boundary[y * w + x] = 1
  }
}
const outline = new Uint8Array(w * h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (!boundary[y * w + x]) continue
  for (let dy = -OUTLINE_R; dy <= OUTLINE_R; dy++) for (let dx = -OUTLINE_R; dx <= OUTLINE_R; dx++) {
    const nx = x + dx, ny = y + dy
    if (nx >= 0 && nx < w && ny >= 0 && ny < h && dx * dx + dy * dy <= OUTLINE_R * OUTLINE_R) outline[ny * w + nx] = 1
  }
}

// ── 4. Emit the assets ───────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true })

const maskBuf = Buffer.alloc(w * h)
for (let i = 0; i < w * h; i++) maskBuf[i] = sil[i] ? 255 : 0
await sharp(maskBuf, { raw: { width: w, height: h, channels: 1 } })
  .png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, 'shoe-mask.png'))

const outBuf = Buffer.alloc(w * h * 4)
for (let i = 0; i < w * h; i++) if (outline[i]) { outBuf[i * 4] = 60; outBuf[i * 4 + 1] = 52; outBuf[i * 4 + 2] = 44; outBuf[i * 4 + 3] = 235 }
await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, 'shoe-outline.png'))

// Silhouette bounding box (for the component to place labels/heat).
let mnx = w, mny = h, mxx = 0, mxy = 0
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sil[y * w + x]) {
  if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y
}
const geo = {
  _comment: `Generated by scripts/build-shoe-maquette.mjs from maquette ${STYLE} — do not edit by hand.`,
  style: STYLE,
  width: w,
  height: h,
  shoe: { x: mnx, y: mny, w: mxx - mnx, h: mxy - mny },
}
fs.writeFileSync(GEO_OUT, JSON.stringify(geo, null, 2) + '\n')

// Clean up the old GLB-based asset if present.
const stale = path.join(OUT_DIR, 'shoe.webp')
if (fs.existsSync(stale)) fs.unlinkSync(stale)

console.log(`style ${STYLE}: ${w}×${h}, shoe bounds`, geo.shoe)
console.log('wrote public/insights/shoe-mask.png, shoe-outline.png, shoe-geometry.json')
