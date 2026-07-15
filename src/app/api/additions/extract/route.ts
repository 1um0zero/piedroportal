import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildCatalog, sectionOf, type ExtractCtx } from '@/lib/additions-llm'
import { SECTIONS } from '@/components/order/additions-config'

/**
 * POST /api/additions/extract — map a free-text order comment onto structured
 * addition fields using Claude Haiku (forced tool call = guaranteed shape).
 *
 *  mode: 'detect'  → returns { fields: [{fieldKey, sectionKey}] } (which fields
 *                    the comment mentions). The client uses this to mark fields
 *                    with the blinking arrow — the human still fills them.
 *  mode: 'fill'    → returns { additions: { <key>: value | {l,r} } } — a sparse
 *                    patch the Piedro staff editor merges as a PROPOSAL (shown in
 *                    the diff, staff confirms). Never auto-committed for clients.
 *
 * Best-effort: any failure (no key, bad body, API error) returns empty results
 * so the caller degrades to the instant keyword detector.
 */

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const FIELD_TYPE: Record<string, string> = {}
const FIELD_SIDE: Record<string, string> = {}
for (const s of SECTIONS) for (const f of s.fields) { FIELD_TYPE[f.key] = f.type; FIELD_SIDE[f.key] = f.side }

const REPORT_TOOL: Anthropic.Tool = {
  name: 'report_additions',
  description: 'Report the orthopaedic additions found in the clinician comment, each mapped to a catalog field key.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'One entry per addition clearly stated in the comment. Empty if none.',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'a field key exactly as listed in the catalog' },
            side: { type: 'string', enum: ['l', 'r', 'both', 'global'], description: 'which foot: "both" if the comment does not distinguish; "global" for whole-order fields' },
            value: { type: 'string', description: 'mm fields: the number; option fields: exactly one of the listed options; toggles: "yes"; text: the text. For detection you may leave empty.' },
          },
          required: ['field'],
        },
      },
    },
    required: ['items'],
  },
}

const DETECT_SYSTEM = `You map an orthopaedic footwear order comment to the structured addition fields that exist in the form.
Goal: identify which catalog fields the comment REFERS TO, so the form can highlight them. Be precise and conservative:
- Only report a field when the comment clearly refers to it. Do not guess or infer unstated additions.
- Use ONLY field keys present in the catalog. Never invent keys.
- The comment may be in English, Dutch, French or German — the catalog labels are English; the "syn:" lists give common clinical terms per field.
- You may omit the value in detect mode; the human will fill it. Report each mentioned field once.`

const FILL_SYSTEM = `You transcribe an orthopaedic footwear order comment into structured addition values for the form.
Rules:
- Use ONLY field keys present in the catalog, and for option fields use EXACTLY one of that field's listed options (verbatim).
- mm fields: give the number only (no "mm"); if a range is listed, pick the value stated in the comment.
- toggles: value "yes".
- side: "both" unless the comment names a foot ("left"/"right"/"L"/"R"); "global" for fields marked global.
- If you set a field that has parent=X, also emit an item for the parent (as a "yes"/value) so it becomes active.
- Be conservative: transcribe only what the comment clearly states. Omit anything ambiguous or absent. The comment may be EN/NL/FR/DE.`

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ fields: [], additions: {} })

  // Order flows are login-gated; keep the LLM endpoint behind auth too.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json().catch(() => null) as any
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : ''
  const mode: 'detect' | 'fill' = body?.mode === 'fill' ? 'fill' : 'detect'
  if (comment.length < 4) return Response.json({ fields: [], additions: {} })

  const ctx: ExtractCtx = {
    unit: body?.unit ?? 'PAIR',
    closure: body?.closure ?? '',
    addsExclude: body?.addsExclude ?? '',
    soleProfile: body?.soleProfile ?? null,
    section: body?.section ?? null,
    zsmGroup: body?.zsmGroup ?? null,
  }

  const catalog = buildCatalog(ctx)
  const validKeys = new Set(catalog.split('\n').map(l => l.split(' ')[0]).filter(Boolean))
  if (!validKeys.size) return Response.json({ fields: [], additions: {} })

  try {
    const res = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: [{ type: 'text', text: mode === 'fill' ? FILL_SYSTEM : DETECT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [REPORT_TOOL],
      tool_choice: { type: 'tool', name: 'report_additions' },
      messages: [{
        role: 'user',
        content: `FIELD CATALOG (only these keys are valid):\n${catalog}\n\nCLINICIAN COMMENT:\n"""${comment}"""`,
      }],
    })

    const block = res.content.find(b => b.type === 'tool_use')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: Array<{ field?: string; side?: string; value?: string }> = (block as any)?.input?.items ?? []
    const clean = items.filter(it => it?.field && validKeys.has(it.field))

    if (mode === 'detect') {
      const seen = new Set<string>()
      const fields: Array<{ fieldKey: string; sectionKey: string }> = []
      for (const it of clean) {
        if (seen.has(it.field!)) continue
        seen.add(it.field!)
        fields.push({ fieldKey: it.field!, sectionKey: sectionOf(it.field!) })
      }
      return Response.json({ fields })
    }

    // fill → sparse additions patch
    const additions: Record<string, unknown> = {}
    for (const it of clean) {
      const key = it.field!
      const type = FIELD_TYPE[key]
      const isGlobal = FIELD_SIDE[key] === 'global'
      let value: unknown
      if (type === 'toggle') value = true
      else if (type === 'mm') {
        const n = Number(String(it.value ?? '').replace(/[^0-9.]/g, ''))
        if (!Number.isFinite(n)) continue
        value = n
      } else {
        const v = String(it.value ?? '').trim()
        if (!v) continue
        value = v
      }
      if (isGlobal) { additions[key] = value; continue }
      const side = it.side === 'l' || it.side === 'r' ? it.side : 'both'
      const cur = (additions[key] as { l: unknown; r: unknown }) ?? { l: null, r: null }
      additions[key] = side === 'both' ? { l: value, r: value } : { ...cur, [side]: value }
    }
    return Response.json({ additions })
  } catch (e) {
    console.error('additions/extract error', e)
    return Response.json({ fields: [], additions: {} })
  }
}
