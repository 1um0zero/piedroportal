import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import FootstepsSpinner from '@/components/ui/FootstepsSpinner'

// Admin-only lab to preview the themed footwear spinner before going public.
export default async function SpinnerLabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(profile?.role)) notFound()

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-light text-stone-800">Spinner lab</h1>
      <p className="mb-10 text-sm text-stone-500">
        Themed footwear loader — golden footsteps walking, “always one step ahead”. Not public yet.
      </p>

      {/* Hero */}
      <section className="mb-10 flex flex-col items-center rounded-[14px] bg-white p-12"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <FootstepsSpinner size={48} label="Loading…" />
      </section>

      {/* Sizes */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Sizes</h2>
        <div className="flex flex-wrap items-end gap-12 rounded-[14px] bg-white p-10"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          {[24, 32, 40, 56, 72].map(s => (
            <figure key={s} className="text-center">
              <FootstepsSpinner size={s} />
              <figcaption className="mt-3 text-xs text-stone-500">{s}px</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* On dark + inline contexts */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Contexts</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-[14px] bg-stone-900 p-10">
            <FootstepsSpinner size={44} label="On dark" />
          </div>
          <div className="flex items-center justify-center rounded-[14px] bg-stone-50 p-10"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <span className="mr-3 text-sm text-stone-600">Inline:</span>
            <FootstepsSpinner size={22} />
          </div>
        </div>
      </section>

      <p className="text-xs text-stone-400">
        Pure CSS/SVG · respects <code>prefers-reduced-motion</code> · colour follows <code>text-gold</code>.
      </p>
    </div>
  )
}
