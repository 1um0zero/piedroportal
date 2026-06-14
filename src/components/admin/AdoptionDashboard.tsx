'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdoptionData = {
  activated: number
  migratedTotal: number
  visitsToday: number
  activeUsers: number
  anonViews: number
  ordersToday: number
  totalUsers: number
  hourly: number[]
  topPaths: { path: string; n: number }[]
}

export default function AdoptionDashboard({ data }: { data: AdoptionData }) {
  const router = useRouter()
  const [tick, setTick] = useState(0)

  // Live: refresh server data every 45s (stays within the prompt-cache window).
  useEffect(() => {
    const id = setInterval(() => { router.refresh(); setTick(t => t + 1) }, 45000)
    return () => clearInterval(id)
  }, [router])

  const pct = data.migratedTotal ? Math.round((data.activated / data.migratedTotal) * 100) : 0
  const maxHour = Math.max(1, ...data.hourly)
  const nowHour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false }).slice(0, 2))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-semibold text-stone-800">Opening day — live adoption</h1>
        <span className="flex items-center gap-1.5 text-[11px] text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> live
        </span>
      </div>
      <p className="text-sm text-stone-500 mb-6">Amsterdam time · auto-refresh every 45s{tick > 0 ? ` · ${tick} refresh(es)` : ''}</p>

      {/* Activation hero */}
      <div className="rounded-[14px] p-6 mb-5 text-white" style={{ background: 'linear-gradient(135deg,#B8975A 0%,#9A7A42 100%)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/75 mb-2">Migrated users activated</p>
        <div className="flex items-end gap-3">
          <p className="text-4xl font-bold leading-none">{data.activated}</p>
          <p className="text-lg text-white/80 mb-0.5">/ {data.migratedTotal}</p>
          <p className="ml-auto text-2xl font-semibold">{pct}%</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { n: data.visitsToday, label: 'Page views today' },
          { n: data.activeUsers, label: 'Active users today' },
          { n: data.ordersToday, label: 'Orders today' },
          { n: data.anonViews,   label: 'Anonymous views' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-[14px] px-5 py-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-2xl font-semibold text-stone-800">{k.n}</p>
            <p className="text-xs text-stone-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Hourly activity */}
        <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm font-semibold text-stone-700 mb-4">Activity by hour</p>
          <div className="flex items-end gap-[3px] h-32">
            {data.hourly.map((v, h) => (
              <div key={h} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h}:00 — ${v}`}>
                <div
                  className={`w-full rounded-t transition-all duration-500 ${h === nowHour ? 'bg-gold' : 'bg-stone-200'}`}
                  style={{ height: `${(v / maxHour) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-stone-400 mt-1">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm font-semibold text-stone-700 mb-4">Most visited today</p>
          {data.topPaths.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No visits yet today.</p>
          ) : (
            <ul className="space-y-2">
              {data.topPaths.map(p => (
                <li key={p.path} className="flex items-center gap-3 text-sm">
                  <span className="text-stone-600 truncate flex-1 font-mono text-xs">{p.path}</span>
                  <span className="text-stone-800 font-semibold tabular-nums">{p.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
