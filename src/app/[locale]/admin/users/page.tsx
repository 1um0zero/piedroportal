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
      .select('user_id, company_id, is_company_admin, companies(id, name)'),
  ])

  // Map user_companies by user_id (multiple companies per user)
  const ucMap = new Map<string, Array<{ company_id: string; company_name: string; is_company_admin: boolean }>>()
  for (const uc of userCompanies ?? []) {
    const existing = ucMap.get(uc.user_id) ?? []
    existing.push({
      company_id: uc.company_id,
      company_name: (uc as any).companies?.name ?? null,
      is_company_admin: uc.is_company_admin,
    })
    ucMap.set(uc.user_id, existing)
  }

  const users = (profiles ?? []).map((p: any) => {
    const userCompanies = ucMap.get(p.id) ?? []
    return {
      id:                 p.id,
      email:              p.email,
      full_name:          p.full_name ?? '',
      role:               p.role ?? 'user',
      companies:          userCompanies,  // Array of companies
      created_at:         p.created_at,
    }
  })

  return <AdminUsers users={users} companies={companies ?? []} />
}
