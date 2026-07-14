// Regenerates src/components/ui/piedro-feet-paths.ts from the brand logo.
// The Piedro foot mark is built from 56 strap paths (fill rgb(183,197,207)) in
// public/brand/piedro-logo.svg. We keep only those, plus an approx centroid so
// the loader can reveal them heel -> toe.
//
//   node scripts/extract-feet.mjs
import fs from 'node:fs'

const svg = fs.readFileSync('public/brand/piedro-logo.svg', 'utf8')
const re = /<path d="([^"]+)" style="fill:rgb\(183,197,207\)[^"]*"\/>/g

const items = []
let m
while ((m = re.exec(svg))) {
  const d = m[1]
  const nums = (d.match(/-?\d+\.?\d*/g) || []).map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  const ys = nums.filter((_, i) => i % 2 === 1)
  const cx = +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)
  const cy = +(ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1)
  items.push({ d, cx, cy })
}

const header =
  '// AUTO-GENERATED from public/brand/piedro-logo.svg — the 56 strap paths of the\n' +
  '// Piedro foot mark (fill rgb(183,197,207)). cx/cy = approx centroid, used to\n' +
  '// order the reveal (heel -> toe). Regenerate with scripts/extract-feet.mjs.\n\n' +
  'export type FeetStrap = { d: string; cx: number; cy: number }\n\n' +
  'export const FEET_STRAPS: FeetStrap[] = '

fs.writeFileSync(
  'src/components/ui/piedro-feet-paths.ts',
  header + JSON.stringify(items, null, 2) + '\n',
)
console.log(`wrote ${items.length} straps`)
