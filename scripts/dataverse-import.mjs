/**
 * Import Piedro products from Dataverse → Supabase
 *
 * Source entities:
 *   cr56f_wpp_style_colors  → one row per product variant (style × colour × closure)
 *   cr56f_wpp_styles        → expanded into each style_color for metadata
 *
 * Usage: node scripts/dataverse-import.mjs [--dry-run]
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// ── Config ───────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const DV_URL       = env.DATAVERSE_URL
const TOKEN_EP     = `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`
const API          = `${DV_URL}/api/data/v9.2`
const DRY_RUN      = process.argv.includes('--dry-run')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch(TOKEN_EP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET,
      scope:         `${DV_URL}/.default`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── API helper with pagination ────────────────────────────────────────────────

async function fetchAll(path, token) {
  const headers = {
    Authorization:   `Bearer ${token}`,
    Accept:          'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version':    '4.0',
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue",odata.maxpagesize=1000',
  }
  let url = `${API}${path}`
  const results = []

  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`${res.status} ${url}: ${await res.text()}`)
    const json = await res.json()
    results.push(...(json.value ?? []))
    url = json['@odata.nextLink'] ?? null
    if (url) process.stdout.write('.')
  }

  return results
}

// ── Gender decode (OptionSet) ─────────────────────────────────────────────────

// Confirmed raw values from this org's OptionSet (see dataverse-check-gender.mjs):
//   979580000 = "KIDS"   979580001 = "MAN" (→MEN)   979580002 = "WOMAN" (→WOMEN)
const GENDER_MAP = { 979580000: 'KIDS', 979580001: 'MEN', 979580002: 'WOMEN' }
const GENDER_LABEL_MAP = { KIDS: 'KIDS', MAN: 'MEN', WOMAN: 'WOMEN' }

function decodeGender(raw, formatted) {
  const label = (formatted ?? '').trim().toUpperCase()
  if (label && GENDER_LABEL_MAP[label]) return GENDER_LABEL_MAP[label]
  return GENDER_MAP[raw] ?? 'MEN'
}

// ── Size parser ───────────────────────────────────────────────────────────────

function parseSize(v) {
  if (v == null || v === '') return null
  const s = String(v).trim().replace(',', '.')
  // Handle fractions: "13½" → 13.5, "4½" → 4.5
  const match = s.match(/^(\d+)[½⅓⅔¼¾]/)
  if (match) {
    const fracs = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 }
    const frac = [...s].find(c => fracs[c])
    return parseFloat(match[1]) + (fracs[frac] ?? 0)
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// ── Constructions builder ─────────────────────────────────────────────────────

function buildConstructions(constructionList, widthList) {
  if (!constructionList) return []
  const constructions = constructionList.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  const widths = widthList
    ? widthList.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    : []

  // If one construction: all widths belong to it
  // If multiple constructions: widths are shared (best we can do without per-construction data)
  return constructions.map(c => ({ construction: c, widths }))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN — no writes\n' : '🚀  Importing to Supabase\n')

  const token = await getToken()
  console.log('✓  Authenticated\n')

  // Fetch all style_colors (main product rows), expanding the style relation
  console.log('📦  Fetching style_colors from Dataverse...')
  const styleColors = await fetchAll(
    '/cr56f_wpp_style_colorses' +
    '?$select=cr56f_wpp_style_colorsid,cr56f_stylecolorid,cr56f_colorcode,' +
    'cr56f_color_name,cr56f_colorbasic,cr56f_closure,cr56f_picture_filename,' +
    'cr56f_hidden,statecode' +
    '&$expand=cr56f_style_id($select=cr56f_name,cr56f_type,cr56f_gender,' +
    'cr56f_diabetics,cr56f_sizefirst,cr56f_sizelast,cr56f_info,cr56f_sibling,' +
    'cr56f_constructionlist,cr56f_widthlist,statecode)',
    token
  )
  console.log(`\n✓  ${styleColors.length} style_color records fetched\n`)

  // Build Supabase product rows
  const products = []
  const skipped  = []

  for (const sc of styleColors) {
    const style = sc.cr56f_style_id

    if (!style) {
      skipped.push({ id: sc.cr56f_wpp_style_colorsid, reason: 'no style relation' })
      continue
    }

    // Skip inactive records
    const active = sc.statecode === 0 && style.statecode === 0 && !sc.cr56f_hidden

    const genderRaw       = style.cr56f_gender
    const genderFormatted = style['cr56f_gender@OData.Community.Display.V1.FormattedValue']
    const section         = decodeGender(genderRaw, genderFormatted)

    const constructions = buildConstructions(
      style.cr56f_constructionlist,
      style.cr56f_widthlist
    )

    products.push({
      id:           sc.cr56f_wpp_style_colorsid,
      style_name:   style.cr56f_name ?? '',
      colour_id:    sc.cr56f_stylecolorid ?? sc.cr56f_colorcode ?? '',
      picture_name: sc.cr56f_picture_filename ? `${sc.cr56f_picture_filename}.jpg` : '',
      section,
      closure:      (sc.cr56f_closure ?? '').trim().toUpperCase(),
      type:         style.cr56f_type ?? '',
      color_basic:  sc.cr56f_colorbasic ?? '',
      color_name:   sc.cr56f_color_name ?? '',
      size_first:   parseSize(style.cr56f_sizefirst) ?? 0,
      size_last:    parseSize(style.cr56f_sizelast)  ?? 0,
      diabetics:    style.cr56f_diabetics ?? false,
      info:         style.cr56f_info   ?? null,
      sibling:      style.cr56f_sibling ?? null,
      active,
      constructions,
    })
  }

  console.log(`✓  ${products.length} products mapped  (${skipped.length} skipped)`)

  // Show gender distribution
  const bySection = products.reduce((acc, p) => {
    acc[p.section] = (acc[p.section] ?? 0) + 1; return acc
  }, {})
  console.log('  Sections:', Object.entries(bySection).map(([k,v]) => `${k}:${v}`).join('  '))
  console.log('  Active:', products.filter(p => p.active).length)

  // Preview first 3
  console.log('\n📋  Preview (first 3):')
  for (const p of products.slice(0, 3)) {
    console.log(`  ${p.style_name} | ${p.section} | ${p.closure} | ${p.color_name} | active:${p.active}`)
    console.log(`    constructions: ${JSON.stringify(p.constructions)}`)
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Skipping Supabase write.')
    return
  }

  // Upsert into Supabase in batches of 200
  console.log('\n💾  Writing to Supabase...')
  const BATCH = 200
  let inserted = 0

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`\n❌  Batch ${i/BATCH + 1} error:`, error.message)
      console.error('   First row:', JSON.stringify(batch[0], null, 2))
      process.exit(1)
    }

    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${products.length} upserted`)
  }

  console.log('\n\n✅  Import complete!')

  if (skipped.length) {
    console.log(`\n⚠  Skipped ${skipped.length} records:`)
    for (const s of skipped.slice(0, 5)) console.log(`  ${s.id}: ${s.reason}`)
  }
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
