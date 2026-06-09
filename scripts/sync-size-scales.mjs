/**
 * Sync per-style size scale (unit + first/last) from Dataverse → Supabase.
 *
 * Each Dataverse style (cr56f_wpp_styles) has a size scale (lookup cr56f_scale,
 * whose name is like "EU (24-46)" or "UK (3-13½)") plus cr56f_sizefirst /
 * cr56f_sizelast. We set products.size_unit ('EU'|'UK') and correct size_first/
 * size_last where they disagree (falling back to the range parsed from the scale
 * name when the style's own first/last is empty — e.g. styles 4900/4901).
 *
 * Writes the same values to every colour variant of a style.
 *
 *   node scripts/sync-size-scales.mjs            → report only (no writes)
 *   node scripts/sync-size-scales.mjs --apply    → apply updates
 *
 * Requires migration 015 (size_unit column) before --apply.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))

const API = `${env.DATAVERSE_URL}/api/data/v9.2`
const FV = '@OData.Community.Display.V1.FormattedValue'
const APPLY = process.argv.includes('--apply')

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }),
  })
  const j = await r.json(); if (!j.access_token) throw new Error(JSON.stringify(j)); return j.access_token
}

function parseSize(v) {
  if (v == null || v === '') return null
  const s = String(v).trim().replace(',', '.')
  const m = s.match(/^(\d+)([½⅓⅔¼¾])/)
  if (m) { const f = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 }; return parseFloat(m[1]) + (f[m[2]] || 0) }
  const n = parseFloat(s); return isNaN(n) ? null : n
}

// "EU (24-46)" → { unit:'EU', min:24, max:46 } ; "UK (3-13½)" → { unit:'UK', min:3, max:13.5 }
function parseScaleName(name) {
  const s = String(name || '')
  const unit = s.trim().slice(0, 2).toUpperCase()
  const m = s.match(/\(([^-]+)-([^)]+)\)/)
  return {
    unit: unit === 'EU' || unit === 'UK' ? unit : null,
    min: m ? parseSize(m[1]) : null,
    max: m ? parseSize(m[2]) : null,
  }
}

async function main() {
  const T = await token()
  const get = async (u) => {
    const r = await fetch(API + u, { headers: { Authorization: `Bearer ${T}`, Prefer: 'odata.include-annotations="*",odata.maxpagesize=2000' } })
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
    return r.json()
  }

  // Build style → { unit, first, last }
  const st = await get(`/cr56f_wpp_styleses?$select=cr56f_name,cr56f_sizefirst,cr56f_sizelast,_cr56f_scale_value&$top=5000`)
  const byStyle = new Map()
  for (const r of st.value) {
    const scale = parseScaleName(r[`_cr56f_scale_value${FV}`])
    byStyle.set(r.cr56f_name, {
      unit: scale.unit,
      first: parseSize(r.cr56f_sizefirst) ?? scale.min,
      last: parseSize(r.cr56f_sizelast) ?? scale.max,
    })
  }
  console.log(`Dataverse: ${byStyle.size} styles`)

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  let rows = [], from = 0
  while (true) {
    const { data } = await sb.from('products').select('style_name,size_first,size_last').range(from, from + 999)
    rows = rows.concat(data); if (data.length < 1000) break; from += 1000
  }
  const dbStyles = [...new Set(rows.map(r => r.style_name))]

  // Which styles need a size_first/last correction?
  const dbFirstLast = new Map()
  for (const r of rows) if (!dbFirstLast.has(r.style_name)) dbFirstLast.set(r.style_name, { first: r.size_first, last: r.size_last })

  let unitUpdates = 0, numFixes = 0, missing = []
  for (const s of dbStyles) {
    const dv = byStyle.get(s)
    if (!dv || !dv.unit) { missing.push(s); continue }
    const cur = dbFirstLast.get(s)
    const fixNums = cur && (cur.first !== dv.first || cur.last !== dv.last)
    if (fixNums) { numFixes++; console.log(`  fix ${s}: ${cur.first}-${cur.last} → ${dv.first}-${dv.last} (${dv.unit})`) }
    unitUpdates++
    if (APPLY) {
      const patch = fixNums
        ? { size_unit: dv.unit, size_first: dv.first, size_last: dv.last }
        : { size_unit: dv.unit }
      const { error } = await sb.from('products').update(patch).eq('style_name', s)
      if (error) console.error(`  ✗ ${s}: ${error.message}`)
    }
  }

  console.log(`\n${APPLY ? 'APPLIED' : 'WOULD APPLY'}: ${unitUpdates} styles get size_unit, ${numFixes} also get first/last fixed`)
  if (missing.length) console.log(`⚠ ${missing.length} styles without a resolvable scale (skipped):`, missing.slice(0, 20).join(', '))
  if (!APPLY) console.log('\n(run with --apply to write)')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
