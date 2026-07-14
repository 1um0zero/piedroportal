import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import FootstepsSpinner from '@/components/ui/FootstepsSpinner'
import PiedroLogoLoader from '@/components/ui/PiedroLogoLoader'

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

      {/* Hero — the logo-strap loader (external-effect idea, built on our own mark) */}
      <section className="mb-6 flex flex-col items-center rounded-[14px] bg-white p-12"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <PiedroLogoLoader size={72} label="Loading…" />
        <p className="mt-6 text-xs text-stone-400">
          Logo-strap loader — golden light walks the foot straps, heel → toe.
        </p>
      </section>

      {/* Logo loader — sizes, speeds, contexts */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Logo loader</h2>
        <div className="mb-4 flex flex-wrap items-end gap-12 rounded-[14px] bg-white p-10"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          {[28, 40, 56, 80, 120].map(s => (
            <figure key={s} className="text-center">
              <PiedroLogoLoader size={s} />
              <figcaption className="mt-3 text-xs text-stone-500">{s}px</figcaption>
            </figure>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-white p-8"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <PiedroLogoLoader size={56} duration={1.1} />
            <span className="text-xs text-stone-500">fast (1.1s)</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-white p-8"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <PiedroLogoLoader size={56} duration={2.6} />
            <span className="text-xs text-stone-500">slow (2.6s)</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[14px] bg-stone-900 p-8">
            <PiedroLogoLoader size={56} label="On dark" />
          </div>
        </div>
      </section>

      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
        Earlier idea — hand-drawn footsteps
      </h2>

      {/* Footsteps hero */}
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
