#!/usr/bin/env node
/**
 * Render the REAL Piedro last (`no_additions_l.glb`, the clean "no additions"
 * model used by the CUSTOM 3D preview) into the flat assets the Additions
 * Insights heat map paints on:
 *
 *   public/insights/shoe.webp       — shaded side view, transparent background
 *   public/insights/shoe-mask.png   — white silhouette on black (SVG mask)
 *   src/components/insights/shoe-geometry.json — bounds + zone anchor points
 *
 * Why bake instead of loading the GLB live: the dashboard is an analytics page.
 * Shipping a 3 MB GLB + the three.js runtime to draw a static backdrop would
 * cost far more than a ~40 KB image, and the SVG overlay keeps the zone chips
 * clickable, translatable and printable. The realism comes from the same source
 * model the 3D preview uses, so the two views agree.
 *
 * Pure software rasteriser (no GPU/headless browser): parse GLB → compose node
 * transforms → orthographic project → z-buffered Lambert shading → sharp.
 *
 *   node scripts/build-shoe-maquette.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
process.loadEnvFile(path.join(ROOT, '.env.local'))

const MODEL = 'no_additions_l.glb'
const OUT_DIR = path.join(ROOT, 'public', 'insights')
const GEO_OUT = path.join(ROOT, 'src', 'components', 'insights', 'shoe-geometry.json')
const CACHE = path.join(ROOT, '.next', 'cache', MODEL)

// Supersampled render, downsampled at the end for clean edges.
const W = 1600, H = 1000, SS = 2
const RW = W * SS, RH = H * SS

// ── GLB parsing ──────────────────────────────────────────────────────────────

async function loadGlb() {
  if (!fs.existsSync(CACHE)) {
    fs.mkdirSync(path.dirname(CACHE), { recursive: true })
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/3d/${MODEL}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`fetch ${MODEL}: ${r.status}`)
    fs.writeFileSync(CACHE, Buffer.from(await r.arrayBuffer()))
  }
  const buf = fs.readFileSync(CACHE)
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB')
  let off = 12
  const chunks = []
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    chunks.push({ type: buf.toString('ascii', off + 4, off + 8).trim(), off: off + 8, len })
    off += 8 + len
  }
  const json = JSON.parse(buf.toString('utf8', chunks[0].off, chunks[0].off + chunks[0].len))
  const bin = buf.subarray(chunks[1].off, chunks[1].off + chunks[1].len)
  return { json, bin }
}

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

function readAccessor(json, bin, index) {
  const acc = json.accessors[index]
  const view = json.bufferViews[acc.bufferView]
  const Ctor = COMPONENT[acc.componentType]
  const n = NUM[acc.type]
  const byteOffset = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0)
  // Copy: the underlying Buffer is not guaranteed to be aligned for the typed array.
  const bytes = Ctor.BYTES_PER_ELEMENT * n * acc.count
  const slice = Buffer.from(bin.subarray(byteOffset, byteOffset + bytes))
  return new Ctor(slice.buffer, slice.byteOffset, n * acc.count)
}

// ── Matrix helpers (column-major 4×4, glTF convention) ───────────────────────

const mIdentity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

function mMul(a, b) {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
    o[c * 4 + r] = s
  }
  return o
}

function trs(node) {
  if (node.matrix) return node.matrix.slice()
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2
  const yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

function xformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ]
}
function xformDir(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  ]
}

// ── Collect world-space triangles ────────────────────────────────────────────

function collect(json, bin) {
  const positions = [], normals = [], indices = []
  const walk = (nodeIndex, parent) => {
    const node = json.nodes[nodeIndex]
    const world = mMul(parent, trs(node))
    if (node.mesh != null) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const pos = readAccessor(json, bin, prim.attributes.POSITION)
        const nor = prim.attributes.NORMAL != null ? readAccessor(json, bin, prim.attributes.NORMAL) : null
        const idx = readAccessor(json, bin, prim.indices)
        const base = positions.length / 3
        for (let i = 0; i < pos.length; i += 3) {
          const p = xformPoint(world, [pos[i], pos[i + 1], pos[i + 2]])
          positions.push(p[0], p[1], p[2])
          if (nor) {
            const n = xformDir(world, [nor[i], nor[i + 1], nor[i + 2]])
            const len = Math.hypot(n[0], n[1], n[2]) || 1
            normals.push(n[0] / len, n[1] / len, n[2] / len)
          } else normals.push(0, 0, 1)
        }
        for (let i = 0; i < idx.length; i++) indices.push(base + idx[i])
      }
    }
    for (const child of node.children ?? []) walk(child, world)
  }
  for (const root of json.scenes[json.scene ?? 0].nodes) walk(root, mIdentity())
  return { positions, normals, indices }
}

// ── Render ───────────────────────────────────────────────────────────────────

function render({ positions, normals, indices }) {
  // World bounds.
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i])
    minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1])
    minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2])
  }
  const size = [maxX - minX, maxY - minY, maxZ - minZ]
  // The longest axis is the heel→toe direction; the shortest is the medial↔lateral
  // width, which is exactly the axis we look down for a side view.
  const order = [0, 1, 2].sort((a, b) => size[b] - size[a])
  const AX_LONG = order[0], AX_UP = order[1], AX_DEPTH = order[2]

  const get = (vi, ax) => positions[vi * 3 + ax]
  const getN = (vi, ax) => normals[vi * 3 + ax]

  // Toe points right: flip the long axis if the toe (narrow end) sits on the right
  // already — decided by comparing cross-section extent at both ends.
  const loEnd = [], hiEnd = []
  const lo = minX, span = size[AX_LONG]
  const longMin = [minX, minY, minZ][AX_LONG]
  for (let v = 0; v < positions.length / 3; v++) {
    const t = (get(v, AX_LONG) - longMin) / span
    if (t < 0.12) loEnd.push(get(v, AX_UP))
    else if (t > 0.88) hiEnd.push(get(v, AX_UP))
  }
  const extent = a => (a.length ? Math.max(...a) - Math.min(...a) : 0)
  // The heel end is the taller one; we want it on the LEFT, so flip when the
  // taller end is currently at the high side of the long axis.
  const flipLong = extent(hiEnd) > extent(loEnd)
  void lo

  const pad = 0.06
  const wSpan = size[AX_LONG] * (1 + pad * 2)
  const hSpan = size[AX_UP] * (1 + pad * 2)
  const scale = Math.min(RW / wSpan, RH / hSpan)
  const cxW = ([minX, minY, minZ][AX_LONG] + [maxX, maxY, maxZ][AX_LONG]) / 2
  const cyW = ([minX, minY, minZ][AX_UP] + [maxX, maxY, maxZ][AX_UP]) / 2

  const projX = v => RW / 2 + ((get(v, AX_LONG) - cxW) * (flipLong ? -1 : 1)) * scale
  const projY = v => RH / 2 - (get(v, AX_UP) - cyW) * scale

  const zbuf = new Float32Array(RW * RH).fill(-Infinity)
  const rgba = Buffer.alloc(RW * RH * 4, 0)

  // Near-neutral light grey, lit from the upper left-front. Deliberately NOT
  // leather-coloured: the heat ramp is multiplied over this render, and a warm
  // beige base turns every hot zone muddy brown. A neutral base lets the heat
  // colour read true while the shading still carries the 3D form.
  const LIGHT = [-0.45, 0.72, 0.53]
  const LL = Math.hypot(...LIGHT)
  const L = LIGHT.map(v => v / LL)
  const BASE = [226, 224, 221]

  // Depth sign: draw the side facing the camera.
  const depthOf = v => get(v, AX_DEPTH)

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2]
    const ax = projX(a), ay = projY(a), bx = projX(b), by = projY(b), cx = projX(c), cy = projY(c)
    const minPx = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
    const maxPx = Math.min(RW - 1, Math.ceil(Math.max(ax, bx, cx)))
    const minPy = Math.max(0, Math.floor(Math.min(ay, by, cy)))
    const maxPy = Math.min(RH - 1, Math.ceil(Math.max(ay, by, cy)))
    if (minPx > maxPx || minPy > maxPy) continue

    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    if (area === 0) continue
    const inv = 1 / area

    const za = depthOf(a), zb = depthOf(b), zc = depthOf(c)

    for (let py = minPy; py <= maxPy; py++) {
      for (let px = minPx; px <= maxPx; px++) {
        const sx = px + 0.5, sy = py + 0.5
        let w0 = ((bx - ax) * (sy - ay) - (by - ay) * (sx - ax)) * inv
        let w1 = ((sx - ax) * (cy - ay) - (sy - ay) * (cx - ax)) * inv
        // barycentric: w2 for a, w1 for b, w0 for c
        const wb = w1, wc = w0, wa = 1 - w1 - w0
        if (wa < 0 || wb < 0 || wc < 0) continue

        const z = wa * za + wb * zb + wc * zc
        const o = py * RW + px
        if (z <= zbuf[o]) continue
        zbuf[o] = z

        let nx = wa * getN(a, AX_LONG) * (flipLong ? -1 : 1) + wb * getN(b, AX_LONG) * (flipLong ? -1 : 1) + wc * getN(c, AX_LONG) * (flipLong ? -1 : 1)
        let ny = wa * getN(a, AX_UP) + wb * getN(b, AX_UP) + wc * getN(c, AX_UP)
        let nz = wa * getN(a, AX_DEPTH) + wb * getN(b, AX_DEPTH) + wc * getN(c, AX_DEPTH)
        const nl = Math.hypot(nx, ny, nz) || 1
        nx /= nl; ny /= nl; nz /= nl
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz }

        const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
        // Ambient + wrapped diffuse + a gentle rim so the silhouette reads.
        const rim = Math.pow(1 - Math.min(1, nz), 2.2) * 0.18
        const shade = 0.46 + 0.54 * Math.pow(diff, 0.85) + rim
        const p = o * 4
        rgba[p] = Math.min(255, Math.round(BASE[0] * shade))
        rgba[p + 1] = Math.min(255, Math.round(BASE[1] * shade))
        rgba[p + 2] = Math.min(255, Math.round(BASE[2] * shade))
        rgba[p + 3] = 255
      }
    }
  }

  // Pixel bounds of the rendered silhouette → so the SVG can place zones exactly.
  let bMinX = RW, bMinY = RH, bMaxX = 0, bMaxY = 0
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    if (rgba[(y * RW + x) * 4 + 3]) {
      if (x < bMinX) bMinX = x
      if (x > bMaxX) bMaxX = x
      if (y < bMinY) bMinY = y
      if (y > bMaxY) bMaxY = y
    }
  }
  return { rgba, bounds: { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY } }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const { json, bin } = await loadGlb()
const mesh = collect(json, bin)
console.log(`mesh: ${mesh.positions.length / 3} verts, ${mesh.indices.length / 3} tris`)

const { rgba, bounds } = render(mesh)
fs.mkdirSync(OUT_DIR, { recursive: true })

const img = sharp(rgba, { raw: { width: RW, height: RH, channels: 4 } })
  .resize(W, H, { kernel: 'lanczos3' })

await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT_DIR, 'shoe.webp'))

// Mask: white where the shoe is, black elsewhere (SVG luminance mask).
await img.clone()
  .ensureAlpha()
  .extractChannel('alpha')
  .toColorspace('b-w')
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT_DIR, 'shoe-mask.png'))

const geo = {
  _comment: `Generated by scripts/build-shoe-maquette.mjs from ${MODEL} — do not edit by hand.`,
  width: W,
  height: H,
  // Silhouette bounding box in the output image's pixel space.
  shoe: {
    x: Math.round(bounds.minX / SS),
    y: Math.round(bounds.minY / SS),
    w: Math.round((bounds.maxX - bounds.minX) / SS),
    h: Math.round((bounds.maxY - bounds.minY) / SS),
  },
}
fs.writeFileSync(GEO_OUT, JSON.stringify(geo, null, 2) + '\n')

console.log('bounds', geo.shoe)
console.log('wrote public/insights/shoe.webp, shoe-mask.png, shoe-geometry.json')
