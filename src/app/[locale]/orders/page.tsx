import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single()

  const t = await getTranslations('auth')

  // No company assigned yet → show pending message
  if (!profile?.company_id) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-stone-800">
          {t('pending_company')}
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed">
          {t('pending_company_desc')}
        </p>
        <Link
          href="/gallery"
          className="inline-block text-sm text-gold hover:underline"
        >
          ← {t('contact')} · Ga naar Galerij
        </Link>
      </div>
    )
  }

  // Has company → orders will go here
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">
        Encomendas
      </h1>
      <p className="text-sm text-stone-400">Em construção…</p>
    </div>
  )
}
