import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:              { label: 'Rascunho',              cls: 'bg-stone-100 text-stone-500' },
  sent:               { label: 'Enviada',               cls: 'bg-blue-50 text-blue-500' },
  answered:           { label: 'Respondida',            cls: 'bg-gold/15 text-gold' },
  closed_implemented: { label: 'Fechada · implementada', cls: 'bg-green-50 text-green-600' },
  closed_cancelled:   { label: 'Fechada · cancelada',    cls: 'bg-red-50 text-red-500' },
}

export default async function AdminLabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) redirect('/gallery')

  const service = createServiceClient()
  const { data: sheets } = await service.from('lab_sheets')
    .select('id, title, status, reviewer_name, sent_at, open_until, responded_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Lab</p>
          <h1 className="text-2xl font-semibold text-stone-800">Folhas de aprovação</h1>
        </div>
        <Link href="/admin/lab/new"
          className="bg-gold text-white px-5 py-2.5 rounded-lg text-sm font-semibold">+ Nova folha</Link>
      </div>

      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
              <th className="px-5 py-3 font-medium">Título</th>
              <th className="px-5 py-3 font-medium">Revisor</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Respondida</th>
            </tr>
          </thead>
          <tbody>
            {(sheets ?? []).map(s => {
              const st = STATUS_LABEL[s.status] ?? { label: s.status, cls: 'bg-stone-100 text-stone-500' }
              return (
                <tr key={s.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/admin/lab/${s.id}`} className="font-medium text-stone-800 hover:text-gold">{s.title}</Link>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{s.reviewer_name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3 text-stone-500">
                    {s.responded_at ? new Date(s.responded_at).toLocaleDateString('pt-PT') : '—'}
                  </td>
                </tr>
              )
            })}
            {!sheets?.length && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-stone-400">Ainda não há folhas. Cria a primeira.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
