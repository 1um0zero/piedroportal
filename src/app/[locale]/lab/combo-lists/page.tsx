'use client'

// ─────────────────────────────────────────────────────────────────────────────
// LAB · combo-list field. Not production. URL: /lab/combo-lists
// Compares today's inline option chips (OSB) with a floating-popover replica that
// borrows the RangeField interaction language (ComboField).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { ComboField } from '@/components/ui/ComboField'

// Real OSB option fields.
const SOLE_TYPE = ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','Sportive Black','Sportive Beige','Sportive Grey','Sportive White','EVA Lightweight Amber','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown']  // 18
const TOE_PUFFS = ['Soft','Standard','Hard']  // 3

function InlineChips({ options, value, onChange }: { options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value === opt
        return (
          <button key={opt} type="button" onClick={() => onChange(on ? null : opt)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-all
              ${on ? 'border-gold bg-gold/10 text-gold' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function Card({ title, tag, note, children }: { title: string; tag?: string | null; note: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        {tag && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
            ${tag === 'Proposta' ? 'bg-gold/15 text-gold' : 'bg-stone-100 text-stone-400'}`}>{tag}</span>
        )}
      </div>
      <p className="text-xs text-stone-500 mb-3">{note}</p>
      <div className="border-t border-stone-100 pt-4">{children}</div>
    </section>
  )
}

export default function ComboListsLab() {
  const [a, setA] = useState<string | null>('EVA Grey')
  const [b, setB] = useState<string | null>('EVA Grey')
  const [c, setC] = useState<string | null>('Standard')
  const [d, setD] = useState<string | null>('Standard')

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Lab · não-produção</p>
          <h1 className="text-2xl font-semibold text-stone-800">Campos — lista combo</h1>
          <p className="text-sm text-stone-500 mt-2">
            Mesma linguagem do widget mm: o campo mostra a escolha e os chips aparecem a flutuar só ao abrir.
            Comparação com a forma actual (chips sempre visíveis), em dois casos reais do OSB.
          </p>
        </header>

        <div className="space-y-5">
          <Card title="Muitas opções — hoje" tag="Hoje"
            note="Sole type (18 opções). Sempre visível: ocupa muito espaço e polui um painel com dezenas de campos.">
            <InlineChips options={SOLE_TYPE} value={a} onChange={setA} />
          </Card>

          <Card title="Muitas opções — proposta" tag="Proposta"
            note="O mesmo campo, com os chips a flutuar num popover ao abrir. O painel fica limpo; a escolha vê-se no campo.">
            <ComboField options={SOLE_TYPE} value={b} onChange={setB} />
          </Card>

          <Card title="Poucas opções — hoje" tag="Hoje"
            note="Toe puffs (3 opções). Inline funciona bem — pouca poluição.">
            <InlineChips options={TOE_PUFFS} value={c} onChange={setC} />
          </Card>

          <Card title="Poucas opções — proposta" tag="Proposta"
            note="O mesmo em popover. Funcional, mas para 3–4 chips talvez não compense esconder — vê e decide.">
            <ComboField options={TOE_PUFFS} value={d} onChange={setD} />
          </Card>
        </div>

        <p className="text-xs text-stone-400 mt-8 text-center">
          Recomendação: popover para listas longas; inline mantém-se para 3–4 opções. Aguarda a tua decisão.
        </p>
      </div>
    </div>
  )
}
