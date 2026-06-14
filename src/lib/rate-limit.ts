/**
 * Best-effort in-memory sliding-window rate limiter. Per warm serverless
 * instance only (no shared store), so it blunts rapid loops/abuse rather than
 * enforcing a hard global cap — good enough for CPU-heavy routes like PDF
 * rendering. For a distributed hard limit, back this with Upstash/Redis later.
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs
  const arr = (hits.get(key) ?? []).filter(t => t > cutoff)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now)
  hits.set(key, arr)
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every(t => t <= cutoff)) hits.delete(k)
  }
  return true
}
