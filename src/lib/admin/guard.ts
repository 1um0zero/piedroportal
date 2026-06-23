import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminScope, type AdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'

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
  if (!isPiedroAdmin(profile?.role))
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { ok: true }
}

/**
 * Verify the caller has back-office access (piedro_admin or a branch_staff
 * attached to a branch) and return their model scope.
 * Returns `{ scope }` or `{ error: NextResponse }` to return early.
 */
export async function requireBackoffice(): Promise<{ scope: AdminScope } | { error: NextResponse }> {
  const scope = await getAdminScope()
  if (!scope) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (scope.role === 'branch_staff' && !scope.branchId)
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { scope }
}

/**
 * Like requireBackoffice but additionally rejects token-scoped branches (e.g. UK),
 * which may consult the catalogue but not mutate it. Use on import/upload routes.
 */
export async function requireCatalogueWrite(): Promise<{ scope: AdminScope } | { error: NextResponse }> {
  const res = await requireBackoffice()
  if ('error' in res) return res
  if (res.scope.readonlyCatalogue)
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return res
}
