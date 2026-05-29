import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import AdminUsers from '@/components/admin/AdminUsers'

export default async function AdminUsersPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') redirect('/gallery')

  // Load all data with service client (bypasses RLS)
  const service = createServiceClient()

  const [{ data: profiles }, { data: companies }, { data: userCompanies }] = await Promise.all([
    service
      .from('profiles')
      .select('id, email, full_name, role, company_id, created_at')
      .order('created_at', { ascending: false }),
    service
      .from('companies')
      .select('id, name')
      .order('name'),
    service
      .from('user_companies')
      .select('user_id, company_id, is_company_admin, companies(name)'),
  ])

  // Map user_companies by user_id for quick lookup
  const ucMap = new Map<string, { company_id: string; company_name: string; is_company_admin: boolean }>()
  for (const uc of userCompanies ?? []) {
    ucMap.set(uc.user_id, {
      company_id: uc.company_id,
      company_name: (uc as any).companies?.name ?? null,
      is_company_admin: uc.is_company_admin,
    })
  }

  const users = (profiles ?? []).map((p: any) => {
    const uc = ucMap.get(p.id)
    return {
      id:                 p.id,
      email:              p.email,
      full_name:          p.full_name ?? '',
      role:               p.role ?? 'user',
      company_id:         uc?.company_id ?? p.company_id ?? null,  // Fallback to old company_id for backwards compat
      company_name:       uc?.company_name ?? null,
      is_company_admin:   uc?.is_company_admin ?? false,
      created_at:         p.created_at,
    }
  })

  return <AdminUsers users={users} companies={companies ?? []} />
}
