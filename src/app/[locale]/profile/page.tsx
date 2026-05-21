import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, gender, avatar_url, role, company_id')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-xl font-bold text-stone-900 mb-8">My Profile</h1>
      <ProfileForm
        email={user.email ?? ''}
        initialName={profile?.full_name ?? ''}
        initialGender={profile?.gender ?? ''}
        initialAvatar={profile?.avatar_url ?? ''}
      />
    </div>
  )
}
