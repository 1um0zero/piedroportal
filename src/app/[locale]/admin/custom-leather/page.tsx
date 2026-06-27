import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import MaqueteLeatherPicker from '@/components/custom/MaqueteLeatherPicker'

const LEATHERS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, src: `/custom/peles/leather-${i + 1}.png`, name: `Leather ${i + 1}`,
}))

export default async function CustomLeatherSpike() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(profile?.role)) notFound()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[3px] text-gold">Spike</div>
      <h1 className="mb-2 text-2xl font-light text-stone-800">Leather-by-piece selector</h1>
      <p className="mb-8 max-w-2xl text-sm text-stone-500">
        Pick a leather (it becomes the brush), then click a piece on the maquette — or a row in the
        list — to paint it. Hover highlights the piece. The line-art stays crisp on top (multiply
        blend); the colour shows through the white areas. Zones are hand-approximated for this spike.
      </p>
      <MaqueteLeatherPicker zonesUrl="/custom/maquete-zones/3310.json" leathers={LEATHERS} />
    </div>
  )
}
