import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'
import SheetAdminPanel from '@/components/lab/SheetAdminPanel'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'
const VERDICT: Record<string, { label: string; cls: string }> = {
  chosen:   { label: 'Escolhido', cls: 'text-gold' },
  option:   { label: 'Opção',     cls: 'text-stone-600' },
  rejected: { label: 'Recusado',  cls: 'text-red-500' },
}

export default async function LabSheetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) redirect('/gallery')

  const service = createServiceClient()
  const { data: sheet } = await service.from('lab_sheets')
    .select('id, title, status, token, reviewer_name, reviewer_email, sent_at, open_until, overall_comment, responded_at')
    .eq('id', id).single()
  if (!sheet) redirect('/admin/lab')

  const { data: options } = await service.from('lab_options')
    .select('opt_key, title, verdict, comment, position').eq('sheet_id', id).order('position')

  const link = `${SITE}/lab/s/${sheet.token}`
  const answered = sheet.status === 'answered' || sheet.status.startsWith('closed_')

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/lab" className="text-xs text-stone-400 hover:text-gold">← Folhas</Link>
      <h1 className="text-2xl font-semibold text-stone-800 mt-2 mb-1">{sheet.title}</h1>
      <p className="text-sm text-stone-500 mb-6">
        Revisor: {sheet.reviewer_name ?? '—'}{sheet.reviewer_email ? ` · ${sheet.reviewer_email}` : ''}
      </p>

      <SheetAdminPanel
        id={sheet.id} status={sheet.status} link={link}
        sentAt={sheet.sent_at} openUntil={sheet.open_until}
      />

      {answered && (
        <div className="mt-6 bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-semibold text-stone-800 mb-4">Respostas</h2>
          <div className="space-y-3">
            {(options ?? []).map(o => {
              const v = o.verdict ? VERDICT[o.verdict] : null
              return (
                <div key={o.opt_key} className="flex items-start justify-between gap-4 border-b border-stone-50 pb-3">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{o.title}</p>
                    {o.comment && <p className="text-xs text-stone-500 mt-0.5">{o.comment}</p>}
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${v?.cls ?? 'text-stone-300'}`}>{v?.label ?? '—'}</span>
                </div>
              )
            })}
          </div>
          {sheet.overall_comment && (
            <p className="text-sm text-stone-600 mt-4 p-3 bg-stone-50 rounded-lg">
              <strong className="text-stone-700">Comentário geral:</strong> {sheet.overall_comment}
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-center">
        <Link href={`/lab/s/${sheet.token}`} target="_blank" className="text-xs text-stone-400 hover:text-gold underline">
          Pré-visualizar a folha como o revisor a vê ↗
        </Link>
      </p>
    </div>
  )
}
