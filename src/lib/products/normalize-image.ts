import 'server-only'
import sharp from 'sharp'

/**
 * Image processing for product uploads. Two modes:
 *
 *  - {@link resizeToPng}   — decode, honour EXIF rotation, fit inside MAX_DIM
 *                            (no enlargement), emit PNG. Background is kept as-is.
 *  - {@link normalizeToPng} — additionally remove a plain (border-connected)
 *                            white background, trim to the content bounding box,
 *                            and re-centre on a fixed transparent square so every
 *                            shoe renders at the same scale. Mirrors the batch
 *                            script scripts/normalize-product-images.mjs.
 *
 * Automatic background removal only works on a plain white background; coloured
 * or busy backgrounds (and strong shadows) won't come out clean — the result
 * must be visually checked.
 */

const MAX_DIM = 1200 // max width/height for the plain resize path

// ── Normalise tuning (kept in sync with the batch script) ────────────────────
const CANVAS = 700 // output square size (px)
const FILL = 0.9 // fraction of canvas the trimmed shoe should fill
const WHITE = 240 // R,G,B all >= this ⇒ treated as background white
const TRIM_THR = 12 // sharp trim tolerance

/** Plain path: rotate → fit inside MAX_DIM → PNG. Background untouched. */
export async function resizeToPng(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // honour EXIF orientation
    .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
}

/**
 * Normalise path: edge flood-fill white → transparent, trim to content, centre
 * on a transparent CANVAS square at FILL scale. Always returns a transparent PNG.
 */
export async function normalizeToPng(input: Buffer): Promise<Buffer> {
  const oriented = await sharp(input).rotate().png().toBuffer()
  const { data: raw, info } = await sharp(oriented)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels } = info // channels === 4

  // Already transparent? (sample the four corners.)
  const cornerAlpha = [
    raw[3],
    raw[(W - 1) * channels + 3],
    raw[(H - 1) * W * channels + 3],
    raw[((H - 1) * W + (W - 1)) * channels + 3],
  ]
  const alreadyTransparent = cornerAlpha.every(a => a < 16)

  // Opaque white background ⇒ edge flood-fill white → transparent.
  if (!alreadyTransparent) {
    const isWhite = (o: number) => raw[o] >= WHITE && raw[o + 1] >= WHITE && raw[o + 2] >= WHITE
    const visited = new Uint8Array(W * H)
    const stack: number[] = []
    const pushIf = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return
      const p = y * W + x
      if (visited[p]) return
      visited[p] = 1
      if (isWhite(p * channels)) stack.push(p)
    }
    for (let x = 0; x < W; x++) {
      pushIf(x, 0)
      pushIf(x, H - 1)
    }
    for (let y = 0; y < H; y++) {
      pushIf(0, y)
      pushIf(W - 1, y)
    }
    while (stack.length) {
      const p = stack.pop()!
      raw[p * channels + 3] = 0 // clear alpha
      const x = p % W
      const y = (p - x) / W
      pushIf(x - 1, y)
      pushIf(x + 1, y)
      pushIf(x, y - 1)
      pushIf(x, y + 1)
    }
  }

  // Rebuild, trim to content bbox.
  let trimmed = sharp(Buffer.from(raw), { raw: { width: W, height: H, channels } })
  try {
    trimmed = sharp(
      await trimmed
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: TRIM_THR })
        .png()
        .toBuffer()
    )
  } catch {
    // Uniform image → trim throws; skip it.
    trimmed = sharp(Buffer.from(raw), { raw: { width: W, height: H, channels } })
  }

  // Resize trimmed content into the inner box, then centre on transparent canvas.
  const inner = Math.round(CANVAS * FILL)
  const resized = await trimmed
    .resize(inner, inner, {
      fit: 'inside',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer()
}
