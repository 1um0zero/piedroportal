import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  // Verify caller is piedro_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, companyId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Membership lives in user_companies, not the deprecated profiles.company_id.
  // "Set the company" semantics: clear existing memberships, then add the new one.
  const service = createServiceClient()
  const { error: delErr } = await service
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (companyId) {
    const { error: insErr } = await service
      .from('user_companies')
      .insert({ user_id: userId, company_id: companyId, is_company_admin: false })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
