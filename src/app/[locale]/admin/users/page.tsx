import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'
import AdminUsers from '@/components/admin/AdminUsers'
import { fetchAll } from '@/lib/fetch-all'

export default async function AdminUsersPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) redirect('/gallery')

  // Load all data with service client (bypasses RLS)
  const service = createServiceClient()

  // profiles/user_companies are paginated: past 1000 users an unbounded select
  // would silently drop rows from the list.
  const [profiles, { data: companies }, userCompanies, { data: branches }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll<any>(page => service
      .from('profiles')
      .select('id, email, full_name, role, company_id, branch_id, created_at, preferred_locale')
      .order('created_at', { ascending: false })
      .range(page.from, page.to)),
    service
      .from('companies')
      .select('id, name')
      .order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAll<any>(page => service
      .from('user_companies')
      .select('user_id, company_id, is_company_admin, companies(id, name)')
      .range(page.from, page.to)),
    service
      .from('branches')
      .select('id, name')
      .order('name'),
  ])

  // Auth-side gate: has the user confirmed their email yet? A self-registered or
  // freshly-created account sits unconfirmed until it clicks the confirmation link —
  // which is a different state from "confirmed but no company assigned". Paginate
  // through auth.users (admin API caps each page at 1000).
  const confirmedIds = new Set<string>()
  const lastSignIn = new Map<string, string | null>()
  for (let page = 1; ; page++) {
    const { data: list } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = list?.users ?? []
    for (const u of batch) {
      if (u.email_confirmed_at) confirmedIds.add(u.id)
      lastSignIn.set(u.id, u.last_sign_in_at ?? null)
    }
    if (batch.length < 1000) break
  }

  // Granular orders_approval capability — fetched separately (best-effort) so a
  // brand-new column not yet in PostgREST's schema cache can never null the whole
  // profiles query and blank the entire users list for admins.
  const approveMap = new Map<string, boolean>()
  {
    const caps = await fetchAll<{ id: string }>(page =>
      service.from('profiles').select('id, can_approve_orders').range(page.from, page.to))
    for (const c of caps ?? []) approveMap.set(c.id, (c as { can_approve_orders?: boolean }).can_approve_orders === true)
  }

  // Map user_companies by user_id (multiple companies per user)
  const ucMap = new Map<string, Array<{ company_id: string; company_name: string; is_company_admin: boolean }>>()
  for (const uc of userCompanies ?? []) {
    const existing = ucMap.get(uc.user_id) ?? []
    existing.push({
      company_id: uc.company_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      company_name: (uc as any).companies?.name ?? null,
      is_company_admin: uc.is_company_admin,
    })
    ucMap.set(uc.user_id, existing)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (profiles ?? []).map((p: any) => {
    const userCompanies = ucMap.get(p.id) ?? []
    return {
      id:                 p.id,
      email:              p.email,
      full_name:          p.full_name ?? '',
      role:               p.role ?? 'user',
      companies:          userCompanies,  // Array of companies
      branch_id:          p.branch_id ?? null,
      created_at:         p.created_at,
      preferred_locale:   p.preferred_locale ?? null,
      can_approve_orders: approveMap.get(p.id) === true,
      confirmed:          confirmedIds.has(p.id),  // email confirmed → has activated account
      last_sign_in:       lastSignIn.get(p.id) ?? null,
    }
  })

  return <AdminUsers users={users} companies={companies ?? []} branches={branches ?? []} />
}
