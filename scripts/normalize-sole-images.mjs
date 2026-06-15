/**
 * Normalize the raw sole photos (docs/solas_type/solas/**) into uniform, small,
 * web-ready swatches in public/soles/, and emit a manifest mapping each option
 * value (+ optional section) to its image path.
 *
 * Transform per image: trim near-white border → fit within a box → centre on a
 * square white canvas with margin → optimise PNG. Consistent scale + canvas so
 * colours/shapes are comparable in the swatch grid.
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import sharp from 'sharp'

const SRC = 'docs/solas_type/solas'
const OUT = 'public/soles'
const BOX = 1180         // longest side after trim (hi-res for the giant hover preview)
const CANVAS = 1280      // square canvas
const MARGIN = 40

mkdirSync(OUT, { recursive: true })

// filename (without ext) → { field, value, section? }  (option VALUE = exact additions-config string)
const MAP = {
  // pu_type — Cup sole bumpers (gender-specific photo; section picks Ladies vs Mens)
  'Cupsole Mens PU Black':   { field: 'pu_type', value: 'PU Black',  section: 'MEN' },
  'Cupsole Mens PU White':   { field: 'pu_type', value: 'PU White',  section: 'MEN' },
  'Cupsole Mens EVA Black':  { field: 'pu_type', value: 'EVA Black', section: 'MEN' },
  'Cupsole Mens EVA White':  { field: 'pu_type', value: 'EVA White', section: 'MEN' },
  'Cupsole Ladies PU Black': { field: 'pu_type', value: 'PU Black',  section: 'WOMEN' },
  'Cupsole Ladies PU White': { field: 'pu_type', value: 'PU White',  section: 'WOMEN' },
  // runner_sole — sole sheets / plates (bottom-tread)
  'Rubber Sole Fish Black':  { field: 'runner_sole', value: 'Fish Black' },
  'Rubber Sole Fish Amber':  { field: 'runner_sole', value: 'Fish Amber' },
  'Soleplate TR Piedro Black': { field: 'runner_sole', value: 'Piedro Runner Black' },
  'Soleplate TR Piedro Brown': { field: 'runner_sole', value: 'Piedro Runner Amber' }, // FLAG: Brown→Amber?
  // ZSM prefab sneaker (field added later)
  'Sneaker White':     { field: 'zsm_prefab', value: 'Sneaker White 09' },
  'Sneaker Off-White': { field: 'zsm_prefab', value: 'Sneaker Off-White' },
  'Sneaker Beige':     { field: 'zsm_prefab', value: 'Sneaker Light Beige 19' },
  'Sneaker Grey':      { field: 'zsm_prefab', value: 'Sneaker Light Grey 56' },
  'Sneaker Black':     { field: 'zsm_prefab', value: 'Sneaker Black 81' },
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p)
  }
  return out
}

const manifest = []
for (const file of walk(SRC)) {
  const name = basename(file).replace(/\.(png|jpe?g)$/i, '')
  const meta = MAP[name]
  const outName = slug(name) + '.png'
  const outPath = join(OUT, outName)

  // trim near-white, fit into BOX, centre on a white CANVAS
  const trimmed = await sharp(file).flatten({ background: '#ffffff' }).trim({ threshold: 12 })
    .resize(BOX - MARGIN * 2, BOX - MARGIN * 2, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()
  const composed = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: '#ffffff' } })
    .composite([{ input: trimmed, gravity: 'center' }])
    .raw().toBuffer({ resolveWithObject: true })

  // Background removal: flood-fill near-white from the border → transparent.
  // (Edge-connected only, so white *inside* a sole, e.g. PU White, is preserved.)
  const { data, info } = composed
  const { width: W, height: H } = info
  const ch = info.channels
  const NEAR = 236                 // a pixel is "white-ish" if all RGB >= NEAR
  const isWhite = i => data[i] >= NEAR && data[i + 1] >= NEAR && data[i + 2] >= NEAR
  const bg = new Uint8Array(W * H)
  const stack = []
  for (let x = 0; x < W; x++) { stack.push(x, x + (H - 1) * W) }
  for (let y = 0; y < H; y++) { stack.push(y * W, W - 1 + y * W) }
  while (stack.length) {
    const p = stack.pop()
    if (bg[p]) continue
    if (!isWhite(p * ch)) continue
    bg[p] = 1
    const x = p % W, y = (p / W) | 0
    if (x > 0) stack.push(p - 1)
    if (x < W - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - W)
    if (y < H - 1) stack.push(p + W)
  }
  for (let p = 0; p < W * H; p++) if (bg[p]) data[p * ch + 3] = 0   // clear alpha on background

  await sharp(data, { raw: { width: W, height: H, channels: ch } })
    .blur(0.4)                                                     // soften the cut edge a touch
    .png({ quality: 82, compressionLevel: 9 })
    .toFile(outPath)

  manifest.push({ src: name, out: '/soles/' + outName, ...(meta ?? { field: '?', value: name }) })
}

// group manifest by field → { [value]: path } (+ section-specific for pu_type)
const byField = {}
for (const m of manifest) {
  byField[m.field] = byField[m.field] || {}
  const key = m.section ? `${m.value}::${m.section}` : m.value
  byField[m.field][key] = m.out
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(byField, null, 2))
console.log('Normalized', manifest.length, 'images → public/soles/')
console.log('Unmapped (no option value):', manifest.filter(m => m.field === '?').map(m => m.src).join(', ') || 'none')
console.log('Manifest fields:', Object.keys(byField).join(', '))
