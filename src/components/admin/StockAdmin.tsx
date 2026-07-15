'use client'

import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  type StockAdminRow,
  addProductsToStockAction,
  saveStockGridAction,
  setStockFlagAction,
  searchProductsForStock,
} from '@/app/actions/admin-stock'
import { productImageUrl as imageUrl } from '@/lib/products/image-url'
import { nz } from '@/lib/format'

type SearchHit = { id: string; style_name: string; colour_id: string; color_name: string }

export default function StockAdmin({ initialRows }: { initialRows: StockAdminRow[] }) {
  const t = useTranslations('admin.stock')
  const [rows, setRows] = useState(initialRows)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const lastIndexRef = useRef<number | null>(null)
  const [adding, setAdding] = useState(false)

  // qty[productId][size]; only sizes within each product's range exist
  const [qty, setQty] = useState<Record<string, Record<number, number>>>(() => initGrid(initialRows))
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function initGrid(rs: StockAdminRow[]): Record<string, Record<number, number>> {
    const g: Record<string, Record<number, number>> = {}
    for (const r of rs) {
      const m: Record<number, number> = {}
      for (let s = r.size_first; s <= r.size_last; s++) m[s] = r.stock[s] ?? 0
      g[r.id] = m
    }
    return g
  }

  async function runSearch(q: string) {
    setQuery(q)
    setSelected(new Set())
    lastIndexRef.current = null
    if (q.trim().length < 2) { setHits([]); return }
    setHits(await searchProductsForStock(q))
  }

  function toggleHit(index: number, shiftKey: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      const id = hits[index].id
      if (shiftKey && lastIndexRef.current !== null) {
        const [a, b] = [Math.min(lastIndexRef.current, index), Math.max(lastIndexRef.current, index)]
        const turnOn = !prev.has(id)
        for (let i = a; i <= b; i++) {
          if (turnOn) next.add(hits[i].id)
          else next.delete(hits[i].id)
        }
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      lastIndexRef.current = index
      return next
    })
  }

  async function addSelected() {
    if (selected.size === 0) return
    setAdding(true)
    const res = await addProductsToStockAction([...selected])
    setAdding(false)
    if (res.rows) {
      setRows(res.rows)
      setQty((prev) => {
        const fresh = initGrid(res.rows!)
        // keep any unsaved edits already typed for existing rows
        for (const id of Object.keys(prev)) if (fresh[id]) fresh[id] = { ...fresh[id], ...prev[id] }
        return fresh
      })
      setHits((h) => h.filter((x) => !selected.has(x.id)))
      setSelected(new Set())
      lastIndexRef.current = null
      setQuery('')
      setHits([])
    }
  }

  async function removeRow(id: string) {
    await setStockFlagAction(id, false)
    setRows((r) => r.filter((x) => x.id !== id))
    setDirty((d) => { const n = new Set(d); n.delete(id); return n })
  }

  function setCell(productId: string, size: number, value: number) {
    setQty((g) => ({ ...g, [productId]: { ...g[productId], [size]: value } }))
    setDirty((d) => new Set(d).add(productId))
    if (status === 'saved') setStatus('idle')
  }

  async function saveAll() {
    if (dirty.size === 0) return
    setStatus('saving')
    const entries = [...dirty].map((productId) => ({
      productId,
      quantities: Object.entries(qty[productId] ?? {}).map(([size, q]) => ({ size: Number(size), qty: q })),
    }))
    const res = await saveStockGridAction(entries)
    if (res.error) { setStatus('error'); return }
    setDirty(new Set())
    setStatus('saved')
    setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
  }

  // ---- grid geometry: union of size ranges across all rows ----
  const allSizes = useMemo(() => {
    if (rows.length === 0) return [] as number[]
    const min = Math.min(...rows.map((r) => r.size_first))
    const max = Math.max(...rows.map((r) => r.size_last))
    const out: number[] = []
    for (let s = min; s <= max; s++) out.push(s)
    return out
  }, [rows])

  // per-row on-hand total (reactive to edits) + grand total across all rows
  const rowTotals = useMemo(() => {
    const m: Record<string, number> = {}
    for (const row of rows) {
      let sum = 0
      const q = qty[row.id] ?? {}
      for (const s in q) sum += q[Number(s)] || 0
      m[row.id] = sum
    }
    return m
  }, [rows, qty])
  const grandTotal = useMemo(
    () => Object.values(rowTotals).reduce((a, b) => a + b, 0),
    [rowTotals],
  )

  // refs for keyboard navigation: cellRefs[rowIdx][colIdx]
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const cellKey = (r: number, c: number) => `${r}:${c}`

  function moveFocus(rowIdx: number, colIdx: number, dr: number, dc: number) {
    let r = rowIdx + dr
    let c = colIdx + dc
    while (r >= 0 && r < rows.length && c >= 0 && c < allSizes.length) {
      const el = cellRefs.current.get(cellKey(r, c))
      if (el) { el.focus(); el.select(); return }
      r += dr
      c += dc
    }
  }

  function onCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) {
    const nav: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      Enter: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const d = nav[e.key]
    if (!d) return
    e.preventDefault()
    moveFocus(rowIdx, colIdx, d[0], d[1])
  }

  return (
    <div className="space-y-8">
      {/* Add models */}
      <div className="rounded-[14px] border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-700">{t('addTitle')}</h2>
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          title={t('searchHint')}
          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        {query.trim().length >= 2 && (
          <>
            <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-stone-100 rounded-lg border border-stone-100 select-none">
              {hits.length === 0 ? (
                <li className="px-3 py-2 text-sm text-stone-400">{t('noResults')}</li>
              ) : hits.map((h, i) => (
                <li
                  key={h.id}
                  onClick={(e) => toggleHit(i, e.shiftKey)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50 ${selected.has(h.id) ? 'bg-gold/10' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(h.id)}
                    onChange={() => {}}
                    className="pointer-events-none h-4 w-4 accent-[#B8975A]"
                    tabIndex={-1}
                  />
                  <span>{h.colour_id} <span className="text-stone-400">· {h.color_name}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-stone-400">{t('shiftHint')}</span>
              <button
                onClick={addSelected}
                disabled={selected.size === 0 || adding}
                className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40"
              >
                {adding ? t('saving') : t('addSelected', { count: selected.size })}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stock grid */}
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">{t('noStock')}</p>
      ) : (
        <div className="rounded-[14px] border border-stone-200 bg-white" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wide text-stone-400">
                  <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-medium">{t('model')}</th>
                  {allSizes.map((s) => (
                    <th key={s} className="px-1 py-2 text-center font-medium tabular-nums">{s}</th>
                  ))}
                  <th className="sticky right-0 z-10 bg-white border-l border-stone-200 px-3 py-2 text-center font-medium">{t('total')}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={row.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="sticky left-0 z-10 bg-white px-4 py-1.5">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-stone-50">
                          {row.picture_name && (
                            <Image src={imageUrl(row.picture_name)} alt={row.style_name} fill className="object-contain" sizes="36px" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {row.colour_id}
                            {dirty.has(row.id) && <span className="ml-1 text-gold">•</span>}
                          </div>
                          <div className="text-[11px] text-stone-400">{row.color_name} · {row.size_unit ?? 'EU'}</div>
                        </div>
                      </div>
                    </td>
                    {allSizes.map((s, colIdx) => {
                      const inRange = s >= row.size_first && s <= row.size_last
                      if (!inRange) return <td key={s} className="bg-stone-50/60 px-0.5 py-1" />
                      const v = qty[row.id]?.[s] ?? 0
                      return (
                        <td key={s} className="px-0.5 py-1">
                          <input
                            ref={(el) => {
                              const k = cellKey(rowIdx, colIdx)
                              if (el) cellRefs.current.set(k, el)
                              else cellRefs.current.delete(k)
                            }}
                            type="text"
                            inputMode="numeric"
                            value={v === 0 ? '' : String(v)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '')
                              setCell(row.id, s, digits === '' ? 0 : Math.min(parseInt(digits, 10), 9999))
                            }}
                            onKeyDown={(e) => onCellKeyDown(e, rowIdx, colIdx)}
                            className={`h-8 w-11 rounded-md border text-center tabular-nums outline-none focus:border-gold focus:ring-1 focus:ring-gold ${v > 0 ? 'border-stone-300 bg-white text-stone-900' : 'border-stone-200 bg-stone-50 text-stone-400'}`}
                          />
                        </td>
                      )
                    })}
                    <td className="sticky right-0 z-10 bg-white border-l border-stone-200 px-3 py-1 text-center text-sm font-semibold tabular-nums text-stone-900">
                      {nz(rowTotals[row.id] ?? 0)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button onClick={() => removeRow(row.id)} className="whitespace-nowrap text-xs text-red-500 hover:text-red-700">
                        {t('remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 text-sm">
                  <td className="sticky left-0 z-10 bg-stone-50 px-4 py-2 font-semibold text-stone-700">{t('grandTotal')}</td>
                  <td colSpan={allSizes.length} className="bg-stone-50" />
                  <td className="sticky right-0 z-10 bg-stone-50 border-l border-stone-200 px-3 py-2 text-center font-bold tabular-nums text-stone-900">{nz(grandTotal)}</td>
                  <td className="bg-stone-50" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-4 py-3">
            {status === 'saved' && <span className="text-xs text-green-600">{t('saved')}</span>}
            {status === 'error' && <span className="text-xs text-red-600">{t('saveError')}</span>}
            {dirty.size > 0 && status !== 'saving' && (
              <span className="text-xs text-stone-400">{t('unsaved', { count: dirty.size })}</span>
            )}
            <button
              onClick={saveAll}
              disabled={status === 'saving' || dirty.size === 0}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40"
            >
              {status === 'saving' ? t('saving') : t('saveAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
