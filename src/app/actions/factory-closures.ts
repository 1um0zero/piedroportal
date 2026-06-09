'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { addWorkingDays } from '@/lib/dispatch'
import { revalidatePath } from 'next/cache'

type Svc = ReturnType<typeof createServiceClient>

/**
 * Recompute expected_dispatch_date for every non-delivered/non-cancelled order.
 * Run after the closure calendar changes (the per-order value is otherwise fixed
 * at save time). Bounded work — only date arithmetic + batched updates.
 */
export async function recomputeDispatchDates(service?: Svc): Promise<{ updated: number }> {
  const svc = service ?? createServiceClient()
  const s = await getSettings(['dispatch_days_normal', 'dispatch_days_urgent'])
  const normal = parseInt(s.dispatch_days_normal || '0', 10) || 0
  const urgent = parseInt(s.dispatch_days_urgent || '0', 10) || normal
  if (!normal && !urgent) return { updated: 0 }

  const { data: cl } = await svc.from('factory_closures').select('date')
  const closures = new Set((cl ?? []).map(r => (r as { date: string }).date))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await svc.from('orders')
      .select('id, created_at, additions')
      .not('status', 'in', '(delivered,cancelled)')
      .order('id').range(from, from + 999)
    if (!data?.length) break
    orders.push(...data)
    if (data.length < 1000) break
  }

  let updated = 0
  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50)
    await Promise.all(batch.map(async o => {
      const isUrgent = (o.additions as { urgent?: boolean } | null)?.urgent === true
      const days = isUrgent ? urgent : normal
      if (!days) return
      const dd = addWorkingDays(o.created_at, days, closures)
      const { error } = await svc.from('orders').update({ expected_dispatch_date: dd }).eq('id', o.id)
      if (!error) updated++
    }))
  }
  return { updated }
}

/**
 * Add or remove a factory closure for a date. Does NOT recompute dispatch dates
 * — that is deferred so the admin can mark a whole holiday period click-by-click
 * without triggering an expensive recompute each time. Call
 * `recomputeDispatchDatesAction` once afterwards (the calendar does this on exit
 * and via an explicit "reprocess" button).
 */
export async function setClosure(
  date: string, kind: 'closure' | 'vacation' | 'bridge', on: boolean,
): Promise<{ error?: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  const service = createServiceClient()

  if (on) {
    const { error } = await service.from('factory_closures').upsert({ date, kind }, { onConflict: 'date' })
    if (error) return { error: error.message }
  } else {
    const { error } = await service.from('factory_closures').delete().eq('date', date)
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/factory-calendar')
  return {}
}

/** Recompute dispatch dates for all open orders after closure changes (auth-guarded). */
export async function recomputeDispatchDatesAction(): Promise<{ error?: string; recomputed?: number }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  const { updated } = await recomputeDispatchDates()
  revalidatePath('/orders')
  revalidatePath('/admin/orders')
  return { recomputed: updated }
}
