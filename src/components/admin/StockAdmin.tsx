'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  type StockAdminRow,
  saveProductStockAction,
  setStockFlagAction,
  searchProductsForStock,
} from '@/app/actions/admin-stock'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const imageUrl = (name: string) => `${SUPABASE_URL}/storage/v1/object/public/products/${name}?v=2`

type SearchHit = { id: string; style_name: string; colour_id: string; color_name: string }

export default function StockAdmin({ initialRows }: { initialRows: StockAdminRow[] }) {
  const t = useTranslations('admin.stock')
  const [rows, setRows] = useState(initialRows)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])

  async function runSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setHits([]); return }
    setHits(await searchProductsForStock(q))
  }

  async function addToStock(hit: SearchHit) {
    await setStockFlagAction(hit.id, true)
    setHits((h) => h.filter((x) => x.id !== hit.id))
    setQuery('')
    // Reload to pull the new row with its (empty) size range.
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      {/* Add a model */}
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
          <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-100">
            {hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-stone-400">{t('noResults')}</li>
            ) : hits.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{h.style_name}.{h.colour_id} <span className="text-stone-400">· {h.color_name}</span></span>
                <button onClick={() => addToStock(h)} className="rounded-md bg-gold px-3 py-1 text-xs font-semibold text-white hover:bg-gold-dark">
                  {t('add')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stock rows */}
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">{t('noStock')}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <StockRow key={row.id} row={row} onRemoved={() => setRows((r) => r.filter((x) => x.id !== row.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

function StockRow({ row, onRemoved }: { row: StockAdminRow; onRemoved: () => void }) {
  const t = useTranslations('admin.stock')
  const sizes: number[] = []
  for (let s = row.size_first; s <= row.size_last; s++) sizes.push(s)

  const [qty, setQty] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    for (const s of sizes) init[s] = row.stock[s] ?? 0
    return init
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function save() {
    setStatus('saving')
    await saveProductStockAction(row.id, sizes.map((s) => ({ size: s, qty: qty[s] ?? 0 })))
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 1500)
  }

  async function remove() {
    await setStockFlagAction(row.id, false)
    onRemoved()
  }

  return (
    <div className="rounded-[14px] border border-stone-200 bg-white p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-50">
          {row.picture_name && <Image src={imageUrl(row.picture_name)} alt={row.style_name} fill className="object-contain" sizes="56px" />}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-stone-900">{row.style_name}.{row.colour_id}</div>
          <div className="text-xs text-stone-400">{row.color_name} · {row.size_unit ?? 'EU'}</div>
        </div>
        <button onClick={remove} className="text-xs text-red-500 hover:text-red-700">{t('remove')}</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {sizes.map((s) => (
          <label key={s} className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400">{s}</span>
            <input
              type="number"
              min={0}
              value={qty[s] ?? 0}
              onChange={(e) => setQty((q) => ({ ...q, [s]: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
              className="w-12 rounded-md border border-stone-300 px-1 py-1 text-center text-sm tabular-nums"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        {status === 'saved' && <span className="text-xs text-green-600">{t('saved')}</span>}
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-50"
        >
          {status === 'saving' ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}
