/**
 * Outline SVG icons for the orthopedic addition fields. Single source of truth:
 * the ICONS array below. Emits:
 *   - public/dev/addition-icons.html  (gallery: icon + name + meaning, grouped)
 *   - /tmp montage PNG for visual self-check (via sharp).
 */
import { mkdirSync, writeFileSync } from 'fs'
import sharp from 'sharp'

const S = 64
// Common attrs for a clean, consistent outline look.
const open = `<svg viewBox="0 0 ${S} ${S}" fill="none" stroke="#1c1917" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">`
const gold = '#B8975A'

// Each icon: a body of SVG elements (no <svg> wrapper).
const ICONS = [
  ['toe_box', 'Toe Box', 'Extra room/height over the toes', `
    <path d="M8 46 H56"/>
    <path d="M12 46 V34 Q12 22 28 22 H40 Q52 22 52 34 V46"/>
    <path d="M32 38 V28" stroke="${gold}"/><path d="M27 33 l5 -5 l5 5" stroke="${gold}"/>`],

  ['hammer_toe', 'Hammer Toe', 'A toe bent at the joint', `
    <path d="M10 44 H30"/>
    <path d="M30 44 V24 H44"/>
    <path d="M44 24 V40"/>
    <circle cx="30" cy="24" r="2.6" fill="${gold}" stroke="none"/>`],

  ['hallux_v', 'Hallux Valgus', 'Big-toe deviation (angle)', `
    <path d="M20 52 V30 Q20 18 30 18"/>
    <path d="M20 30 L44 22" stroke="${gold}"/>
    <path d="M38 20 l6 2 l-2 6" stroke="${gold}"/>
    <path d="M14 52 H40"/>`],

  ['bunionette', 'Bunionette 5th Digit', 'Bump on the outer little toe', `
    <path d="M16 52 V26 Q16 16 28 16 H40 Q50 16 50 26"/>
    <circle cx="50" cy="34" r="7" stroke="${gold}"/>
    <path d="M12 52 H44"/>`],

  ['toe_puffs', 'Toe Puffs', 'Stiffened reinforcement at the toe', `
    <path d="M10 46 H54"/>
    <path d="M12 46 V36 Q12 24 30 24 H40 Q52 24 52 36 V46"/>
    <path d="M40 46 Q52 44 52 34" stroke="${gold}"/>
    <path d="M36 46 Q46 45 47 36" stroke="${gold}"/>`],

  ['lining', 'Lining', 'Inner material of the shoe', `
    <path d="M10 46 V30 Q10 18 28 18 H42 Q54 18 54 30 V46"/>
    <path d="M16 46 V32 Q16 24 28 24 H40 Q48 24 48 32 V46" stroke="${gold}"/>`],

  ['cl_laces', 'Closure Laces', 'Lace fastening', `
    <circle cx="22" cy="18" r="2.4"/><circle cx="42" cy="18" r="2.4"/>
    <circle cx="22" cy="32" r="2.4"/><circle cx="42" cy="32" r="2.4"/>
    <circle cx="22" cy="46" r="2.4"/><circle cx="42" cy="46" r="2.4"/>
    <path d="M22 18 L42 32 M42 18 L22 32 M22 32 L42 46 M42 32 L22 46" stroke="${gold}"/>`],

  ['cl_velcro', 'Velcro Straps', 'Hook-and-loop strap', `
    <rect x="10" y="22" width="40" height="20" rx="6"/>
    <path d="M50 32 H58"/>
    <path d="M18 28 v8 M26 28 v8 M34 28 v8 M42 28 v8" stroke="${gold}"/>`],

  ['zipper', 'Zipper', 'Zip closure', `
    <path d="M32 10 V54"/>
    <path d="M24 16 h8 M24 24 h8 M24 32 h8 M40 20 h-8 M40 28 h-8 M40 36 h-8" stroke="${gold}"/>
    <rect x="27" y="40" width="10" height="12" rx="3"/>`],

  ['pad_tongue', 'Extra padding on tongue', 'Cushioned tongue', `
    <rect x="22" y="10" width="20" height="40" rx="9"/>
    <path d="M28 18 v24 M36 18 v24" stroke="${gold}"/>`],

  ['rocker', 'Rocker Sole', 'Curved roll-over sole', `
    <path d="M8 38 Q32 24 56 38"/>
    <path d="M8 38 Q32 50 56 38" />
    <path d="M14 50 H50" stroke="${gold}"/>`],

  ['pu_bumper', 'PU/EVA Bumper', 'Protective sole edge bumper', `
    <path d="M10 40 H54 Q58 40 58 36 V34 H6 V36 Q6 40 10 40 Z"/>
    <path d="M6 34 Q6 28 14 28 H50 Q58 28 58 34" stroke="${gold}"/>`],

  ['heel_wedge', 'Heel Wedge', 'Angled wedge under the heel', `
    <path d="M10 46 H54"/>
    <path d="M14 46 L46 46 L46 28 Z" stroke="${gold}"/>
    <path d="M14 46 L46 28"/>`],

  ['sach_heel', 'SACH Heel', 'Cushioned solid-ankle heel', `
    <path d="M10 46 H54"/>
    <path d="M30 46 V30 H48 V46"/>
    <path d="M30 38 Q22 38 22 46" stroke="${gold}"/>`],

  ['carb_sole', 'Carbon Sole Plate', 'Rigid carbon plate', `
    <rect x="8" y="30" width="48" height="10" rx="5"/>
    <path d="M14 30 l6 10 M22 30 l6 10 M30 30 l6 10 M38 30 l6 10 M46 30 l4 8" stroke="${gold}"/>`],

  ['sole_float', 'Sole Float', 'Added width to the sole edge', `
    <path d="M16 30 H48 V42 H16 Z"/>
    <path d="M48 30 H56 V42 H48" stroke="${gold}"/>
    <path d="M52 26 v20" stroke="${gold}"/>`],

  ['urgent', 'Urgent', 'Rush order', `
    <path d="M34 8 L16 36 H30 L28 56 L48 26 H34 Z" stroke="${gold}"/>`],

  ['no_logo', 'No Piedro logo', 'Omit branding', `
    <rect x="12" y="20" width="40" height="24" rx="5"/>
    <path d="M14 18 L50 46" stroke="${gold}"/>`],

  ['extra_laces', 'Extra Pair of Laces', 'Spare laces included', `
    <path d="M20 22 Q12 30 20 38 Q28 46 20 52"/>
    <path d="M28 22 Q36 30 28 38 Q20 46 28 52" stroke="${gold}"/>
    <circle cx="24" cy="16" r="3"/>`],
]

