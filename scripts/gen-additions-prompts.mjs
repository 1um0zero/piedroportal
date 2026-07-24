/**
 * AI-intake corpus generator — reverse-engineer the natural-language prompt.
 *
 * Sweeps EVERY portal order and, for each one with additions, reconstructs the
 * prompt a user would have typed to register those additions via the future
 * AI-assisted intake (e.g. "general raise 12mm, closure velcro lap-over, urgent").
 *
 * The corpus is the ground truth for building/evaluating the prompt→additions
 * parser: each line pairs the synthetic prompt with the exact structured
 * additions it must produce, plus the order's REAL free-text `comments`
 * (genuine user phrasing, useful to calibrate the parser's vocabulary).
 *
 * Sources of truth:
 *   - docs/erp-additions-map.csv  → field key → section / type / parent
 *   - messages/en.json            → additions.field_labels (EN labels)
 *
 * Output (NOT for git — free text may contain personal data):
 *   node scripts/gen-additions-prompts.mjs --out <dir>
 *     <dir>/prompts-corpus.jsonl   one JSON object per order
 *     <dir>/prompts-sample.md      readable sample + stats
 *   Without --out, prints stats + a sample to stdout only.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── field metadata: map CSV (section/type/parent) + EN labels ────────────────
const FIELDS = {}   // key → { section, type, parent, label }
for (const line of readFileSync(resolve(process.cwd(), 'docs/erp-additions-map.csv'), 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue
  const [section, key, type, , parent] = line.split(';')
  if (key) FIELDS[key] = { section, type, parent: parent || null, label: key }
}
const messages = JSON.parse(readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'))
for (const [key, raw] of Object.entries(messages.additions.field_labels)) {
  const label = raw.replace(/^↳\s*/, '').replace(/\s*\(mm\)\s*$/i, '')
  if (FIELDS[key]) FIELDS[key].label = label
  else FIELDS[key] = { section: '?', type: '?', parent: null, label }   // key not (yet) in the map CSV
}

// ── flatten additions JSONB → present items, then nest children ─────────────
function flatten(add) {
  const out = []
  if (!add || typeof add !== 'object') return out
  for (const [key, v] of Object.entries(add)) {
    if (v === true) { out.push({ key, side: 'g', value: true }); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const side of ['l', 'r']) {
        const val = v[side]
        if (val == null || val === '' || val === false) continue
        out.push({ key, side, value: val })
      }
    } else if (v != null && v !== '' && v !== false) {
      out.push({ key, side: 'g', value: v })
    }
  }
  return out
}

/** group rows per field: {key, l, r, g} then nest children under parents */
function toNodes(rows) {
  const byKey = new Map()
  for (const r of rows) {
    let n = byKey.get(r.key)
    if (!n) { n = { key: r.key, children: [] }; byKey.set(r.key, n) }
    n[r.side] = r.value
  }
  const top = []
  for (const n of byKey.values()) {
    const parent = FIELDS[n.key]?.parent ? byKey.get(FIELDS[n.key].parent) : null
    if (parent) parent.children.push(n)
    else top.push(n)
  }
  return top
}

// ── prompt rendering ─────────────────────────────────────────────────────────
const lc = s => s.toLowerCase()

/** strip the parent's label prefix off a child label ("Sole Float Medial" → "medial") */
function childLabel(node, parentKey) {
  const own = FIELDS[node.key]?.label ?? node.key
  const par = FIELDS[parentKey]?.label ?? ''
  const short = own.startsWith(par) ? own.slice(par.length).trim() : own
  return lc(short || own)
}

function fmtValue(key, v) {
  const type = FIELDS[key]?.type
  if (v === true) return ''                                    // toggle: label alone
  if (type === 'mm' || typeof v === 'number') return `${v}mm`
  let s = String(v)
  s = s.replace(/^\d+\s+/, '')                                 // zipper "1 Medial Zipper…" → "Medial Zipper…"
  return lc(s)
}

/** which sides a node touches: 'g' | 'lr' | 'l' | 'r' */
const sideSig = n => n.g !== undefined ? 'g' : n.l !== undefined && n.r !== undefined ? 'lr' : n.l !== undefined ? 'l' : 'r'

/** value part for one node, side-aware: equal→single, differing→"left X / right Y", one-sided→"(left only)" */
function sidedValue(node, key, unit, suppressSideNote = false) {
  const { l, r, g } = node
  if (g !== undefined) return fmtValue(key, g)
  if (l !== undefined && r !== undefined) {
    if (String(l) === String(r)) return fmtValue(key, l)
    const fl = fmtValue(key, l) || 'yes', fr = fmtValue(key, r) || 'yes'
    return `left ${fl} / right ${fr}`
  }
  // "one side only" is information in PAIR/LEFT_RIGHT; and only worth saying once per parent
  const note = !suppressSideNote && (unit === 'LEFT_RIGHT' || unit === 'PAIR')
  if (l !== undefined) return `${fmtValue(key, l)}${note ? ' (left only)' : ''}`.trim()
  return `${fmtValue(key, r)}${note ? ' (right only)' : ''}`.trim()
}

function renderNode(node, unit) {
  const label = lc(FIELDS[node.key]?.label ?? node.key)
  const type = FIELDS[node.key]?.type
  const val = sidedValue(node, node.key, unit)
  let head
  if (!val) head = label                                        // pure toggle
  else if (type === 'option' || type === 'image') head = `${label}: ${val}`
  else head = `${label} ${val}`
  if (node.children.length) {
    const parentSig = sideSig(node)
    const kids = node.children.map(c => {
      const cv = sidedValue(c, c.key, unit, sideSig(c) === parentSig)   // don't repeat "(left only)" per child
      const clabel = childLabel(c, node.key)
      if (!cv) return clabel
      return lc(cv).startsWith(clabel) ? cv : `${clabel} ${cv}`   // "tapered tapered to toes" → "tapered to toes"
    })
    head += ` (${kids.join(', ')})`
  }
  return head
}

