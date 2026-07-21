'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

/** One selectable client = a company group sharing an erp_code. */
export interface ClientOption {
  key: string
  label: string
  stores: number
  orders: number
  erpCode: string
}

/**
 * Client selector for the back-office Insights view. Scope is one client at a
 * time (see the page header), so this is the entry point to everything below it.
 * Search matches the client name and the ERP code; the list is pre-sorted by
 * order volume so the clients worth analysing are on top.
 */
export default function AdminInsightsClientPicker({
  options,
  selectedKey,
}: {
  options: ClientOption[]
  selectedKey: string | null
}) {
  const t = useTranslations('insights')
  const router = useRouter()
  const [q, setQ] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      o => o.label.toLowerCase().includes(needle) || o.erpCode.toLowerCase().includes(needle),
    )
  }, [options, q])

  const selected = options.find(o => o.key === selectedKey) ?? null

  function pick(key: string) {
    setPending(key)
    router.push(`/admin/insights?c=${encodeURIComponent(key)}`)
  }

  return (
    <div className="bg-white rounded-[14px] p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider shrink-0">
          {t('admin.client')}
        </label>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('admin.search_client')}
          className="flex-1 min-w-[200px] text-sm px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-gold"
        />
        {selected && (
          <span className="text-xs text-stone-500 shrink-0">
            {selected.label}
            {selected.stores > 1 && ` · ${t('admin.n_stores', { n: selected.stores })}`}
          </span>
        )}
      </div>

      <div className="mt-3 max-h-56 overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">—</p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(o => {
              const on = o.key === selectedKey
              const busy = pending === o.key && !on
              return (
                <button
                  key={o.key}
                  onClick={() => pick(o.key)}
                  disabled={busy}
                  className={`w-full flex items-center gap-3 py-1.5 px-2 rounded-lg text-left transition-colors ${
                    on ? 'bg-gold/10' : 'hover:bg-stone-50'
                  } ${busy ? 'opacity-50' : ''}`}
                >
                  <span className={`flex-1 min-w-0 truncate text-sm ${on ? 'font-semibold text-stone-800' : 'text-stone-700'}`}>
                    {o.label}
                    {o.stores > 1 && (
                      <span className="ml-2 text-[10px] text-stone-400">
                        {t('admin.n_stores', { n: o.stores })}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-xs text-stone-400 shrink-0 tabular-nums"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {t('admin.n_orders', { n: o.orders })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
