import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPiedroAdmin } from '@/lib/roles'
import Viewer3DLab from '@/components/piedro-visualizer/Viewer3DLab'

// Banca INTERNA (admin) para experimentar o visualizador 3D de adições.
// NÃO faz parte do fluxo de encomenda do cliente. Protótipo — a deformação é
// uma aproximação ilustrativa (não calibrada por SKU), não representa o produto
// fabricado. Não usar em contexto de confirmação de encomenda sem esse aviso.
export default async function Viewer3DLabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(profile?.role)) notFound()

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-light text-stone-800">3D additions viewer — lab</h1>
      <p className="mb-4 text-sm text-stone-500">
        Sapato base (GLB real das adições pair-by-pair) que reflete em tempo real as adições
        <strong> CUSTOM</strong> com tradução geométrica — alturas, suplementos, larguras por zona,
        cunhas, rocker e alteamento — com zonas realçadas e bandeiras.
      </p>
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠ Protótipo interno. Só aparecem as adições CUSTOM que <strong>têm forma</strong> (as de material,
        forro, fecho e cor ficam de fora). A deformação é <strong>ilustrativa</strong> — janelas não
        calibradas por horma/SKU. Não representa o produto fabricado e não está no fluxo do cliente.
      </div>

      <Viewer3DLab />
    </div>
  )
}
