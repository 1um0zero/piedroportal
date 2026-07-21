'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InsightsDashboard — the interactive Additions Insights view.
//
// Receives each order already reduced to its top-level anatomical addition field
// keys (+ its company/location and clinician), then re-aggregates entirely on the
// client as the user changes period or breakdown axis — no server round-trip. It
// renders: KPI strip, the shoe heat map, a per-zone drill-down, and a conformity
// list of locations/clinicians with deviation-from-average and outlier flags.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import ShoeHeatmap, { HEAT_STOPS, type HeatZone } from './ShoeHeatmap'
import { computeInsights, type InsightOrder } from '@/lib/insights/metrics'
import { SHOE_ZONES, ZONE_LABEL_KEY, type ShoeZone } from '@/lib/insights/addition-zones'

export interface ClientOrder {
  fields: string[]
  company: string
  clinician: string
  createdAt: string
}

type Axis = 'location' | 'clinician'
type Period = '30d' | '90d' | '12m' | 'all'

const PERIODS: Period[] = ['30d', '90d', '12m', 'all']

function cutoffFor(period: Period): number {
  if (period === 'all') return 0
  const d = new Date()
  if (period === '30d') d.setDate(d.getDate() - 30)
  else if (period === '90d') d.setDate(d.getDate() - 90)
  else d.setMonth(d.getMonth() - 12)
  return d.getTime()
}

