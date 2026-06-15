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
const BOX = 520          // longest side after trim
const CANVAS = 600       // square canvas
const MARGIN = 24

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

  // trim near-white, fit into BOX, centre on CANVAS with white bg + margin
  const trimmed = await sharp(file).flatten({ background: '#ffffff' }).trim({ threshold: 12 })
    .resize(BOX - MARGIN * 2, BOX - MARGIN * 2, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: '#ffffff' } })
    .composite([{ input: trimmed, gravity: 'center' }])
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
