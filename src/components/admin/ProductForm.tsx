'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createProduct, updateProduct, type ProductInput } from '@/app/actions/admin-products'
import { setModelExclusiveLabel } from '@/app/actions/admin-companies'
import { ProductImageSlots } from '@/components/admin/ProductImages'
import type { Construction, Product, Section } from '@/types'

export type ExclusiveCompany = { id: string; name: string; exclusive_label: string }

const SECTIONS: Section[] = ['KIDS', 'MEN', 'WOMEN']
const CLOSURES = ['LACE', 'VELCRO', 'BUCKLE', 'TWIST LOCK SYSTEM', 'LACE, ZIPPER']
const TYPES = ['Boot', 'Shoes', 'Sandal']

type FormState = ProductInput

function emptyProduct(): FormState {
  return {
    style_name: '', colour_id: '', picture_name: '', section: 'MEN',
    closure: 'LACE' as Product['closure'], type: 'Shoes' as Product['type'],
    color_basic: '', color_name: '', color_name_i18n: null,
    size_first: 0, size_last: 0, diabetics: false, info: null, sibling: null,
    active: true, constructions: [], new_until: null, adds_exclude: '', exclusive: '',
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone-500">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none'

export default function ProductForm({ product, companies }: { product?: Product; companies?: ExclusiveCompany[] }) {
  const router = useRouter()
  const t = useTranslations('admin.products')
  const tc = useTranslations('admin.common')
  const isEdit = !!product
  const [f, setF] = useState<FormState>(() => product ? { ...product } as FormState : emptyProduct())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  // Exclusivity is managed by piedro_admins only — `companies` is passed only then.
  const canManageExclusive = !!companies
  const exclusiveValue = (f.exclusive ?? '').trim().toUpperCase()
  // Surface a sigla that isn't mapped to any company yet so the admin can see it.
  const hasMatch = (companies ?? []).some(c => c.exclusive_label.toUpperCase() === exclusiveValue)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF(prev => ({ ...prev, [key]: value }))
  }

  // ── Constructions editor ──
  function addConstruction() {
    set('constructions', [...f.constructions, { construction: '', widths: [] }])
  }
  function updateConstruction(i: number, c: Construction) {
    set('constructions', f.constructions.map((x, idx) => idx === i ? c : x))
  }
  function removeConstruction(i: number) {
    set('constructions', f.constructions.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true); setError(null); setOk(false)
    try {
      if (isEdit) {
        // Exclusivity is model-wide (all colours of a style) and piedro_admin-only,
        // so it is applied via setModelExclusiveLabel rather than the per-row update.
        const payload: Partial<ProductInput> = { ...f }
        delete payload.exclusive
        const res = await updateProduct(product!.id, payload)
        if (res.error) { setError(res.error); return }

        if (canManageExclusive && exclusiveValue !== (product!.exclusive ?? '').trim().toUpperCase()) {
          const exRes = await setModelExclusiveLabel(f.style_name, exclusiveValue || null)
          if (exRes.error) { setError(exRes.error); return }
        }
        setOk(true)
        router.refresh()
      } else {
        const res = await createProduct(f)
        if (res.error) { setError(res.error); return }
        // Go to edit page so images can be added against the saved colour_id
        router.push(`/admin/products/${res.id}/edit`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {ok && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ {tc('saved')}</div>}

      {/* Core fields */}
      <div className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t('f_colour_id')}>
            <input className={inputCls} value={f.colour_id} disabled={isEdit}
              onChange={e => set('colour_id', e.target.value.trim())} />
          </Field>
          <Field label={t('f_style_name')}>
            <input className={inputCls} value={f.style_name} onChange={e => set('style_name', e.target.value)} />
          </Field>
          <Field label={t('f_section')}>
            <select className={inputCls} value={f.section} onChange={e => set('section', e.target.value as Section)}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label={t('f_closure')}>
            <input className={inputCls} list="closures" value={f.closure}
              onChange={e => set('closure', e.target.value as Product['closure'])} />
            <datalist id="closures">{CLOSURES.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label={t('f_type')}>
            <input className={inputCls} list="types" value={f.type}
              onChange={e => set('type', e.target.value as Product['type'])} />
            <datalist id="types">{TYPES.map(ty => <option key={ty} value={ty} />)}</datalist>
          </Field>
          <Field label={t('f_sibling')}>
            <input className={inputCls} value={f.sibling ?? ''} onChange={e => set('sibling', e.target.value || null)} />
          </Field>
          <Field label={t('f_color_basic')}>
            <input className={inputCls} value={f.color_basic} onChange={e => set('color_basic', e.target.value)} />
          </Field>
          <Field label={t('f_color_name')}>
            <input className={inputCls} value={f.color_name} onChange={e => set('color_name', e.target.value)} />
          </Field>
          <Field label={t('f_info')}>
            <input className={inputCls} value={f.info ?? ''} onChange={e => set('info', e.target.value || null)} />
          </Field>
          <Field label={t('f_size_first')}>
            <input type="number" step="0.5" className={inputCls} value={f.size_first}
              onChange={e => set('size_first', parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label={t('f_size_last')}>
            <input type="number" step="0.5" className={inputCls} value={f.size_last}
              onChange={e => set('size_last', parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label={t('f_adds_exclude')}>
            <input className={inputCls} value={f.adds_exclude ?? ''} onChange={e => set('adds_exclude', e.target.value)} />
          </Field>
          {canManageExclusive && (
            <Field label={t('f_exclusive')}>
              <select className={inputCls} value={exclusiveValue}
                onChange={e => set('exclusive', e.target.value)}>
                <option value="">{t('exclusive_none')}</option>
                {(companies ?? []).map(c => (
                  <option key={c.id} value={c.exclusive_label.toUpperCase()}>
                    {c.name} ({c.exclusive_label})
                  </option>
                ))}
                {exclusiveValue && !hasMatch && (
                  <option value={exclusiveValue}>{t('exclusive_unassigned', { label: exclusiveValue })}</option>
                )}
              </select>
              <span className="mt-1 block text-[11px] text-stone-400">{t('exclusive_hint')}</span>
            </Field>
          )}
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={f.diabetics} onChange={e => set('diabetics', e.target.checked)} /> {t('diabetics')}
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> {tc('active')}
          </label>
        </div>
      </div>

      {/* Constructions editor */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('constructions')}</h2>
          <button onClick={addConstruction} className="text-sm font-medium text-gold hover:text-gold-dark">{t('add_construction')}</button>
        </div>
        <div className="space-y-3">
          {f.constructions.length === 0 && <p className="text-sm text-stone-400">{t('no_constructions')}</p>}
          {f.constructions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Field label={t('construction')}>
                <input className={inputCls + ' w-48'} value={c.construction}
                  onChange={e => updateConstruction(i, { ...c, construction: e.target.value })} />
              </Field>
              <Field label={t('widths')}>
                <input className={inputCls + ' w-64'} value={c.widths.join(', ')}
                  onChange={e => updateConstruction(i, { ...c, widths: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
              </Field>
              <button onClick={() => removeConstruction(i)} className="pb-2 text-sm text-red-400 hover:text-red-600">{tc('remove')}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Images (edit mode only — needs a saved colour_id) */}
      {isEdit && (
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{t('images')}</h2>
          <ProductImageSlots colourId={product!.colour_id} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
          {saving ? tc('saving') : isEdit ? t('save_changes') : t('create_product')}
        </button>
        {!isEdit && <span className="text-xs text-stone-400">{t('save_first_hint')}</span>}
      </div>
    </div>
  )
}