export default function InsightsDashboard({ orders, multiCompany }: { orders: ClientOrder[]; multiCompany: boolean }) {
  const t = useTranslations('insights')
  const ta = useTranslations('additions')
  const locale = useLocale()

  const [period, setPeriod] = useState<Period>('12m')
  const [axis, setAxis] = useState<Axis>(multiCompany ? 'location' : 'clinician')
  const [selectedZone, setSelectedZone] = useState<ShoeZone | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const zoneLabel = (z: ShoeZone) => t(ZONE_LABEL_KEY[z])
  const fieldLabel = (k: string) =>
    ta.has(`field_labels.${k}`) ? ta(`field_labels.${k}`) : k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const result = useMemo(() => {
    const cutoff = cutoffFor(period)
    const scoped: InsightOrder[] = orders
      .filter(o => cutoff === 0 || new Date(o.createdAt).getTime() >= cutoff)
      .map(o => {
        const group = axis === 'location' ? (o.company || '—') : (o.clinician?.trim() || t('no_clinician'))
        return { fields: o.fields, group, groupLabel: group, createdAt: o.createdAt }
      })
    return computeInsights(scoped)
  }, [orders, period, axis, t])

  // Heat data: overall, or the selected group's zone counts (normalized to the
  // overall max so a small location reads as cooler — the point of comparison).
  const activeGroup = selectedGroup ? result.groups.find(g => g.group === selectedGroup) ?? null : null
  const heatZones: HeatZone[] = SHOE_ZONES.map(zone => {
    const overall = result.zones.find(z => z.zone === zone)!
    const count = activeGroup ? activeGroup.zoneCounts[zone] : overall.count
    const outlier = activeGroup ? activeGroup.hotZones.includes(zone) : false
    return { zone, label: zoneLabel(zone), count, outlier }
  })
  const heatMax = result.zoneMax || 1

  const drillZone = selectedZone ? result.zones.find(z => z.zone === selectedZone) ?? null : null
  const nf = new Intl.NumberFormat(locale)
  const pf = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`
  const perOrderMax = Math.max(...result.groups.map(g => g.perOrder), result.additionsPerOrder, 0.001)

  const outlierCount = result.groups.filter(g => g.outlier).length

  function exportCsv() {
    const D = ';'
    const rows: string[] = []
    rows.push(['# ' + t('title'), '', '', ''].join(D))
    rows.push([t('csv.period'), period, t('csv.orders'), String(result.orderCount)].join(D))
    rows.push('')
    rows.push([t('csv.zone'), t('csv.occurrences'), t('csv.per_order'), ''].join(D))
    for (const z of result.zones) rows.push([zoneLabel(z.zone), String(z.count), z.perOrder.toFixed(2), ''].join(D))
    rows.push('')
    rows.push([axis === 'location' ? t('axis.location') : t('axis.clinician'), t('csv.orders'), t('csv.per_order'), t('csv.deviation'), t('csv.outlier')].join(D))
    for (const g of result.groups) rows.push([g.label, String(g.orders), g.perOrder.toFixed(2), pf(g.deviation), g.outlier ? '1' : ''].join(D))
    rows.push('')
    rows.push([t('csv.zone'), t('csv.addition'), t('csv.occurrences'), ''].join(D))
    for (const z of result.zones) for (const f of z.fields) rows.push([zoneLabel(z.zone), fieldLabel(f.field), String(f.count), ''].join(D))

    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `insights-${axis}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pillBase = 'text-xs font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors'
  const pillOn = 'bg-gold text-white'
  const pillOff = 'bg-stone-100 text-stone-500 hover:text-stone-800'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
          <p className="text-xs text-stone-400 mt-0.5">{t('subtitle', { count: result.orderCount })}</p>
        </div>
        <button onClick={exportCsv}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-dark transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t('export')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`${pillBase} ${period === p ? pillOn : pillOff}`}>
              {t(`period.${p}`)}
            </button>
          ))}
        </div>
        {multiCompany && (
          <div className="flex items-center gap-1.5 sm:ml-4">
            {(['location', 'clinician'] as Axis[]).map(a => (
              <button key={a} onClick={() => { setAxis(a); setSelectedGroup(null) }} className={`${pillBase} ${axis === a ? pillOn : pillOff}`}>
                {t(`axis.${a}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={t('kpi.orders')} value={nf.format(result.orderCount)} />
        <Kpi label={t('kpi.additions')} value={nf.format(result.additionsTotal)} />
        <Kpi label={t('kpi.per_order')} value={result.additionsPerOrder.toFixed(1)} accent />
        <Kpi label={t('kpi.outliers')} value={String(outlierCount)} danger={outlierCount > 0} />
      </div>

      {/* Heat map + drill-down */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('map_title')}</h2>
            {activeGroup && (
              <button onClick={() => setSelectedGroup(null)} className="text-xs text-gold hover:underline">
                {t('showing_group', { group: activeGroup.label })} · {t('clear')}
              </button>
            )}
          </div>
          <ShoeHeatmap zones={heatZones} max={heatMax} selectedZone={selectedZone}
            onSelectZone={z => setSelectedZone(prev => prev === z ? null : z)} className="w-full h-auto" />
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-stone-400">{t('legend.less')}</span>
            <div className="flex-1 h-2.5 rounded-full"
                 style={{ background: `linear-gradient(90deg,${HEAT_STOPS.map(s => s[1]).join(',')})` }} />
            <span className="text-[11px] text-stone-400">{t('legend.more')}</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
            {drillZone ? t('drill_title', { zone: zoneLabel(drillZone.zone) }) : t('drill_hint_title')}
          </h2>
          {drillZone ? (
            drillZone.fields.length ? (
              <div className="space-y-0.5">
                {drillZone.fields.map(f => (
                  <MiniBar key={f.field} label={fieldLabel(f.field)} count={f.count} max={drillZone.fields[0].count} />
                ))}
              </div>
            ) : <p className="text-sm text-stone-400 py-6 text-center">—</p>
          ) : (
            <p className="text-sm text-stone-500">{t('drill_hint')}</p>
          )}
        </div>
      </div>

      {/* Conformity — locations / clinicians vs the average */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            {axis === 'location' ? t('conformity.by_location') : t('conformity.by_clinician')}
          </h2>
          <span className="text-[11px] text-stone-400">{t('conformity.baseline', { n: result.additionsPerOrder.toFixed(1) })}</span>
        </div>
        {result.groups.length ? (
          <div className="space-y-1.5">
            {result.groups.map(g => {
              const on = selectedGroup === g.group
              return (
                <button key={g.group} onClick={() => setSelectedGroup(on ? null : g.group)}
                  className={`w-full flex items-center gap-3 py-1.5 px-2 rounded-lg text-left transition-colors ${on ? 'bg-gold/10' : 'hover:bg-stone-50'}`}>
                  <div className="w-40 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate flex items-center gap-1.5">
                      {g.outlier && <span className="text-red-500" aria-hidden>▲</span>}
                      {g.label}
                    </p>
                    <p className="text-[10px] text-stone-400">{t('conformity.n_orders', { n: g.orders })}</p>
                  </div>
                  <div className="flex-1 bg-stone-100 rounded-full h-2 min-w-[40px]">
                    <div className={`h-2 rounded-full ${g.outlier ? 'bg-red-400' : 'bg-gold'}`} style={{ width: `${Math.min(100, (g.perOrder / perOrderMax) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-stone-700 w-10 text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{g.perOrder.toFixed(1)}</span>
                  <span className={`text-xs w-12 text-right shrink-0 ${g.outlier ? 'text-red-500 font-semibold' : 'text-stone-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{pf(g.deviation)}</span>
                </button>
              )
            })}
          </div>
        ) : <p className="text-sm text-stone-400 py-6 text-center">—</p>}
        <p className="text-[11px] text-stone-400 mt-4">{t('conformity.footnote', { factor: Math.round((result.outlierFactor - 1) * 100), min: result.minGroupOrders })}</p>
      </div>
    </div>
  )
}

function Kpi({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${danger ? 'text-red-500' : accent ? 'text-gold' : 'text-stone-800'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1">
      <p className="w-28 text-sm text-stone-700 truncate">{label}</p>
      <div className="flex-1 bg-stone-100 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
      <span className="text-sm font-bold text-stone-600 w-7 text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  )
}