const UNIT_PHRASE = {
  PAIR: '', LEFT_RIGHT: '', DIFF_SIZES: '',
  LEFT: 'left shoe only — ', RIGHT: 'right shoe only — ',
}

function renderPrompt(order) {
  const nodes = toNodes(flatten(order.additions))
  if (!nodes.length) return null
  const order2 = ['additions', 'upper', 'sole', 'others']
  nodes.sort((a, b) => order2.indexOf(FIELDS[a.key]?.section) - order2.indexOf(FIELDS[b.key]?.section))
  return (UNIT_PHRASE[order.unit] ?? '') + nodes.map(n => renderNode(n, order.unit)).join(', ')
}

// ── sweep ────────────────────────────────────────────────────────────────────
const SELECT = 'id, order_seq, status, unit, additions, comments, created_at, dataverse_id, products(style_name, colour_id, closure)'

async function fetchAllOrders() {
  let all = [], from = 0
  for (;;) {
    const { data, error } = await sb.from('orders').select(SELECT)
      .order('created_at', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return all
}

const main = async () => {
  const outIdx = process.argv.indexOf('--out')
  const outDir = outIdx > -1 ? process.argv[outIdx + 1] : null

  const orders = await fetchAllOrders()
  const rows = []
  const fieldFreq = {}
  let withAdds = 0, totalItems = 0

  for (const o of orders) {
    const nodes = toNodes(flatten(o.additions))
    const prompt = renderPrompt(o)
    if (prompt) {
      withAdds++
      totalItems += nodes.length
      for (const n of nodes) fieldFreq[n.key] = (fieldFreq[n.key] ?? 0) + 1
    }
    rows.push({
      id: o.id,
      order_seq: o.order_seq,
      status: o.status,
      unit: o.unit,
      style: o.products ? `${o.products.style_name ?? ''} ${o.products.colour_id ?? ''}`.trim() : null,
      closure: o.products?.closure ?? null,
      source: o.dataverse_id ? 'migrated' : 'portal',
      created: o.created_at?.slice(0, 10),
      n_additions: nodes.length,
      prompt,
      comments: o.comments || null,
      additions: o.additions ?? null,
    })
  }

  // ── stats ──
  const withA = rows.filter(r => r.prompt)
  const freqSorted = Object.entries(fieldFreq).sort((a, b) => b[1] - a[1])
  const lines = []
  lines.push(`orders swept ............. ${orders.length}`)
  lines.push(`with additions ........... ${withAdds}  (${(100 * withAdds / orders.length).toFixed(1)}%)`)
  lines.push(`avg additions/order ...... ${(totalItems / Math.max(withAdds, 1)).toFixed(2)}`)
  lines.push(`portal-native w/ adds .... ${withA.filter(r => r.source === 'portal').length}`)
  lines.push(`migrated w/ adds ......... ${withA.filter(r => r.source === 'migrated').length}`)
  lines.push('')
  lines.push('top additions (field, count):')
  for (const [k, c] of freqSorted.slice(0, 25)) lines.push(`  ${String(c).padStart(5)}  ${k.padEnd(16)} ${FIELDS[k]?.label ?? ''}`)
  console.log(lines.join('\n'))

  // sample: shortest, median, longest, sided, with-children
  const sorted = [...withA].sort((a, b) => a.prompt.length - b.prompt.length)
  const pick = new Map()
  const add = (tag, r) => { if (r && !pick.has(r.id)) pick.set(r.id, { tag, r }) }
  add('simplest', sorted[0])
  add('median', sorted[Math.floor(sorted.length / 2)])
  add('richest', sorted[sorted.length - 1])
  add('sided L≠R', withA.find(r => r.prompt.includes('left ') && r.prompt.includes('/ right ')))
  add('one side only', withA.find(r => r.prompt.includes('(left only)') || r.prompt.includes('(right only)')))
  add('LEFT unit', withA.find(r => r.unit === 'LEFT' || r.unit === 'RIGHT'))
  add('with children', withA.find(r => r.prompt.includes('(') && r.n_additions >= 3))
  add('with comments', withA.find(r => r.comments && r.comments.length > 10))
  console.log('\n── sample prompts ──')
  for (const { tag, r } of pick.values()) {
    console.log(`\n[${tag}] #${r.order_seq ?? '—'} ${r.unit} ${r.style ?? ''} (${r.source}, ${r.n_additions} adds)`)
    console.log(`  PROMPT: ${r.prompt}`)
    if (r.comments) console.log(`  real comments: ${JSON.stringify(r.comments.slice(0, 160))}`)
  }

  if (outDir) {
    mkdirSync(outDir, { recursive: true })
    const jsonl = rows.filter(r => r.prompt).map(r => JSON.stringify(r)).join('\n')
    writeFileSync(resolve(outDir, 'prompts-corpus.jsonl'), jsonl)
    const md = ['# AI-intake prompt corpus — sample & stats', '', '```', ...lines, '```', '']
    for (const { tag, r } of pick.values()) {
      md.push(`## [${tag}] #${r.order_seq ?? '—'} — ${r.unit}, ${r.n_additions} additions`)
      md.push('', `> ${r.prompt}`, '')
    }
    writeFileSync(resolve(outDir, 'prompts-sample.md'), md.join('\n'))
    console.log(`\nwrote ${withAdds} prompts → ${resolve(outDir, 'prompts-corpus.jsonl')}`)
  }
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1) })
