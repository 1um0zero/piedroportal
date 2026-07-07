/**
 * Supabase/PostgREST silently truncates every select at 1000 rows. Any query
 * that can exceed that (orders, products, profiles as they grow) MUST page
 * through .range() windows — a plain .select() under-reports without any error,
 * which is how KPIs and lists silently go wrong (Dome class fix, 2026-07-07).
 *
 * Usage: pass a builder that returns a fresh filtered query; fetchAll appends
 * the .range() window per page.
 *
 *   const rows = await fetchAll<OrderRow>(page =>
 *     service.from('orders').select(SELECT).eq('status', 'submitted')
 *       .order('created_at', { ascending: false })
 *       .range(page.from, page.to))
 */
const PAGE = 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageResult = PromiseLike<{ data: any[] | null; error: { message: string } | null }>

export async function fetchAll<T>(
  query: (page: { from: number; to: number }) => PageResult,
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query({ from, to: from + PAGE - 1 })
    if (error || !data?.length) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
  }
  return all
}
