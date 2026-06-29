import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import { LAB_META } from '@/lab/registry'
import NewSheetForm from '@/components/lab/NewSheetForm'

export default async function NewLabSheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) redirect('/gallery')

  // Only 'alternatives' labs are created here; 'approval' sheets (e.g. custom-leather)
  // originate from their own tool, which captures the subject (the painted maquette).
  const labs = Object.values(LAB_META)
    .filter(m => (m.kind ?? 'alternatives') === 'alternatives')
    .map(m => ({ key: m.key, title: m.title, intro: m.intro ?? '', count: m.options.length }))

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Lab</p>
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Nova folha de aprovação</h1>
      <NewSheetForm labs={labs} />
    </div>
  )
}
