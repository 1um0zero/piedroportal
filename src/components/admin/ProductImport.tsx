'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { applyProductImport } from '@/app/actions/admin-products'

type SheetMode = 'active' | 'delisted' | 'skip'
type SheetInfo = { name: string; rows: number; suggested: SheetMode }

type Preview = {
  sheets: SheetInfo[]
  modesUsed: Record<string, SheetMode>
  counts: { create: number; update: number; unchanged: number; delist: number; pending: number }
  samples: {
    create: { colour_id: string; style_name: string; color_name: string; section: string }[]
    update: { colour_id: string; style_name: string; color_name: string; changedFields: string[] }[]
    delist: { colour_id: string; existingId: string; style_name: string }[]
    pending: { colour_id: string; stretch: string | null; last: string | null; outStock: string | null }[]
  }
}

function Stat({ label, value, color = 'text-stone-800' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-[14px] p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function ProductImport() {
  const router = useRouter()
  const t = useTranslations('admin.products')
  const [file, setFile] = useState<File | null>(null)
  const [modes, setModes] = useState<Record<string, SheetMode>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function analyze(useModes?: Record<string, SheetMode>) {
    if (!file) return
    setLoading(true); setError(null); setDone(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (useModes) fd.append('sheetModes', JSON.stringify(useModes))
      const res = await fetch('/api/admin/products/import-preview', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Preview failed'); setPreview(null); return }
      setPreview(json)
      setModes(json.modesUsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  function setSheetMode(name: string, mode: SheetMode) {
    setModes(prev => ({ ...prev, [name]: mode }))
  }

  async function confirm() {
    if (!file) return
    setApplying(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('sheetModes', JSON.stringify(modes))
      const res = await applyProductImport(fd)
      if (res.error) { setError(res.error); return }
      const base = t('result', { created: res.created, updated: res.updated, delisted: res.delisted })
      setDone(res.skipped ? `${base} · ${t('result_skipped', { n: res.skipped })}` : base)
      setPreview(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* File picker */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{t('step1')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null) }}
            className="text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
          />
          <button
            onClick={() => analyze()}
            disabled={!file || loading}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40"
          >
            {loading ? t('analyzing') : t('analyze')}
          </button>
        </div>
        {file && <p className="mt-2 text-xs text-stone-400">{file.name}</p>}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {done && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ {done}</div>}

      {preview && (
        <>
          {/* Sheet selection */}
          <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{t('step2_sheets')}</h2>
            <div className="space-y-3">
              {preview.sheets.map(s => (
                <div key={s.name} className="flex flex-wrap items-center gap-3">
                  <span className="w-28 text-sm font-semibold text-stone-700">{s.name}</span>
                  <span className="w-20 text-xs text-stone-400">{t('rows', { count: s.rows })}</span>
                  <div className="flex gap-2">
                    {(['active', 'delisted', 'skip'] as SheetMode[]).map(m => (
                      <label key={m} className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium border ${modes[s.name] === m ? 'border-gold bg-gold/10 text-gold' : 'border-stone-200 text-stone-500'}`}>
                        <input
                          type="radio"
                          name={`mode-${s.name}`}
                          className="sr-only"
                          checked={modes[s.name] === m}
                          onChange={() => setSheetMode(s.name, m)}
                        />
                        {t(`mode_${m}`)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => analyze(modes)}
              disabled={loading}
              className="mt-4 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              {loading ? t('reanalyzing') : t('reanalyze')}
            </button>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat label={t('stat_new')} value={preview.counts.create} color="text-emerald-600" />
            <Stat label={t('stat_updated')} value={preview.counts.update} color="text-blue-600" />
            <Stat label={t('stat_unchanged')} value={preview.counts.unchanged} color="text-stone-400" />
            <Stat label={t('stat_delisted')} value={preview.counts.delist} color="text-red-500" />
            <Stat label={t('stat_pending')} value={preview.counts.pending} color="text-amber-600" />
          </div>

          {/* Samples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SampleTable title={t('sample_new')} rows={preview.samples.create.map(r => [r.colour_id, `${r.style_name} · ${r.color_name}`, r.section])} cols={['colour_id', t('col_style_colour'), t('col_section')]} />
            <SampleTable title={t('sample_updated')} rows={preview.samples.update.map(r => [r.colour_id, `${r.style_name} · ${r.color_name}`, r.changedFields.join(', ')])} cols={['colour_id', t('col_style_colour'), t('col_changed')]} />
            {preview.samples.delist.length > 0 && (
              <SampleTable title={t('sample_delist')} rows={preview.samples.delist.map(r => [r.colour_id, r.style_name])} cols={['colour_id', t('col_style')]} />
            )}
            {preview.samples.pending.length > 0 && (
              <SampleTable title={t('sample_pending')} rows={preview.samples.pending.map(r => [r.colour_id, r.stretch ?? '', r.last ?? '', r.outStock ?? ''])} cols={['colour_id', 'STRETCH', 'LAST', 'OUT/STOCK']} />
            )}
          </div>

          {/* Confirm */}
          <div className="flex items-center gap-3">
            <button
              onClick={confirm}
              disabled={applying || (preview.counts.create + preview.counts.update + preview.counts.delist === 0)}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40"
            >
              {applying ? t('importing') : t('confirm_import')}
            </button>
            <span className="text-xs text-stone-400">{t('untouched_hint')}</span>
          </div>
        </>
      )}
    </div>
  )
}

function SampleTable({ title, cols, rows }: { title: string; cols: string[]; rows: string[][] }) {
  if (rows.length === 0) return null
  return (
    <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-3 border-b border-stone-100">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-stone-50">
            <tr>{cols.map(c => <th key={c} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map((r, i) => (
              <tr key={i}>{r.map((cell, j) => <td key={j} className="px-4 py-1.5 text-stone-600 truncate max-w-[200px]">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
