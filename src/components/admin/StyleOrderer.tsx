'use client'

import { useState, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Section } from '@/types'
import { saveStyleOrder } from '@/app/actions/admin-products'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

export type StyleItem = {
  style: string
  section: Section
  count: number
  picture: string | null
}

const SECTIONS: Section[] = ['KIDS', 'MEN', 'WOMEN']

type Props = { initial: Record<Section, StyleItem[]> }

export default function StyleOrderer({ initial }: Props) {
  const t = useTranslations('admin.order')
  const tg = useTranslations('gallery')

  const [styles, setStyles]   = useState<Record<Section, StyleItem[]>>(initial)
  const [section, setSection] = useState<Section>('KIDS')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dirty, setDirty]     = useState<Record<Section, boolean>>({ KIDS: false, MEN: false, WOMEN: false })
  const [dragging, setDragging] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)  // style we'd insert BEFORE (or '__end__')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const movingRef = useRef<string[]>([])

  const list = styles[section]
  const selecting = selected.size > 0

  // Selected styles of the active section, in their current display order.
  const selectedOrdered = useMemo(
    () => list.filter(x => selected.has(x.style)).map(x => x.style),
    [list, selected],
  )

  function toggleSelect(style: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(style)) next.delete(style); else next.add(style)
      return next
    })
  }

  function switchSection(s: Section) {
    setSection(s)
    setSelected(new Set())
    setMsg(null)
  }

  // Move `moving` styles so they sit immediately before `before` (or to the end
  // when before === null). Preserves the moving items' relative order.
  function performMove(moving: string[], before: string | null) {
    if (moving.length === 0) return
    setStyles(prev => {
      const cur = prev[section]
      const movingSet = new Set(moving)
      const movingItems = cur.filter(x => movingSet.has(x.style))
      const rest = cur.filter(x => !movingSet.has(x.style))
      let idx = before === null ? rest.length : rest.findIndex(x => x.style === before)
      if (idx < 0) idx = rest.length
      const next = [...rest.slice(0, idx), ...movingItems, ...rest.slice(idx)]
      return { ...prev, [section]: next }
    })
    setDirty(d => ({ ...d, [section]: true }))
    setSelected(new Set())
    setMsg(null)
  }

  // ── Drag handlers ──
  function onDragStart(style: string) {
    setDragging(true)
    // Drag the whole selection if the grabbed card is part of it, else just it.
    movingRef.current = selected.has(style) && selected.size > 0 ? selectedOrdered : [style]
  }
  function onDragEnd() { setDragging(false); setDragOver(null) }
  function onDrop(before: string | null) {
    performMove(movingRef.current, before)
    setDragging(false); setDragOver(null)
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await saveStyleOrder(section, list.map(x => x.style))
      if (res.error) setMsg({ kind: 'err', text: res.error })
      else { setDirty(d => ({ ...d, [section]: false })); setMsg({ kind: 'ok', text: t('saved') }) }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  // Insertion bar shown to the left of a card (and one trailing at the end).
  // Active (clickable to drop the current selection) only while selecting or dragging.
  // Plain render helper (not a component) so it can read the closures above.
  const insertBar = (before: string | null) => {
    const key = before ?? '__end__'
    const active = selecting || dragging
    const isOver = dragOver === key
    return (
      <div
        onClick={() => { if (selecting) performMove(selectedOrdered, before) }}
        onDragOver={(e) => { if (dragging) { e.preventDefault(); setDragOver(key) } }}
        onDragLeave={() => setDragOver(prev => (prev === key ? null : prev))}
        onDrop={(e) => { e.preventDefault(); onDrop(before) }}
        className={`self-stretch rounded-full transition-all
          ${active ? 'cursor-pointer' : 'pointer-events-none'}
          ${isOver ? 'w-2 bg-gold' : active ? 'w-1.5 bg-gold/30 hover:bg-gold/70' : 'w-1.5 bg-transparent'}`}
        title={selecting ? t('insert_here') : undefined}
        aria-label={selecting ? t('insert_here') : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-end gap-0 border-b border-stone-200">
        {SECTIONS.map(s => (
          <button key={s} onClick={() => switchSection(s)}
            className={`relative px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-colors
              ${s === section ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
            {tg(s.toLowerCase() as 'kids' | 'men' | 'women')}
            <span className="ml-1.5 text-xs font-normal text-stone-400">{styles[s].length}</span>
            {dirty[s] && <span className="ml-1 text-gold" title={t('unsaved')}>•</span>}
            {s === section && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-stone-50/90 backdrop-blur-sm py-2">
        <p className="text-sm text-stone-500">
          {selecting
            ? <span className="font-semibold text-gold">{t('selected_count', { n: selected.size })}</span>
            : t('drag_hint')}
        </p>
        {selecting && (
          <>
            <button onClick={() => performMove(selectedOrdered, null)}
              className="rounded-lg border border-gold text-gold px-3 py-1.5 text-xs font-semibold hover:bg-gold/5">
              {t('move_to_end')}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="rounded-lg border border-stone-200 text-stone-500 px-3 py-1.5 text-xs font-medium hover:bg-stone-50">
              {t('clear_selection')}
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {msg && (
            <span className={`text-xs font-medium ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {msg.text}
            </span>
          )}
          <button onClick={save} disabled={saving || !dirty[section]}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark
                       disabled:opacity-40 inline-flex items-center gap-2">
            {saving && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {/* Style grid */}
      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-400">{t('empty')}</p>
      ) : (
        <div className="flex flex-wrap items-start gap-y-3">
          {list.map(it => {
            const isSel = selected.has(it.style)
            return (
              <div key={it.style} className="flex items-stretch">
                {insertBar(it.style)}
                <div
                  draggable
                  onDragStart={() => onDragStart(it.style)}
                  onDragEnd={onDragEnd}
                  onClick={() => toggleSelect(it.style)}
                  className={`relative w-28 cursor-grab active:cursor-grabbing rounded-xl border bg-white p-2
                    transition-all select-none
                    ${isSel ? 'border-gold ring-2 ring-gold/30 shadow-sm' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  {/* Checkbox */}
                  <span
                    className={`absolute top-1.5 left-1.5 z-10 w-4 h-4 rounded border flex items-center justify-center
                      ${isSel ? 'bg-gold border-gold' : 'bg-white/90 border-stone-300'}`}
                  >
                    {isSel && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth={1.8}
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="aspect-square">
                    {it.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${BUCKET}/${it.picture}`} alt={it.style}
                        className="w-full h-full object-contain" draggable={false} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
                        {it.style}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-center text-xs font-semibold text-stone-700 truncate">{it.style}</p>
                  <p className="text-center text-[10px] text-stone-400">{t('colours_n', { n: it.count })}</p>
                </div>
              </div>
            )
          })}
          {/* Trailing insertion = move to end */}
          {insertBar(null)}
        </div>
      )}
    </div>
  )
}
