'use client'

import { useState, useTransition } from 'react'
import { resolveChatFeedback } from '@/app/actions/chat-feedback'

export type FeedbackRow = {
  id: string
  role_seen: string | null
  question: string | null
  answer: string | null
  status: 'open' | 'reviewed' | 'dismissed'
  note: string | null
  created_at: string
  reviewed_at: string | null
}

const STATUS_STYLE: Record<FeedbackRow['status'], string> = {
  open:      'bg-amber-100 text-amber-700',
  reviewed:  'bg-green-100 text-green-700',
  dismissed: 'bg-stone-100 text-stone-500',
}

export default function ChatFeedbackList({ rows }: { rows: FeedbackRow[] }) {
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [pending, startTransition] = useTransition()

  const visible = filter === 'open' ? rows.filter(r => r.status === 'open') : rows

  const set = (id: string, status: FeedbackRow['status']) =>
    startTransition(() => { void resolveChatFeedback(id, status) })

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['open', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === f ? 'bg-gold text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {f === 'open' ? 'Open' : 'All'}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-400 self-center">{visible.length} item(s)</span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-stone-400 py-12 text-center">Nothing to review.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map(r => (
            <li key={r.id} className="rounded-[14px] border border-stone-100 p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
                {r.role_seen && <span className="text-[11px] text-stone-400">{r.role_seen}</span>}
                <span className="ml-auto text-[11px] text-stone-400">
                  {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}
                </span>
              </div>

              <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Question</p>
              <p className="text-sm text-stone-800 bg-stone-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">{r.question || '—'}</p>

              <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Flagged answer</p>
              <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2 mb-4 whitespace-pre-wrap">{r.answer || '—'}</p>

              <div className="flex gap-2">
                {r.status !== 'reviewed' && (
                  <button disabled={pending} onClick={() => set(r.id, 'reviewed')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                    Mark reviewed
                  </button>
                )}
                {r.status !== 'dismissed' && (
                  <button disabled={pending} onClick={() => set(r.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50 transition-colors">
                    Dismiss
                  </button>
                )}
                {r.status !== 'open' && (
                  <button disabled={pending} onClick={() => set(r.id, 'open')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-600 disabled:opacity-50 transition-colors">
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
