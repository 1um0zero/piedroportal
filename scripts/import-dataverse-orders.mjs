/**
 * Import existing orders from Dataverse → Supabase orders table.
 * Maps company_id and product_id via Dataverse UUIDs (same as Supabase IDs).
 *
 * Usage: node scripts/import-dataverse-orders.mjs [--dry-run] [--limit=100]
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb      = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DV_URL  = env.DATAVERSE_URL
const API     = `${DV_URL}/api/data/v9.2`
const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT   = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

// ── Auth ──────────────────────────────────────────────────────────────────────
const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) }
)).json()

const H = {
  Authorization: `Bearer ${access_token}`, Accept: 'application/json',
  'OData-Version': '4.0', 'OData-MaxVersion': '4.0',
  Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue",odata.maxpagesize=500',
}

// ── Unit decode ───────────────────────────────────────────────────────────────
function decodeUnit(raw) {
  const map = {
    979580000: 'LEFT', 979580001: 'RIGHT',
    979580002: 'PAIR', 979580003: 'LEFT_RIGHT', 979580004: 'PAIR',
  }
  return map[raw] ?? 'PAIR'
}

// ── Status decode ─────────────────────────────────────────────────────────────
function decodeStatus(statecode, step, hasApproval) {
  if (statecode === 1) return 'cancelled'
  if (hasApproval) return 'approved'
  if (step && step > 1) return 'submitted'
  return 'submitted'  // all existing orders treated as submitted
}

// ── Map additions fields ──────────────────────────────────────────────────────
function mapAdditions(o) {
  const sided = (lf, rf) => ({ l: lf ?? null, r: rf ?? null })
  const bool  = (lf, rf) => ({ l: lf === true, r: rf === true })
  // Choice (option-set) fields come back as numeric codes; read the human-readable
  // label from the OData FormattedValue annotation instead (Prefer header includes it).
  const fv = (field) => o[`${field}@OData.Community.Display.V1.FormattedValue`] ?? null
  const optSided = (lf, rf) => ({ l: fv(lf), r: fv(rf) })
  return {
    // Section 1: Additions
    lat_joint_w:  sided(o.cr56f_lateraljointwidthlf, o.cr56f_lateraljointwidthrf),
    med_joint_w:  sided(o.cr56f_medialjointwidthlf, o.cr56f_medialjointwidthrf),
    lat_heel_w:   sided(o.cr56f_lateralheelwidthlf, o.cr56f_lateralheelwidthrf),
    med_heel_w:   sided(o.cr56f_medialheelwidthlf, o.cr56f_medialheelwidthrf),
    hammer_toe:   sided(o.cr56f_2hammertoelf, o.cr56f_2hammertoerf),
    toe_box:      sided(o.cr56f_2toeboxlf, o.cr56f_2toeboxrf),
    bunionette:   sided(o.cr56f_2bunionettelf, o.cr56f_2bunionetterf),
    hallux_v:     sided(o.cr56f_2halluxvalguslf, o.cr56f_2halluxvalgusrf),
    depth_fore:   sided(o.cr56f_2depthtoforepartlf, o.cr56f_2depthtoforepartrf),
    depth_toe:    sided(o.cr56f_2depthtotoeheellf, o.cr56f_2depthtotoeheelrf),
    xw_cone:      sided(o.cr56f_2extrawidthonconelf, o.cr56f_2extrawidthonconerf),
    str_heel:     sided(o.cr56f_2straightenheelcliplf, o.cr56f_2straightenheelcliprf),
    heel_depth:   sided(o.cr56f_2heeldepthonlylf, o.cr56f_2heeldepthonlyrf),
    haglund:      sided(o.cr56f_2haglundheelexostosislf, o.cr56f_2haglundheelexostosisrf),
    xs_med_ank:   sided(o.cr56f_3extraspacemedialanklelf, o.cr56f_3extraspacemedialanklerf),
    xs_lat_ank:   sided(o.cr56f_3extraspacelateralanklelf, o.cr56f_3extraspacelateralanklerf),
    // Section 2: Upper
    lining:        optSided('cr56f_lininglf', 'cr56f_liningrf'),
    cl_laces:      optSided('cr56f_closurelaceslf', 'cr56f_closurelacesrf'),
    cl_velcro:     optSided('cr56f_closurevelcrostrapslf', 'cr56f_closurevelcrostrapsrf'),
    stiff_hard:    optSided('cr56f_stiffenerhardnesslf', 'cr56f_stiffenerhardnessrf'),
    toe_puffs:     optSided('cr56f_toepuffslf', 'cr56f_toepuffsrf'),
    toe_puffs_rim: bool(o.cr56f_toepuffsrimlf, o.cr56f_toepuffsrimrf),
    str_leather:   bool(o.cr56f_stretchleatherlf, o.cr56f_stretchleatherrf),
    instep_front:  sided(o.cr56f_instepmoretothefrontlf, o.cr56f_instepmoretothefrontrf),
    colour_mod:    sided(o.cr56f_colourmodificationslf, o.cr56f_colourmodificationsrf),
    pad_tongue:    sided(o.cr56f_extrapaddingontonguelf, o.cr56f_extrapaddingontonguerf),
    zipper:        optSided('cr56f_zipperlf', 'cr56f_zipperrf'),
    // Section 3: Sole & Heel
    rocker:       optSided('cr56f_2rockersoletypeslf', 'cr56f_2rockersoletypesrf'),
    rocker_toes:  sided(o.cr56f_2toeslf, o.cr56f_2toesrf),
    rocker_joint: sided(o.cr56f_2jointlf, o.cr56f_2jointrf),
    rocker_heel:  sided(o.cr56f_2heellf, o.cr56f_2heelrf),
    pu_bumper:    bool(o.cr56f_6soleamendement2lf, o.cr56f_6soleamendement2rf),
    amend_sole:   bool(o.cr56f_6soleamendement1lf, o.cr56f_6soleamendement1rf),
    sole_float:   bool(o.cr56f_3solefloatlf, o.cr56f_3solefloatrf),
    sf_medial:    sided(o.cr56f_3sf_mediallf, o.cr56f_3sf_medialrf),
    sf_lateral:   sided(o.cr56f_3sf_laterallf, o.cr56f_3sf_lateralrf),
    heel_float:   bool(o.cr56f_3heelfloatlf, o.cr56f_3heelfloatrf),
    hf_medial:    sided(o.cr56f_3hf_mediallf, o.cr56f_3hf_medialrf),
    hf_lateral:   sided(o.cr56f_3hf_laterallf, o.cr56f_3hf_lateralrf),
    sole_wedge:   bool(o.cr56f_4solewedgelf, o.cr56f_4solewedgerf),
    sw_medial:    sided(o.cr56f_4sw_mediallf, o.cr56f_4sw_medialrf),
    sw_lateral:   sided(o.cr56f_4sw_laterallf, o.cr56f_4sw_lateralrf),
    heel_wedge:   bool(o.cr56f_4heelwedgelf, o.cr56f_4heelwedgerf),
    hw_medial:    sided(o.cr56f_4hw_mediallf, o.cr56f_4hw_medialrf),
    hw_lateral:   sided(o.cr56f_4hw_laterallf, o.cr56f_4hw_lateralrf),
    carb_insole:  bool(o.cr56f_6removablecarboninsolelf, o.cr56f_6removablecarboninsolerf),
    carb_sole:    bool(o.cr56f_6fullcarbonsoleplatelf, o.cr56f_6fullcarbonsoleplaterf),
    sach_heel:    bool(o.cr56f_6sachheellf, o.cr56f_6sachheelrf),
    sep_soles:    bool(o.cr56f_6separatesoleslf, o.cr56f_6separatesolesrf),
    sep_sheets:   bool(o.cr56f_6separatesheetslf, o.cr56f_6separatesheetsrf),
    thomas_med:   bool(o.cr56f_6thomasheelmediallf, o.cr56f_6thomasheelmedialrf),
    thomas_lat:   bool(o.cr56f_6thomasheellaterallf, o.cr56f_6thomasheellateralrf),
    // Section 4: Others
    welt_prot:   bool(o.cr56f_7weltprotectorlf, o.cr56f_7weltprotectorrf),
    prot_toe:    bool(o.cr56f_7protectivetoecaplf, o.cr56f_7protectivetoecaprf),
    xtra_laces:  o.cr56f_7extrapairoflaces === true,
    no_logo:     o.cr56f_nopiedrologo === true,
    plastic_fit: o.cr56f_7plasticfittingshoes === true,
    urgent:      o.cr56f_7urgent === true,
  }
}

// ── Fetch Dataverse orders ────────────────────────────────────────────────────
console.log('Fetching orders from Dataverse...')

const SELECT = [
  'cr56f_wpp_ordersid','cr56f_name','createdon','modifiedon','statecode',
  'cr56f_step','cr56f_state_approval','cr56f_order_piedro','cr56f_clinicist','cr56f_patient',
  'cr56f_customerref','cr56f_qty','cr56f_totalpairs','cr56f_shoeunit',
  'cr56f_footsizelf','cr56f_footsizerf','cr56f_comments','cr56f_7urgent',
  '_cr56f_customer_value','_cr56f_style_color_value',
  // Addition fields
  'cr56f_lateraljointwidthlf','cr56f_lateraljointwidthrf',
  'cr56f_medialjointwidthlf','cr56f_medialjointwidthrf',
  'cr56f_lateralheelwidthlf','cr56f_lateralheelwidthrf',
  'cr56f_medialheelwidthlf','cr56f_medialheelwidthrf',
  'cr56f_2hammertoelf','cr56f_2hammertoerf',
  'cr56f_2toeboxlf','cr56f_2toeboxrf',
  'cr56f_2bunionettelf','cr56f_2bunionetterf',
  'cr56f_2halluxvalguslf','cr56f_2halluxvalgusrf',
  'cr56f_2depthtoforepartlf','cr56f_2depthtoforepartrf',
  'cr56f_2depthtotoeheellf','cr56f_2depthtotoeheelrf',
  'cr56f_2extrawidthonconelf','cr56f_2extrawidthonconerf',
  'cr56f_2straightenheelcliplf','cr56f_2straightenheelcliprf',
  'cr56f_2heeldepthonlylf','cr56f_2heeldepthonlyrf',
  'cr56f_2haglundheelexostosislf','cr56f_2haglundheelexostosisrf',
  'cr56f_3extraspacemedialanklelf','cr56f_3extraspacemedialanklerf',
  'cr56f_3extraspacelateralanklelf','cr56f_3extraspacelateralanklerf',
  'cr56f_lininglf','cr56f_liningrf','cr56f_closurelaceslf','cr56f_closurelacesrf',
  'cr56f_closurevelcrostrapslf','cr56f_closurevelcrostrapsrf',
  'cr56f_stiffenerhardnesslf','cr56f_stiffenerhardnessrf',
  'cr56f_toepuffslf','cr56f_toepuffsrf',
  'cr56f_toepuffsrimlf','cr56f_toepuffsrimrf',
  'cr56f_stretchleatherlf','cr56f_stretchleatherrf',
  'cr56f_instepmoretothefrontlf','cr56f_instepmoretothefrontrf',
  'cr56f_colourmodificationslf','cr56f_colourmodificationsrf',
  'cr56f_extrapaddingontonguelf','cr56f_extrapaddingontonguerf',
  'cr56f_zipperlf','cr56f_zipperrf',
  'cr56f_2rockersoletypeslf','cr56f_2rockersoletypesrf',
  'cr56f_2toeslf','cr56f_2toesrf','cr56f_2jointlf','cr56f_2jointrf',
  'cr56f_2heellf','cr56f_2heelrf',
  'cr56f_6soleamendement2lf','cr56f_6soleamendement2rf',
  'cr56f_6soleamendement1lf','cr56f_6soleamendement1rf',
  'cr56f_3solefloatlf','cr56f_3solefloatrf',
  'cr56f_3sf_mediallf','cr56f_3sf_medialrf','cr56f_3sf_laterallf','cr56f_3sf_lateralrf',
  'cr56f_3heelfloatlf','cr56f_3heelfloatrf',
  'cr56f_3hf_mediallf','cr56f_3hf_medialrf','cr56f_3hf_laterallf','cr56f_3hf_lateralrf',
  'cr56f_4solewedgelf','cr56f_4solewedgerf',
  'cr56f_4sw_mediallf','cr56f_4sw_medialrf','cr56f_4sw_laterallf','cr56f_4sw_lateralrf',
  'cr56f_4heelwedgelf','cr56f_4heelwedgerf',
  'cr56f_4hw_mediallf','cr56f_4hw_medialrf','cr56f_4hw_laterallf','cr56f_4hw_lateralrf',
  'cr56f_6removablecarboninsolelf','cr56f_6removablecarboninsolerf',
  'cr56f_6fullcarbonsoleplatelf','cr56f_6fullcarbonsoleplaterf',
  'cr56f_6sachheellf','cr56f_6sachheelrf',
  'cr56f_6separatesoleslf','cr56f_6separatesolesrf',
  'cr56f_6separatesheetslf','cr56f_6separatesheetsrf',
  'cr56f_6thomasheelmediallf','cr56f_6thomasheelmedialrf',
  'cr56f_6thomasheellaterallf','cr56f_6thomasheellateralrf',
  'cr56f_7weltprotectorlf','cr56f_7weltprotectorrf',
  'cr56f_7protectivetoecaplf','cr56f_7protectivetoecaprf',
  'cr56f_7extrapairoflaces','cr56f_nopiedrologo','cr56f_7plasticfittingshoes','cr56f_7urgent',
].join(',')

let url = `${API}/cr56f_wpp_orderses?$select=${SELECT}&$orderby=createdon desc`
const dvOrders = []
while (url && dvOrders.length < LIMIT) {
  const res = await fetch(url, { headers: H })
  const json = await res.json()
  dvOrders.push(...(json.value ?? []))
  url = json['@odata.nextLink'] ?? null
  process.stdout.write(`\r  Fetched ${dvOrders.length} orders...`)
}
console.log(`\n✓ ${dvOrders.length} orders fetched\n`)

// ── Partition: only STEP 3 (confirmed) orders are imported. ───────────────────
// Earlier-step orders are unfinished drafts that were never completed — they are
// counted for information only, never imported. Orders for the TESTES* customer
// are test data and are ignored entirely.
const isTestCustomer = (o) => {
  const name = (o['_cr56f_customer_value@OData.Community.Display.V1.FormattedValue'] ?? '')
    .trim().toUpperCase()
  return name.startsWith('TESTES')
}
const STEP_CONFIRMED = 3

const recon = { total: dvOrders.length, testes: 0, notStep3: 0, kept: 0 }
const stepHistogram = {}
const kept = []
for (const o of dvOrders) {
  if (isTestCustomer(o)) { recon.testes++; continue }
  const step = Number(o.cr56f_step)
  stepHistogram[Number.isFinite(step) ? step : 'none'] =
    (stepHistogram[Number.isFinite(step) ? step : 'none'] ?? 0) + 1
  if (step !== STEP_CONFIRMED) { recon.notStep3++; continue }
  kept.push(o)
}
recon.kept = kept.length

console.log('── Reconciliation (Dataverse → Supabase) ──────')
console.log(`  Total in Dataverse        : ${recon.total}`)
console.log(`  Excluded — TESTES* client : ${recon.testes}`)
console.log(`  Counted only — not step 3 : ${recon.notStep3}  (unfinished, NOT imported)`)
console.log(`  To import — step 3        : ${recon.kept}`)
console.log(`  Step histogram            : ${JSON.stringify(stepHistogram)}`)
console.log(`  ✓ Expected Supabase count after import = ${recon.kept}\n`)

// ── Map to Supabase ───────────────────────────────────────────────────────────
const rows = kept.map(o => ({
  id:                 o.cr56f_wpp_ordersid,
  dataverse_id:       o.cr56f_wpp_ordersid,
  // Piedro Order = the NL/UK ERP order nº (staff-filled), gates approval + VSI import.
  // ⚠️ confirm the exact Dataverse field name before relying on this on re-import.
  piedro_order_id:    o.cr56f_order_piedro ?? null,
  user_id:            null,   // no direct mapping to Supabase auth users
  company_id:         o['_cr56f_customer_value'] ?? null,
  product_id:         o['_cr56f_style_color_value'] ?? null,
  status:             decodeStatus(o.statecode, o.cr56f_step, o.cr56f_state_approval),
  unit:               decodeUnit(o.cr56f_shoeunit),
  clinician:          o.cr56f_clinicist ?? null,
  patient_name:       o.cr56f_patient ?? null,
  reference_customer: o.cr56f_customerref ?? null,
  quantity:           o.cr56f_qty ?? o.cr56f_totalpairs ?? 1,
  size_left:          o.cr56f_footsizelf ? parseFloat(o.cr56f_footsizelf) : null,
  size_right:         o.cr56f_footsizerf ? parseFloat(o.cr56f_footsizerf) : null,
  comments:           o.cr56f_comments ?? null,
  additions:          mapAdditions(o),
  imported_at:        new Date().toISOString(),
  created_at:         o.createdon ?? new Date().toISOString(),
  updated_at:         o.modifiedon ?? new Date().toISOString(),
}))

// Stats
const withProduct  = rows.filter(r => r.product_id).length
const withCompany  = rows.filter(r => r.company_id).length
const urgent       = rows.filter(r => r.additions?.urgent).length
console.log(`Mapped ${rows.length} orders`)
console.log(`  With product link : ${withProduct}`)
console.log(`  With company link : ${withCompany}`)
console.log(`  Urgent            : ${urgent}`)

if (DRY_RUN) {
  console.log('\n[dry-run] Sample:', JSON.stringify(rows[0], null, 2).slice(0, 500))
  process.exit(0)
}

// ── Upsert into Supabase ──────────────────────────────────────────────────────
console.log('\nUpserting into Supabase...')
const BATCH = 100
let inserted = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await sb.from('orders').upsert(batch, { onConflict: 'id' })
  if (error) {
    console.error('\n❌ Batch error:', error.message)
    console.error('First row id:', batch[0].id)
    process.exit(1)
  }
  inserted += batch.length
  process.stdout.write(`\r  ${inserted}/${rows.length} upserted`)
}

console.log(`\n\n✅ ${inserted} orders imported!`)
