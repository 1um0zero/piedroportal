'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import { getUserCompanyIds } from '@/lib/user-companies'
import { getBranchAdminCompanyIds } from '@/lib/branch-admin'
import { explodeCustomAdditions } from '@/lib/custom/custom-explode'

/** Header for a CUSTOM order. The rich additions live in `order_additions`, not
 *  here — this row only carries the order header (mirrors the OSB OrderRow but
 *  without the dozens of addition columns). */
export type CustomOrderRow = {
  company_id:         string | null
  locale:             string
  product_id:         string
  status:             'draft' | 'submitted'
  unit:               string                 // PAIR | LEFT | RIGHT | LEFT_RIGHT
  clinician:          string | null
  patient_name:       string | null
  reference_customer: string | null
  quantity:           number
  comments:           string | null
  /** The CUSTOM form value map (cs-code → value | {l,r}). Exploded into rows. */
  additions:          Record<string, unknown>
}

export async function insertCustomOrderAction(
  row: CustomOrderRow,
): Promise<{ id?: string; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (row.status !== 'draft' && row.status !== 'submitted') {
    return { error: 'Invalid order status' }
  }

  // Same company-ownership guard as OSB: a non-admin may only order for a company
  // they belong to (or, as branch admin, a linked client).
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdminRole(profile?.role)) {
    const [ownIds, branchIds] = await Promise.all([
      getUserCompanyIds(user.id),
      getBranchAdminCompanyIds(user.id),
    ])
    const allowed = new Set([...ownIds, ...branchIds])
    if (!row.company_id || !allowed.has(row.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  const service = createServiceClient()

  // 1) Insert the order header. order_type='CUSTOM'; additions JSONB stays empty
  //    (CUSTOM uses the 1:N order_additions table instead).
  const { additions, ...header } = row
  const { data, error } = await service
    .from('orders')
    .insert({
      ...header,
      user_id:    user.id,
      order_type: 'CUSTOM',
      additions:  {},
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  const orderId: string = data.id

  // 2) Explode + persist the additions into order_additions.
  const rows = explodeCustomAdditions(additions).map(r => ({ ...r, order_id: orderId }))
  if (rows.length) {
    const { error: addErr } = await service.from('order_additions').insert(rows)
    if (addErr) {
      // Roll back the header so we never leave a CUSTOM order with no additions.
      await service.from('orders').delete().eq('id', orderId)
      return { error: `Additions could not be saved: ${addErr.message}` }
    }
  }

  // TODO (next iteration): order_seq on submit, PDF + email (reuse OSB generatePdf).
  return { id: orderId }
}
