import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import type { createServiceClient } from '@/lib/supabase/service'

/**
 * On-demand PT translation of order comments for the ERP grid, cached in
 * orders.comments_pt. Clinic comments come in IT/NL/EN/…; the A-Shell console
 * is Portuguese. We translate with Claude Haiku (cheap, fast) and cache by a
 * hash of the source so each comment is translated once (and re-done if edited).
 *
 * Best-effort: any failure leaves comments_pt as-is — the contract then falls
 * back to the original comment, so the ERP never blocks on translation.
 */
let _client: Anthropic | null = null
const client = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

export const commentHash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16)

const MODEL = 'claude-haiku-4-5-20251001'      // same model the chat route uses
const MAX_PER_CALL = 40                        // cap work per GET so we never hit the function timeout
const CONCURRENCY = 6

async function translateOne(text: string): Promise<string | null> {
  try {
    const r = await client().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content:
          'Traduz para português de Portugal o seguinte comentário de uma encomenda de calçado ortopédico. ' +
          'Mantém medidas, números e termos técnicos. Devolve APENAS a tradução, sem aspas nem preâmbulo. ' +
          'Se já estiver em português, devolve-o tal como está.\n\n---\n' + text,
      }],
    })
    const out = r.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('').trim()
    return out || null
  } catch (e) {
    console.error('translateOne error', e)
    return null
  }
}

type Svc = ReturnType<typeof createServiceClient>
// Row shape we read/mutate: needs id, comments, comments_pt, comments_pt_hash.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/**
 * Ensure every order with a non-empty comment has an up-to-date comments_pt.
 * Mutates the rows in place (so the caller's toErpOrder sees the fresh value)
 * and persists the cache. No-op when ANTHROPIC_API_KEY is unset.
 */
export async function ensureCommentsPt(orders: Row[], service: Svc): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return
  // Skip silently if the cache columns don't exist yet (migration 026 not run).
  const probe = await service.from('orders').select('comments_pt').limit(1)
  if (probe.error) return
  const todo = orders.filter(o =>
    o.comments && String(o.comments).trim() &&
    o.comments_pt_hash !== commentHash(String(o.comments)),
  ).slice(0, MAX_PER_CALL)
  if (!todo.length) return

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async o => {
      const pt = await translateOne(String(o.comments))
      if (pt == null) return
      const hash = commentHash(String(o.comments))
      o.comments_pt = pt
      o.comments_pt_hash = hash
      await service.from('orders').update({ comments_pt: pt, comments_pt_hash: hash }).eq('id', o.id)
    }))
  }
}
