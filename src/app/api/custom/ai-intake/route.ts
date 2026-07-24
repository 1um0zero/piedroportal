// AI-assisted CUSTOM intake (BETA) — POST { prompt, unit } → validated additions patch.
//
// Scoping mirrors /gallery/[id]/custom exactly (canon: a new channel never
// inherits the UI's gate implicitly): logged-in + piedro_admin only, because the
// CUSTOM channel itself is an admin-only beta. Widen both together when CUSTOM
// is promoted to clients.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import { buildFieldCatalog, applyAiItems, type AiItem } from '@/lib/custom/ai-intake'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const UNITS = new Set(['LEFT_RIGHT', 'LEFT', 'RIGHT'])

// Stable system prompt (field catalogue included) → prompt-cached across calls.
const SYSTEM = `You translate a clinician's free-text description of custom-made orthopaedic shoe requirements into the structured fields of the Piedro CUSTOM order form.

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

  let body: { prompt?: string; unit?: string; current?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const prompt = (body.prompt ?? '').trim()
  const unit = UNITS.has(body.unit ?? '') ? (body.unit as 'LEFT_RIGHT' | 'LEFT' | 'RIGHT') : 'LEFT_RIGHT'
  if (!prompt) return NextResponse.json({ error: 'Empty prompt' }, { status: 400 })
  if (prompt.length > 2000) return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 })

  try {
    const response = await getClient().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'set_additions' },
      messages: [{
        role: 'user',
        content: `Order unit: ${unit}${unit === 'LEFT' ? ' (left shoe only — every sided value goes to side "l")' : unit === 'RIGHT' ? ' (right shoe only — every sided value goes to side "r")' : ' (independent left/right)'}\n\nClinician's description:\n${prompt}`,
      }],
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
