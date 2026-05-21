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

  const [{ data: profiles }, { data: companies }] = await Promise.all([
    service
      .from('profiles')
      .select('id, email, full_name, role, company_id, created_at, companies(name)')
      .order('created_at', { ascending: false }),
    service
      .from('companies')
      .select('id, name')
      .order('name'),
  ])

  const users = (profiles ?? []).map((p: any) => ({
    id:           p.id,
    email:        p.email,
    full_name:    p.full_name ?? '',
    role:         p.role ?? 'user',
    company_id:   p.company_id ?? null,
    company_name: p.companies?.name ?? null,
    created_at:   p.created_at,
  }))

  return <AdminUsers users={users} companies={companies ?? []} />
}
