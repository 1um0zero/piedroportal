'use client'

// ─────────────────────────────────────────────────────────────────────────────
// LAB · playground for the "mm" field widget. Not production. URL: /lab/mm-fields
// Widgets live in src/lab/widgets/mm-fields.tsx (shared with approval sheets).
// ─────────────────────────────────────────────────────────────────────────────

import { MmSlider, MmHint, MmStepper, MmDatalist, MM_MIN, MM_MAX, MM_STEP } from '@/lab/widgets/mm-fields'

const VARIANTS = [
  { key: 'B', title: 'Slider + número', tag: 'Recomendada',
    note: 'A barra mostra o intervalo (0 à esquerda, 60 à direita) e o thumb a posição. Escreves OU arrastas; impossível sair dos limites.',
    Comp: MmSlider },
  { key: 'D', title: 'Input + ajuda "0–60"', tag: 'Mínimo',
    note: 'Campo simples, unidade "mm" à direita e o intervalo ao lado. Tira a linguiça e é honesto.',
    Comp: MmHint },
  { key: 'C', title: 'Stepper ▲▼', tag: null,
    note: 'Botões − / + (e digitação). Limpo, mas de 1 em 1 até 60 é lento e não dá noção do intervalo.',
    Comp: MmStepper },
  { key: 'A', title: 'Atual — input + datalist', tag: 'Hoje',
    note: 'A "linguiça": o browser mostra 61 opções num scroll feio. Mantida com o sufixo dentro do campo para se ver o defeito de digitação dos 2 dígitos.',
    Comp: MmDatalist },
]

export default function MmFieldsLab() {
  return (
    <div className="min-h-screen bg-stone-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Lab · não-produção</p>
          <h1 className="text-2xl font-semibold text-stone-800">Campos mm — painel de decisão</h1>
          <p className="text-sm text-stone-500 mt-2">
            Intervalo de teste <strong>{MM_MIN}–{MM_MAX} mm</strong>, passo {MM_STEP} (como rocker_toes).
            Experimenta digitar e, onde houver, arrastar.
          </p>
        </header>

        <div className="space-y-5">
          {VARIANTS.map(({ key, title, tag, note, Comp }) => (
            <section key={key} className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
                {tag && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
                    ${tag === 'Recomendada' ? 'bg-gold/15 text-gold'
                      : tag === 'Hoje' ? 'bg-red-50 text-red-400'
                      : 'bg-stone-100 text-stone-400'}`}>{tag}</span>
                )}
              </div>
              <p className="text-xs text-stone-500 mb-3">{note}</p>
              <div className="border-t border-stone-100 pt-4"><Comp /></div>
            </section>
          ))}
        </div>

        <p className="text-xs text-stone-400 mt-8 text-center">
          Estas alternativas são as mesmas que entram nas folhas de aprovação (<code>/admin/lab</code>).
        </p>
      </div>
    </div>
  )
}
