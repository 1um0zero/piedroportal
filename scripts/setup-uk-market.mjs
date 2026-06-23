/**
 * Set up the UK market (token-scoped branch).  Run AFTER migration 040.
 *
 *   node scripts/setup-uk-market.mjs            # dry-run: report only
 *   node scripts/setup-uk-market.mjs --apply    # branch + exclusive_label + link staff
 *   node scripts/setup-uk-market.mjs --apply --label-companies
 *                                               # also label the staff's companies UK
 *
 * What it does (idempotent):
 *   1. Ensure a UK branch exists (code 'UK') and set branches.exclusive_label='UK'.
 *   2. Attach the UK staff users (by email) as branch_staff of that branch.
 *   3. Report the companies those users belong to. With --label-companies, set
 *      companies.exclusive_label='UK' + sees_general_catalogue=true on them.
 *
 * Client products are stamped exclusive='UK' separately (Excel import / back-office),
 * from Anabela's UK product list.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const APPLY = process.argv.includes('--apply')
const LABEL_COMPANIES = process.argv.includes('--label-companies')
const UK_TOKEN = 'UK'
const STAFF_EMAILS = ['gwalton@piedro-uk.co.uk', 'sales@piedro-uk.co.uk']

const log = (...a) => console.log(...a)
const tag = APPLY ? '[APPLY]' : '[DRY-RUN]'

// ── 1. UK branch ─────────────────────────────────────────────────────────────
let { data: branch } = await sb.from('branches')
  .select('id, name, code, exclusive_label, sees_full_catalogue')
  .or('code.eq.UK,name.ilike.%UK%').maybeSingle()

if (!branch) {
  log(`${tag} UK branch not found — will create { name:'United Kingdom', code:'UK' }`)
  if (APPLY) {
    const { data, error } = await sb.from('branches')
      .insert({ name: 'United Kingdom', code: 'UK', exclusive_label: UK_TOKEN, sees_full_catalogue: false })
      .select('id, name, code, exclusive_label').single()
    if (error) { console.error('create branch failed:', error); process.exit(1) }
    branch = data
  }
} else {
  log(`Found UK branch: ${branch.name} (${branch.id}) code=${branch.code} exclusive_label=${branch.exclusive_label ?? '∅'}`)
  if (branch.exclusive_label !== UK_TOKEN) {
    log(`${tag} set branches.exclusive_label='${UK_TOKEN}'`)
    if (APPLY) await sb.from('branches').update({ exclusive_label: UK_TOKEN }).eq('id', branch.id)
  }
}
const branchId = branch?.id ?? '(pending create)'

// ── 2. Staff users → branch_staff of UK ──────────────────────────────────────
for (const email of STAFF_EMAILS) {
  const { data: p } = await sb.from('profiles')
    .select('id, email, role, branch_id').ilike('email', email).maybeSingle()
  if (!p) { log(`  ! user not found: ${email}`); continue }
  const needs = p.role !== 'branch_staff' || p.branch_id !== branch?.id
  log(`  ${email}: role=${p.role} branch_id=${p.branch_id ?? '∅'}${needs ? ` → branch_staff @ UK` : ' (ok)'}`)
  if (needs && APPLY && branch?.id) {
    await sb.from('profiles').update({ role: 'branch_staff', branch_id: branch.id }).eq('id', p.id)
  }
}

// ── 3. Their companies ───────────────────────────────────────────────────────
const { data: profs } = await sb.from('profiles')
  .select('id').or(STAFF_EMAILS.map(e => `email.ilike.${e}`).join(','))
const ids = (profs ?? []).map(p => p.id)
const { data: ucs } = ids.length
  ? await sb.from('user_companies').select('company_id, companies(id, name, exclusive_label, sees_general_catalogue)').in('user_id', ids)
  : { data: [] }
const companies = [...new Map((ucs ?? []).map(u => [u.companies?.id, u.companies])).values()].filter(Boolean)
log(`\nCompanies linked to UK staff (${companies.length}):`)
for (const c of companies) {
  log(`  - ${c.name} (${c.id}) exclusive_label=${c.exclusive_label ?? '∅'} sees_general=${c.sees_general_catalogue}`)
  if (LABEL_COMPANIES && (c.exclusive_label !== UK_TOKEN || c.sees_general_catalogue !== true)) {
    log(`    ${tag} set exclusive_label='${UK_TOKEN}', sees_general_catalogue=true`)
    if (APPLY) await sb.from('companies')
      .update({ exclusive_label: UK_TOKEN, sees_general_catalogue: true }).eq('id', c.id)
  }
}

log(`\nDone ${tag}. Branch=${branchId}.`)
if (!APPLY) log('Re-run with --apply (and --label-companies to label the companies) to write.')