mkdirSync('public/dev/icons', { recursive: true })

// Render PNGs (verification) + collect svg markup.
const pngs = []
for (const [key, , , body] of ICONS) {
  const svg = `${open}${body}</svg>`
  const png = await sharp(Buffer.from(svg)).resize(96, 96).png().toBuffer()
  await sharp(png).toFile(`public/dev/icons/${key}.png`)
  pngs.push(png)
}

// Montage grid for a single visual check.
const COLS = 5, CELL = 100, rows = Math.ceil(pngs.length / COLS)
const montage = await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 4, background: '#ffffff' } })
  .composite(pngs.map((input, i) => ({ input, left: (i % COLS) * CELL + 2, top: ((i / COLS) | 0) * CELL + 2 })))
  .png().toFile('public/dev/_montage.png')

// Gallery HTML.
const card = ([key, name, meaning, body]) => `
  <figure>
    ${open}${body}</svg>
    <figcaption><b>${name}</b><small>${meaning}</small><code>${key}</code></figcaption>
  </figure>`
const html = `<!doctype html><meta charset="utf-8"><title>Addition icons — Piedro</title>
<style>
  body{font:15px/1.4 system-ui,sans-serif;background:#faf9f7;color:#1c1917;margin:0;padding:40px}
  h1{font-weight:700} p.sub{color:#78716c;margin-top:-8px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px;margin-top:28px}
  figure{margin:0;background:#fff;border:1px solid #eee;border-radius:14px;padding:18px;text-align:center;
    box-shadow:0 1px 3px rgba(0,0,0,.05)}
  figure svg{width:72px;height:72px}
  figcaption{margin-top:10px}
  figcaption b{display:block;font-size:14px}
  figcaption small{display:block;color:#78716c;font-size:12px;margin:2px 0 6px}
  figcaption code{font-size:11px;color:#B8975A}
</style>
<h1>Addition icons — outline set (1.ª vaga)</h1>
<p class="sub">Ícones outline para ilustrar as additions. Dourado = o detalhe que a addition acrescenta.</p>
<div class="grid">${ICONS.map(card).join('')}</div>`
writeFileSync('public/dev/addition-icons.html', html)

console.log('Icons:', ICONS.length)
console.log('Gallery: public/dev/addition-icons.html  | montage: public/dev/_montage.png')
