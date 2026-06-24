import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import FootTemplate from '@/components/custom/FootTemplate'

// Admin-only preview of the CUSTOM design assets (foot templates, toe shapes).
export default async function CustomPreviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(profile?.role)) notFound()

  const toeShapes = ['Square', 'Pointed', 'Rounded', 'Nature']

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-light text-stone-800">CUSTOM — design assets preview</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Foot templates (empty)</h2>
        <div className="flex flex-wrap items-end gap-10">
          <figure className="text-center">
            <FootTemplate view="sole" side="l" className="h-64" />
            <figcaption className="mt-2 text-xs text-stone-500">Sole · Left</figcaption>
          </figure>
          <figure className="text-center">
            <FootTemplate view="sole" side="r" className="h-64" />
            <figcaption className="mt-2 text-xs text-stone-500">Sole · Right</figcaption>
          </figure>
          <figure className="text-center">
            <FootTemplate view="lateral" side="l" className="w-72" />
            <figcaption className="mt-2 text-xs text-stone-500">Lateral · Left</figcaption>
          </figure>
          <figure className="text-center">
            <FootTemplate view="lateral" side="r" className="w-72" />
            <figcaption className="mt-2 text-xs text-stone-500">Lateral · Right</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gold">Toe shapes</h2>
        <div className="flex flex-wrap gap-6">
          {toeShapes.map(t => (
            <figure key={t} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/custom/toe-shape/${t.toLowerCase()}.svg`} alt={t} className="h-24" />
              <figcaption className="mt-1 text-xs text-stone-500">{t}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  )
}
