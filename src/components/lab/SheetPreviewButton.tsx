'use client'

import { useEffect, useState } from 'react'
import ApprovalSheetForm from '@/components/lab/ApprovalSheetForm'

type Verdict = 'chosen' | 'option' | 'rejected' | null
type Opt = { optKey: string; title: string; subtitle: string | null; verdict: Verdict; comment: string | null }

/**
 * Shortcut inside a sheet (esp. drafts) to preview it exactly as the reviewer
 * sees it — a modal popup, data already loaded, widgets interactive, nothing saved.
 */
export default function SheetPreviewButton({
  title, intro, reviewerName, labKey, options,
}: {
  title: string; intro: string | null; reviewerName: string | null
  labKey: string; options: Opt[]
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12C4 7 8 4 12 4s8 3 9.5 8c-1.5 5-5.5 8-9.5 8s-8-3-9.5-8z" />
        </svg>
        Pré-visualizar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="bg-stone-100 rounded-[18px] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold tracking-widest text-gold uppercase mb-1">Piedro Portal · Folha de aprovação</p>
                  <h1 className="text-xl font-semibold text-stone-800">{title}</h1>
                  {reviewerName && <p className="text-sm text-stone-600 mt-1">Olá {reviewerName},</p>}
                  {intro && <p className="text-sm text-stone-500 mt-1 leading-relaxed">{intro}</p>}
                </div>
                <button type="button" onClick={() => setOpen(false)}
                  className="shrink-0 w-8 h-8 rounded-full bg-white text-stone-500 hover:text-stone-800 flex items-center justify-center text-lg leading-none"
                  style={{ boxShadow: 'var(--shadow-card)' }} aria-label="Fechar">×</button>
              </div>

              <ApprovalSheetForm
                preview token="" labKey={labKey} options={options}
                closed={false} answered={false} overallComment={null}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
