// ─────────────────────────────────────────────────────────────────────────────
// Reviewer-facing approval sheet. URL: /lab/s/[token]
// Open without login for `open_until` (2 business days after sending); afterwards
// the same link still works but requires the reviewer to authenticate.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ApprovalSheetForm from '@/components/lab/ApprovalSheetForm'

const todayISO = () => new Date().toISOString().slice(0, 10)

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  )
}

export default async function ReviewerSheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = createServiceClient()

  const { data: sheet } = await service.from('lab_sheets')
    .select('id, lab_key, title, intro, status, open_until, reviewer_name, overall_comment')
    .eq('token', token).single()

  if (!sheet) {
    return <Shell><div className="bg-white rounded-[14px] p-8 text-center text-stone-500" style={{ boxShadow: 'var(--shadow-card)' }}>Folha não encontrada.</div></Shell>
  }

  const { data: options } = await service.from('lab_options')
    .select('opt_key, title, subtitle, position, verdict, comment')
    .eq('sheet_id', sheet.id).order('position')

  const closed = sheet.status.startsWith('closed_')
  const open = !!sheet.open_until && todayISO() <= sheet.open_until

  // Access gate after the no-login window: require any authenticated session.
  if (!open && !closed) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return (
        <Shell>
          <div className="bg-white rounded-[14px] p-8 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs font-bold tracking-widest text-gold uppercase mb-3">Piedro Portal · Lab</p>
            <h1 className="text-xl font-semibold text-stone-800 mb-2">{sheet.title}</h1>
            <p className="text-sm text-stone-500 mb-6">
              O período de acesso directo a esta folha terminou. Por favor inicie sessão para continuar — o link
              mantém-se válido.
            </p>
            <Link href={`/login?next=${encodeURIComponent(`/lab/s/${token}`)}`}
              className="inline-block bg-gold text-white px-6 py-3 rounded-lg text-sm font-semibold">
              Iniciar sessão
            </Link>
          </div>
        </Shell>
      )
    }
  }

  const reviewerNote = sheet.reviewer_name ? `Olá ${sheet.reviewer_name},` : null

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Piedro Portal · Folha de aprovação</p>
        <h1 className="text-2xl font-semibold text-stone-800">{sheet.title}</h1>
        {reviewerNote && <p className="text-sm text-stone-600 mt-2">{reviewerNote}</p>}
        {sheet.intro && <p className="text-sm text-stone-500 mt-1 leading-relaxed">{sheet.intro}</p>}
      </header>

      <ApprovalSheetForm
        token={token}
        labKey={sheet.lab_key}
        closed={closed}
        answered={sheet.status === 'answered'}
        overallComment={sheet.overall_comment}
        options={(options ?? []).map(o => ({
          optKey: o.opt_key, title: o.title, subtitle: o.subtitle,
          verdict: o.verdict as 'chosen' | 'option' | 'rejected' | null, comment: o.comment,
        }))}
      />
    </Shell>
  )
}
