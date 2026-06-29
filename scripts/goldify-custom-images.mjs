// Recolour the black line-art heel/sole drawings into the gold theme (#B8975A)
// used by the Toe Shape chips, on a transparent background so they sit cleanly
// on the white chip cards. Black lines → opaque gold, white → transparent.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const GOLD = { r: 0xB8, g: 0x97, b: 0x5A }

// Each batch: source dir, output dir, and source-file → output-slug map.
const BATCHES = [
  {
    src: 'docs/custom/heel', out: 'public/custom/heel',
    map: {
      'heel.png':                  'heel.png',
      'heel_hollow_edge.png':      'hollow-wedge.png',
      'heel_full_hollow_edge.png': 'fully-hollow-wedge.png',
      'heel_wedge.png':            'wedge.png',
    },
  },
  {
    src: 'docs/custom/stretch', out: 'public/custom/stretch',
    map: {
      'additions_stretch_upper.png': 'upper.png',
      'additions_stretch_side.png':  'medial-lateral.png',
    },
  },
]

for (const { src: SRC, out: OUT, map: MAP } of BATCHES) {
  mkdirSync(resolve(OUT), { recursive: true })
  for (const [file, slug] of Object.entries(MAP)) {
    const src = resolve(SRC, file)
    const dst = resolve(OUT, slug)
    const img = sharp(src).ensureAlpha()
    const { width, height } = await img.metadata()
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    const ch = info.channels
    const out = Buffer.alloc(width * height * 4)
    for (let i = 0, o = 0; i < data.length; i += ch, o += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const a = ch === 4 ? data[i + 3] : 255
      const lum = 0.299 * r + 0.587 * g + 0.114 * b   // 0 black … 255 white
      out[o] = GOLD.r
      out[o + 1] = GOLD.g
      out[o + 2] = GOLD.b
      out[o + 3] = Math.round((a / 255) * (255 - lum)) // dark = opaque, white = transparent
    }
    await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(dst)
    console.log('✓', `${OUT}/${slug}`)
  }
}
