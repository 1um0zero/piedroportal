import type { createServiceClient } from '@/lib/supabase/service'

type Service = ReturnType<typeof createServiceClient>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any

/**
 * Find the previous/next order around `current`, in the same created_at desc order
 * as the list (previous = newer / above, next = older / below). `applyScope` lets
 * the caller reuse the page's own visibility filter so neighbours never leak across
 * tenants/scopes. Returns ids only.
 */
export async function getOrderNeighbors(
  service: Service,
  current: { id: string; created_at: string },
  applyScope?: (q: Query) => Query,
): Promise<{ prevId: string | null; nextId: string | null }> {
  const scoped = () => {
    const q = service.from('orders').select('id')
    return applyScope ? applyScope(q) : q
  }

  const [{ data: prev }, { data: next }] = await Promise.all([
    scoped().gt('created_at', current.created_at).order('created_at', { ascending: true }).limit(1),
    scoped().lt('created_at', current.created_at).order('created_at', { ascending: false }).limit(1),
  ])

  return {
    prevId: (prev as { id: string }[] | null)?.[0]?.id ?? null,
    nextId: (next as { id: string }[] | null)?.[0]?.id ?? null,
  }
}
