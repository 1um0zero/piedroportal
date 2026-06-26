'use client'

// ─────────────────────────────────────────────────────────────────────────────
// LAB · Painel de decisão para o widget de campos "mm"
// Não está ligado a nada de produção. URL: /lab/mm-fields
// Objetivo: comparar ao vivo formas de introduzir um valor mm num intervalo
// com limites (ex.: rocker_toes 0–60), preservando digitação rápida + noção
// visual do que é aceite, sem a "linguiça" do <datalist>.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

const MIN = 0
const MAX = 60
const STEP = 1
const allowed = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP)

function clampSnap(raw: number): number {
  const v = Math.max(MIN, Math.min(MAX, raw))
  return allowed.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p))
}

// ── Variante A — o atual: input + <datalist> (a "linguiça") ───────────────────
function VariantDatalist() {
  const [value, setValue] = useState<number | null>(20)
  return (
    <FieldShell value={value}>
      <div className="relative">
        <input
          list="lab-datalist"
          type="text"
          inputMode="numeric"
          value={value == null ? '' : `${value} mm`}
          placeholder="mm"
          onChange={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            if (t === '') return setValue(null)
            if (allowed.some(v => String(v).startsWith(t) || String(v) === t)) setValue(Number(t))
          }}
          onBlur={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t)))
          }}
          onFocus={e => e.target.select()}
          className="w-24 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
        <datalist id="lab-datalist">
          {allowed.map(v => <option key={v} value={v} />)}
        </datalist>
      </div>
    </FieldShell>
  )
}

// ── Variante B — slider + número (recomendada) ────────────────────────────────
function VariantSlider() {
  const [value, setValue] = useState<number | null>(20)
  const pct = value == null ? 0 : ((value - MIN) / (MAX - MIN)) * 100
  return (
    <FieldShell value={value}>
      <div className="flex items-center gap-4 w-full max-w-md">
        <input
          type="text"
          inputMode="numeric"
          value={value == null ? '' : `${value} mm`}
          placeholder="mm"
          onChange={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            if (t === '') return setValue(null)
            if (allowed.some(v => String(v).startsWith(t) || String(v) === t)) setValue(Number(t))
          }}
          onBlur={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t)))
          }}
          onFocus={e => e.target.select()}
          className="w-24 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center shrink-0
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
        <div className="flex-1">
          <input
            type="range"
            min={MIN} max={MAX} step={STEP}
            value={value ?? MIN}
            onChange={e => setValue(Number(e.target.value))}
            className="w-full accent-gold cursor-pointer"
            style={{ background: `linear-gradient(to right, #B8975A ${pct}%, #e7e5e4 ${pct}%)` }}
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>{MIN} mm</span><span>{MAX} mm</span>
          </div>
        </div>
      </div>
    </FieldShell>
  )
}

// ── Variante C — stepper (▲▼ + clamp), sem noção de intervalo ──────────────────
function VariantStepper() {
  const [value, setValue] = useState<number | null>(20)
  const step = (d: number) => setValue(v => clampSnap((v ?? 0) + d))
  return (
    <FieldShell value={value}>
      <div className="inline-flex items-center h-9 bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
        <button type="button" onClick={() => step(-STEP)}
          className="w-9 h-full text-stone-500 hover:bg-stone-100 hover:text-gold text-lg leading-none">−</button>
        <input
          type="text"
          inputMode="numeric"
          value={value == null ? '' : `${value} mm`}
          placeholder="mm"
          onChange={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            if (t === '') return setValue(null)
            if (allowed.some(v => String(v).startsWith(t) || String(v) === t)) setValue(Number(t))
          }}
          onBlur={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t)))
          }}
          onFocus={e => e.target.select()}
          className="w-16 h-full text-sm bg-transparent text-center focus:outline-none"
        />
        <button type="button" onClick={() => step(STEP)}
          className="w-9 h-full text-stone-500 hover:bg-stone-100 hover:text-gold text-lg leading-none">+</button>
      </div>
    </FieldShell>
  )
}

// ── Variante D — input + texto de ajuda do intervalo (mínimo) ──────────────────
function VariantHint() {
  const [value, setValue] = useState<number | null>(20)
  return (
    <FieldShell value={value}>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          value={value == null ? '' : `${value} mm`}
          placeholder="mm"
          onChange={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            if (t === '') return setValue(null)
            if (allowed.some(v => String(v).startsWith(t) || String(v) === t)) setValue(Number(t))
          }}
          onBlur={e => {
            const t = e.target.value.replace(/ mm$/i, '')
            setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t)))
          }}
          onFocus={e => e.target.select()}
          className="w-24 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
        <span className="text-xs text-stone-400">{MIN}–{MAX} mm</span>
      </div>
    </FieldShell>
  )
}

// ── Moldura de cada variante ──────────────────────────────────────────────────
function FieldShell({ value, children }: { value: number | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="flex-1">{children}</div>
      <code className="text-xs text-stone-400 shrink-0 w-20 text-right">
        {value == null ? 'null' : value}
      </code>
    </div>
  )
}

const VARIANTS = [
  { key: 'B', title: 'Slider + número', tag: 'Recomendada',
    note: 'A barra mostra o intervalo (0 à esquerda, 60 à direita) e o thumb a posição. Escreves OU arrastas; impossível sair dos limites.',
    Comp: VariantSlider },
  { key: 'C', title: 'Stepper ▲▼', tag: null,
    note: 'Limpo e valida limites, mas de 1 em 1 até 60 é lento e não dá noção do intervalo — só clampa.',
    Comp: VariantStepper },
  { key: 'D', title: 'Input + ajuda "0–60 mm"', tag: 'Mínimo',
    note: 'Tira a linguiça e é honesto, mas é o mais pobre em delight.',
    Comp: VariantHint },
  { key: 'A', title: 'Atual — input + datalist', tag: 'Hoje',
    note: 'A "linguiça": o browser mostra 61 opções num scroll feio que ninguém usa.',
    Comp: VariantDatalist },
]

export default function MmFieldsLab() {
  return (
    <div className="min-h-screen bg-stone-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Lab · não-produção</p>
          <h1 className="text-2xl font-semibold text-stone-800">Campos mm — painel de decisão</h1>
          <p className="text-sm text-stone-500 mt-2">
            Intervalo de teste <strong>{MIN}–{MAX} mm</strong>, passo {STEP} (como rocker_toes).
            Experimenta digitar e, onde houver, arrastar. A coluna à direita mostra o valor guardado.
          </p>
        </header>

        <div className="space-y-5">
          {VARIANTS.map(({ key, title, tag, note, Comp }) => (
            <section key={key}
              className="bg-white rounded-[14px] p-6"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
                {tag && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
                    ${tag === 'Recomendada' ? 'bg-gold/15 text-gold'
                      : tag === 'Hoje' ? 'bg-red-50 text-red-400'
                      : 'bg-stone-100 text-stone-400'}`}>{tag}</span>
                )}
              </div>
              <p className="text-xs text-stone-500 mb-2">{note}</p>
              <div className="border-t border-stone-100">
                <Comp />
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-stone-400 mt-8 text-center">
          Escolhe uma e eu converto o <code>MmInput</code> partilhado — apanha todos os campos mm de uma vez.
        </p>
      </div>
    </div>
  )
}
