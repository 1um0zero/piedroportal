import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Verify the caller is a logged-in piedro_admin.
 * Returns `{ ok: true }` or `{ error: NextResponse }` to return early.
 */
export async function requireAdmin(): Promise<{ ok: true } | { error: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin')
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { ok: true }
}
