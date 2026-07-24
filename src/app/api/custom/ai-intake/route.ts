// AI-assisted CUSTOM intake (BETA) — POST { prompt, unit } → validated additions patch.
//
// Scoping mirrors /gallery/[id]/custom exactly (canon: a new channel never
// inherits the UI's gate implicitly): logged-in + piedro_admin only, because the
// CUSTOM channel itself is an admin-only beta. Widen both together when CUSTOM
// is promoted to clients.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

// Vision parsing of a scanned form can take well past the default function
// timeout — give the model room (same ceiling as the cron routes).
export const maxDuration = 60
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import { buildFieldCatalog, applyAiItems, type AiItem } from '@/lib/custom/ai-intake'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const UNITS = new Set(['LEFT_RIGHT', 'LEFT', 'RIGHT'])

type Attachment = { media_type: string; data: string }
const IMAGE_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_MEDIA = new Set([...IMAGE_MEDIA, 'application/pdf'])
const MAX_FILES = 4
const MAX_TOTAL_B64 = 5_400_000   // ≈4MB binary — under Vercel's 4.5MB request cap

// Stable system prompt (field catalogue included) → prompt-cached across calls.
const SYSTEM = `You translate a clinician's requirements for custom-made orthopaedic shoes into the structured fields of the Piedro CUSTOM order form. The requirements arrive as free text, as photos/scans/PDFs, or both.

# Reading photos, scans and PDFs
The attachment is typically a hand-annotated document: a printed order form with handwritten notes, a prescription, a sketch, or a photo of a filled-in sheet. Read it exhaustively:
- Handwriting is often Dutch clinical shorthand — read carefully, including margins and corrections.
- Ticked/checked boxes, circled options and arrows pointing at printed pictograms (supplement shapes, stiffener drawings, rocker profiles, toe shapes) mean that option is SELECTED. Follow each arrow to its target before deciding what it selects.
- Crossed-out or struck-through items are NOT selected — never map them.
- Numbers written next to a body part / drawing are measurements for that field; note "L"/"R" (links/rechts) markings for sides.
- If a mark is genuinely ambiguous (an arrow whose target is unclear, an unreadable word), describe it briefly in "unmatched" instead of guessing.

The complete catalogue of available fields is below. Rules:
- Map ONLY what the clinician explicitly states. Never guess or invent values, sides or measurements that are not in the text.
- The text may be in any language (Dutch, English, French, German, Portuguese...). Map the meaning, not the words.
- Convert units to millimetres (7 cm = 70; "een halve centimeter" = 5).
- For option fields, "value" MUST be one of the listed allowed values, verbatim.
- Sided fields (sides=L/R): use side "l", "r" or "both". "links/left/gauche/esquerdo" = l; "rechts/right/droite/direito" = r. If no side is mentioned, use "both". For sides=global fields use side "global".
- Toggle fields: value true (or false only when the clinician explicitly declines it).
- When a value implies its parent (e.g. a rocker measurement implies the rocker toggle), you may include the parent toggle too; toggle parents are also activated automatically.
- Any fragment of the text you cannot confidently map to a field goes VERBATIM into "unmatched" — never force a bad match, and never silently drop a fragment.

# Field catalogue
${buildFieldCatalog()}`

const TOOL: Anthropic.Tool = {
  name: 'set_additions',
  description: 'Report the structured additions parsed from the free-text description.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['additions', 'unmatched'],
    properties: {
      additions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'side', 'value'],
          properties: {
            key: { type: 'string', description: 'A field key from the catalogue' },
            side: { type: 'string', enum: ['l', 'r', 'both', 'global'] },
            value: { type: ['string', 'number', 'boolean'] },
          },
        },
      },
      unmatched: {
        type: 'array',
        items: { type: 'string' },
        description: 'Verbatim fragments that could not be mapped to any field',
      },
    },
  },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(profile?.role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  let body: { prompt?: string; unit?: string; current?: Record<string, unknown>; attachments?: Attachment[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const prompt = (body.prompt ?? '').trim()
  const unit = UNITS.has(body.unit ?? '') ? (body.unit as 'LEFT_RIGHT' | 'LEFT' | 'RIGHT') : 'LEFT_RIGHT'
  if (prompt.length > 2000) return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 })

  // Attachments: photos/scans/PDFs of hand-annotated forms. Base64 over JSON —
  // client downscales images; total capped well under Vercel's 4.5MB body limit.
  const attachments = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, MAX_FILES)
  let totalChars = 0
  for (const a of attachments) {
    if (!ALLOWED_MEDIA.has(a?.media_type) || typeof a?.data !== 'string')
      return NextResponse.json({ error: 'Unsupported attachment type — use JPG, PNG, WebP or PDF.' }, { status: 400 })
    totalChars += a.data.length
  }
  if (totalChars > MAX_TOTAL_B64) return NextResponse.json({ error: 'Attachments too large — max ~4MB in total.' }, { status: 400 })
  if (!prompt && !attachments.length) return NextResponse.json({ error: 'Empty prompt' }, { status: 400 })

  try {
    const unitNote = `Order unit: ${unit}${unit === 'LEFT' ? ' (left shoe only — every sided value goes to side "l")' : unit === 'RIGHT' ? ' (right shoe only — every sided value goes to side "r")' : ' (independent left/right)'}`
    const textParts = [unitNote]
    if (attachments.length) textParts.push('The attached photo(s)/document(s) contain the requirements — read every annotation, arrow, tick, circle and handwritten note.')
    if (prompt) textParts.push(`Clinician's ${attachments.length ? 'additional notes' : 'description'}:\n${prompt}`)

    const content: Anthropic.ContentBlockParam[] = [
      ...attachments.map((a): Anthropic.ContentBlockParam =>
        a.media_type === 'application/pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } }
          : { type: 'image', source: { type: 'base64', media_type: a.media_type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: a.data } },
      ),
      { type: 'text', text: textParts.join('\n\n') },
    ]

    const response = await getClient().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'set_additions' },
      messages: [{ role: 'user', content }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'set_additions',
    )
    if (!toolUse) return NextResponse.json({ error: 'The AI could not parse the description — please fill the form manually.' }, { status: 502 })

    const input = toolUse.input as { additions?: AiItem[]; unmatched?: string[] }
    const items = Array.isArray(input.additions) ? input.additions : []
    const unmatched = Array.isArray(input.unmatched) ? input.unmatched.map(String) : []
    const result = applyAiItems(items, unit, body.current ?? {})

    // Improvement loop (§16.3): keep original text + parsed output in the server
    // logs so we can build the eval set from real beta usage.
    console.log('[custom-ai-intake]', JSON.stringify({
      user: user.id, unit, prompt,
      attachments: attachments.map(a => `${a.media_type}:${Math.round(a.data.length * 3 / 4 / 1024)}KB`),
      model: response.model,
      raw: items, unmatched,
      applied: result.applied.map(a => `${a.key}:${a.side}=${a.value}`),
      warnings: result.warnings,
      usage: response.usage,
    }))

    return NextResponse.json({
      applied: result.applied,
      patch: result.patch,
      unmatched,
      warnings: result.warnings,
    })
  } catch (e) {
    console.error('[custom-ai-intake] error', e)
    return NextResponse.json({ error: 'AI service unavailable — please fill the form manually.' }, { status: 502 })
  }
}
