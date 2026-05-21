'use server'

import { createClient } from '@/lib/supabase/server'

type OrderRow = {
  user_id:            string
  company_id:         string | null
  product_id:         string
  status:             string
  unit:               string
  clinician:          string | null
  patient_name:       string | null
  reference_customer: string | null
  quantity:           number
  construction_left:  string | null
  construction_right: string | null
  width_left:         string | null
  width_right:        string | null
  size_left:          number | null
  size_right:         number | null
  additions:          Record<string, unknown>
  comments:           string | null
}

export async function insertOrderAction(
  row: OrderRow,
  needId: boolean,
): Promise<{ id?: string; error?: string }> {
  const sb = await createClient()

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (needId) {
    const { data, error } = await sb.from('orders').insert(row).select('id').single()
    if (error) return { error: `${error.message} [${error.code}]` }
    return { id: data.id }
  } else {
    const { error } = await sb.from('orders').insert(row)
    if (error) return { error: `${error.message} [${error.code}]` }
    return {}
  }
}
