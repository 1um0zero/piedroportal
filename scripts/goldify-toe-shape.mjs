// Restore the CORRECT toe shapes: recolour Piedro's ORIGINAL line-art
// (Martijn's slide 3, image11.png) into the gold theme (#B8975A) on a
// transparent bg. Martijn flagged my hand-drawn SVGs as wrong — these are
// the authentic drawings.
import sharp from 'sharp'
import { resolve } from 'node:path'

// Source = Piedro's original toe-shape line-art, extracted from Martijn's
// slide 3 (FO_orderportal_30-6-2026.pptx, media/image11.png) into docs/custom.
const SRC = resolve('docs/custom/toe-shape-original.png')
const OUT = resolve('public/custom/toe-shape')
const GOLD = { r: 0xB8, g: 0x97, b: 0x5A }

// col: [slug, left, width] — 4 equal 98px columns, shapes centred, height 0–88 (labels below)
const COLS = [
  ['square', 0, 98],
  ['pointed', 98, 98],
  ['rounded', 196, 98],
  ['nature', 294, 98],
]

for (const [slug, left, width] of COLS) {
  // Upscale 3× (smooth) so the thin source line becomes a fuller, antialiased stroke.
  const base = sharp(SRC).extract({ left, top: 0, width, height: 88 })
    .resize(width * 3, 88 * 3, { kernel: 'cubic' }).ensureAlpha()
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const W = info.width, H = info.height
  // alpha from luminance (dark = opaque gold)
  const alpha = new Float32Array(W * H)
  for (let p = 0, i = 0; p < W * H; p++, i += ch) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const a = ch === 4 ? data[i + 3] : 255
    alpha[p] = (a / 255) * (255 - lum)
  }
  // one dilation pass (3×3 max) to give the stroke a bit more body
  const dil = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy, nx = x + dx
      if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue
      const v = alpha[ny * W + nx]
      if (v > m) m = v
    }
    dil[y * W + x] = m
  }
  const out = Buffer.alloc(W * H * 4)
  for (let p = 0, o = 0; p < W * H; p++, o += 4) {
    out[o] = GOLD.r
    out[o + 1] = GOLD.g
    out[o + 2] = GOLD.b
    out[o + 3] = Math.round(dil[p])
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 12 })                 // crop away transparent margins
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT, `${slug}.png`))
  console.log('✓', `public/custom/toe-shape/${slug}.png`)
}
