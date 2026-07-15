/**
 * One-off: reconstruct every ORPHAN order PDF (a submitted order whose DB row was
 * hard-deleted, leaving only the PDF in the `order-pdfs` bucket) into the immutable
 * deleted_orders archive, so nothing that ever existed is left "loose" in storage.
 *
 * Prereq: migration 054_deleted_orders.sql must be applied first.
 * Idempotent: skips any order_id already archived. Re-run safe.
 *
 *   node scripts/reconstruct-orphan-orders.mjs          # dry-run (lists actions)
 *   node scripts/reconstruct-orphan-orders.mjs --apply  # writes rows
 *
 * The `data` map below was transcribed by reading each surviving PDF. The PDF itself
 * remains the authoritative artifact (pdf_url); this row makes it discoverable and
 * attributable. Deleted-at = the PDF's storage creation time (best available proxy).
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

// Transcribed from each orphan PDF. kind: 'test' = internal dev/test order, 'real' = genuine client order.
const data = {
  '9a6e77f6-99be-4408-92d2-f276f0f5e2b7': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: 'wrwrw',        patient: 'wrewrew',          ref: 'ewrrew',    product: '1701K.2196', unit: 'PAIR' },
  '8125d25d-ba98-491e-8ef2-3ec3874c42b3': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: 'jorge tavares', patient: 'patient zero one', ref: 'agora vai', product: '1702.2388',  unit: 'LEFT_RIGHT' },
  '8f77d78b-94a3-487e-b6c7-df5c8c80d685': { kind: 'test', order_seq: null, company: 'ALFRED DECK OST',        clinician: 'dgsgssg',      patient: 'sgsggs',           ref: 'gdsgdsgdsgds', product: '2160.9826', unit: 'PAIR' },
  'be432ded-ea76-44ab-9c7e-e06c0a7f871d': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: null,           patient: null,               ref: 'ewewtwtwe', product: '1700.5750',  unit: 'PAIR' },
  '22684cd9-d893-4d44-9f67-9fd79c24c2d3': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: null,           patient: null,               ref: 'ff',        product: '1700.5750',  unit: 'PAIR' },
  '59419056-416c-4b19-9c9d-adc4cb7572f9': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: 'jorge tavares', patient: 'patient zero one', ref: 'agora vai', product: '1702.2388',  unit: 'LEFT_RIGHT' },
  '15335f99-c702-4862-ac74-913c3475c19c': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: 'jorge tavares', patient: 'patient zero one', ref: 'agora vai', product: '1702.2388',  unit: 'LEFT_RIGHT' },
  '84c1b066-5b42-4b04-a65e-1229d0fc4525': { kind: 'test', order_seq: null, company: 'ALBATROS NV',            clinician: null,           patient: null,               ref: 'khkjhlk',   product: '1701.9880',  unit: 'LEFT_RIGHT' },
  '7c5c06c0-4439-4886-ad4a-05c39f10eba6': { kind: 'real', order_seq: 4696, company: 'BUCHRNHORNEN TILBURG',   clinician: 'Ludwig',       patient: '415BROSB',         ref: 'Van Santen', product: '4808.5698', unit: 'PAIR' },
  'd1192987-08d6-4885-aa54-9a742dc35fdf': { kind: 'real', order_seq: 4819, company: 'ORTHO-VISION HOLDING B.V.', clinician: 'Attila',     patient: 'Q Goertzen',       ref: 'L5295',     product: '1701K.9880', unit: 'PAIR' },
  'e2d47ae0-cd41-43f3-a3b5-2705d707f58c': { kind: 'real', order_seq: 4980, company: 'ORTH.SCH.TECHN.RAMEAU',  clinician: 'Peter',        patient: 'Weiss',            ref: '2746-B',    product: '3597.9800',  unit: 'PAIR' },
  '6cd33f4c-915b-42cf-9ee1-f32ad86184b1': { kind: 'real', order_seq: 4992, company: 'ORTH.SCH.TECHN.RAMEAU',  clinician: 'Peter',        patient: 'Weiss',            ref: '2746-B',    product: '3597.9800',  unit: 'PAIR' },
  'da1e4750-436e-4c15-a6dd-ace1f2283eda': { kind: 'real', order_seq: 5023, company: 'WITTEPOEL GOED VOOR VOETEN V.O.F. V/D POEL', clinician: 'cees', patient: null, ref: 'martis /simons', product: '5302.9800', unit: 'LEFT_RIGHT' },
}

// Storage created_at per file (proxy for deleted_at / existed-at)
const files = []
for (let off = 0; ; off += 1000) {
  const { data: page } = await sb.storage.from('order-pdfs').list('', { limit: 1000, offset: off })
  files.push(...(page ?? []))
  if (!page || page.length < 1000) break
}
const createdAt = Object.fromEntries(files.map(f => [f.name.replace(/\.pdf$/i, ''), f.created_at]))

let written = 0, skipped = 0
for (const [id, d] of Object.entries(data)) {
  const { data: exists } = await sb.from('deleted_orders').select('id').eq('order_id', id).maybeSingle()
  if (exists) { console.log(`skip  ${id}  #${d.order_seq ?? '—'} (already archived)`); skipped++; continue }
  const row = {
    order_id: id,
    order_seq: d.order_seq,
    status: 'submitted',
    user_id: null, company_id: null,
    patient_name: d.patient,
    reference_customer: d.ref,
    deleted_by: null,
    deleted_by_role: null,
    impersonated_as: null,
    reason: 'orphan_pdf_reconstruction',
    pdf_url: `${id}.pdf`,
    snapshot: {
      source: 'orphan_pdf_reconstruction',
      kind: d.kind,
      order_seq: d.order_seq,
      company: d.company, clinician: d.clinician, patient_name: d.patient,
      reference_customer: d.ref, product: d.product, unit: d.unit,
      pdf_created_at: createdAt[id] ?? null,
      note: 'Row transcribed from surviving order-pdfs PDF; the PDF is the authoritative artifact.',
    },
    deleted_at: createdAt[id] ?? undefined,
  }
  console.log(`${APPLY ? 'WRITE' : 'plan '} ${id}  #${d.order_seq ?? '—'}  ${d.kind}  ${d.company} / ${d.patient ?? '—'}`)
  if (APPLY) {
    const { error } = await sb.from('deleted_orders').insert(row)
    if (error) { console.error('  ERROR', error.message); continue }
    written++
  }
}
console.log(`\n${APPLY ? `written ${written}` : 'dry-run (pass --apply to write)'}, skipped ${skipped}, total ${Object.keys(data).length}`)
