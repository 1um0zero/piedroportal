/**
 * Backfill the `styles` table from the Piedro maquettes:
 *   - upload each maquette (docs/custom/maquetes/<id>.jpeg) to the public
 *     `maquettes` bucket as `<style_name>.jpg`
 *   - set styles.maquette / maquette_kind
 *   - set styles.num_colours from docs/custom/maquette-colours.json (if present)
 *
 * Prereqs: run migration 043 and create the public `maquettes` bucket first.
 * Usage: node scripts/backfill-style-maquettes.mjs [--apply]
 *   (dry-run by default; pass --apply to upload + write)
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => l.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// distinct style_names (to map files → an existing style)
const styleSet = new Set()
for (let off = 0; ; off += 1000) {
  const { data } = await sb.from('products').select('style_name').range(off, off + 999)
  if (!data?.length) break
  for (const d of data) styleSet.add(String(d.style_name))
  if (data.length < 1000) break
}

const colours = existsSync('docs/custom/maquette-colours.json')
  ? JSON.parse(readFileSync('docs/custom/maquette-colours.json', 'utf8')) : {}

const files = readdirSync('docs/custom/maquetes').filter(f => /\.jpe?g$/i.test(f))
let uploaded = 0, skipped = 0
for (const f of files) {
  const id = f.replace(/\.jpe?g$/i, '')
  // target style: exact id, else base model (strip trailing K)
  const style = styleSet.has(id) ? id : (styleSet.has(id.replace(/K$/, '')) ? id.replace(/K$/, '') : null)
  if (!style) { skipped++; console.log(`  skip ${f} (no style)`); continue }
  const n = colours[id] ?? colours[style] ?? null
  const name = `${style}.jpg`
  console.log(`  ${f} → style ${style} · num_colours=${n ?? '—'} → maquettes/${name}`)
  if (!APPLY) continue
  const bytes = await sharp(`docs/custom/maquetes/${f}`).resize({ width: 800 }).jpeg({ quality: 86 }).toBuffer()
  const up = await sb.storage.from('maquettes').upload(name, bytes, { contentType: 'image/jpeg', upsert: true })
  if (up.error) { console.log(`    ✗ upload: ${up.error.message}`); continue }
  const patch = { maquette: name, maquette_kind: 'jpeg', updated_at: new Date().toISOString() }
  if (n != null) patch.num_colours = n
  const { error } = await sb.from('styles').update(patch).eq('style_name', style)
  if (error) console.log(`    ✗ db: ${error.message}`); else uploaded++
}
console.log(`\n${APPLY ? 'Applied' : 'Dry-run'}: ${uploaded} uploaded, ${skipped} skipped, ${files.length} files.`)
if (!APPLY) console.log('Re-run with --apply to upload + write.')
