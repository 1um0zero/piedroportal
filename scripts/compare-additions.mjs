/**
 * Cross-check additions: PORTAL (expected) vs VSI icecadd (actual).
 *
 * Inputs (both under scripts/_out/):
 *   additions-portal-class.csv  — from diag-additions-seqlist.mjs --csv
 *   icaddout.csv                — from vsi-icecadd-read.mjs (or icaddump.run on VSI)
 *
 * Mapping learned from the data:
 *   - VSI lr is "1"=left foot, "2"=right foot.
 *   - erp_order_ref "A/B" is a per-foot split: A=left (lr 1), B=right (lr 2).
 *     Single erp → both feet live under one order (lr 1 and 2).
 *   - portal side l→lr 1, r→lr 2, g(global)→either foot.
 *   - toggle: portal lists it only when ON(true); VSI stores "1"=on / "0"=off/blank.
 *   - global toggles (urgent/no_logo/...) live in extra'fields, NOT the 91 icecadd
 *     fields → not checkable here (flagged separately).
 *
 * Usage: node scripts/compare-additions.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const dir = resolve(process.cwd(), 'scripts/_out')
const portal = readFileSync(resolve(dir, 'additions-portal-class.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(';'))
let vsiRows
try { vsiRows = readFileSync(resolve(dir, 'icaddout.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(';')) }
catch { console.error('Missing icaddout.csv — run vsi-icecadd-read.mjs first.'); process.exit(1) }

// VSI: enc → lr → fieldNo → value
const vsi = new Map()
for (const [enc, lr, no, ...rest] of vsiRows) {
  const e = enc.trim(); if (!e) continue
  if (!vsi.has(e)) vsi.set(e, new Map())
  const m = vsi.get(e)
  if (!m.has(lr)) m.set(lr, new Map())
  m.get(lr).set(Number(no), rest.join(';').trim())
}
const orderExists = enc => vsi.has(enc) && [...vsi.get(enc).values()].some(m => m.size)
function vsiVal(enc, side, no) {
  const lr = side === 'r' ? '2' : '1'
  const byLr = vsi.get(enc)
  if (!byLr) return { has: false }
  const tryLrs = side === 'g' ? ['1', '2'] : [lr]
  for (const L of tryLrs) {
    const m = byLr.get(L)
    if (m && m.has(no)) return { has: true, value: m.get(no) }
  }
  return { has: false }
}

// Portal grouped by order_seq
// cols: order_seq;piedro;erp_order_ref;uuid;created;n_additions;icecadd_no;icecadd2_slot;portal_key;side;value
const orders = new Map()
for (const c of portal) {
  const [seq, piedro, erp, , created, , no, , key, side, value] = c
  if (!orders.has(seq)) orders.set(seq, { seq, piedro, erp, created, exp: [] })
  if (key) orders.get(seq).exp.push({ no: no ? Number(no) : null, key, side, value: (value ?? '').replace(/^"|"$/g, '') })
}
const consoleOrderFor = (erp, side) => {
  const p = (erp || '').split('/').map(s => s.trim())
  return p.length === 2 ? (side === 'r' ? p[1] : p[0]) : p[0]
}

// Value match: does the VSI field satisfy the portal expectation?
function matches(portalVal, vsiVal) {
  const p = String(portalVal), v = String(vsiVal ?? '').trim()
  if (p === 'true') return v !== '' && v !== '0'          // toggle ON
  if (/^-?\d+(\.\d+)?$/.test(p)) return v !== '' && Number(v) === Number(p)
  return v.toLowerCase().replace(/\s+/g, '') === p.toLowerCase().replace(/\s+/g, '')
}

let full = 0, partial = 0, ok = 0, noErp = 0
const lines = []
for (const o of [...orders.values()].sort((a, b) => Number(a.seq) - Number(b.seq))) {
  const checkable = o.exp.filter(e => e.no != null)      // icecadd-backed
  const globals = o.exp.filter(e => e.no == null)        // extra'fields, not checkable here
  if (!checkable.length && !globals.length) continue
  if (!o.erp) { noErp++; lines.push(`#${o.seq} piedro=${o.piedro}: expects ${o.exp.length} additions but NOT imported (no erp_order_ref)`); continue }

  // Does any console order for this row exist in icecadd at all?
  const encs = [...new Set(checkable.map(e => consoleOrderFor(o.erp, e.side)).concat(consoleOrderFor(o.erp, 'l')))]
  const anyRecords = encs.some(orderExists)

  const miss = [], diff = []
  for (const e of checkable) {
    const enc = consoleOrderFor(o.erp, e.side)
    const got = vsiVal(enc, e.side, e.no)
    if (!got.has) { miss.push(`${e.key}[${e.side}] #${e.no}=${e.value}`); continue }
    if (!matches(e.value, got.value)) diff.push(`${e.key}[${e.side}] #${e.no}: portal=${e.value} vsi="${got.value}"`)
  }

  if (checkable.length && !anyRecords) {
    full++
    lines.push(`#${o.seq} piedro=${o.piedro} erp=${o.erp}: ALL additions MISSING on VSI (no icecadd record) — expected ${checkable.length}${globals.length ? ` (+${globals.length} global)` : ''}`)
    lines.push(`     ` + checkable.map(e => `${e.key}[${e.side}]=${e.value}`).join(', '))
  } else if (miss.length || diff.length) {
    partial++
    lines.push(`#${o.seq} piedro=${o.piedro} erp=${o.erp}: PARTIAL — ${miss.length} missing, ${diff.length} diff`)
    miss.forEach(m => lines.push(`     MISSING  ${m}`))
    diff.forEach(m => lines.push(`     DIFF     ${m}`))
  } else {
    ok++
  }
}

console.log(lines.join('\n'))
console.log('\n════════ SUMMARY ════════')
console.log(`Fully MISSING (no icecadd record)   : ${full}`)
console.log(`PARTIAL (some missing / wrong)      : ${partial}`)
console.log(`OK (all additions present & match)  : ${ok}`)
console.log(`Expected but not imported (no erp)  : ${noErp}`)
