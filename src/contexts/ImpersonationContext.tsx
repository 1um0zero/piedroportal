'use client'

/**
 * Client-side impersonation state + a confirmation gate for data mutations.
 *
 * When an admin is acting as another user (true impersonation), ANY step that
 * changes real data must be explicitly confirmed first — the admin is operating
 * on someone else's account, so an accidental submit/delete would create or
 * destroy genuine records. `guard()` returns a promise that resolves true only
 * after the admin confirms; when NOT impersonating it resolves true immediately,
 * so call sites can wrap mutations unconditionally.
 */

import {
  createContext, useCallback, useContext, useState, type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'

interface ImpersonationCtx {
  isImpersonating: boolean
  adminName: string | null
  targetName: string | null
  /** Resolves true if the action may proceed. Shows a confirm dialog while impersonating. */
  guard: (actionLabel?: string) => Promise<boolean>
}

const Ctx = createContext<ImpersonationCtx>({
  isImpersonating: false, adminName: null, targetName: null,
  guard: () => Promise.resolve(true),
})

interface Props {
  children: ReactNode
  active: boolean
  adminName: string | null
  targetName: string | null
}

export function ImpersonationProvider({ children, active, adminName, targetName }: Props) {
  const t = useTranslations('impersonation')
  const [pending, setPending] = useState<{ label?: string; resolve: (ok: boolean) => void } | null>(null)

  const guard = useCallback((actionLabel?: string) => {
    if (!active) return Promise.resolve(true)
    return new Promise<boolean>(resolve => setPending({ label: actionLabel, resolve }))
  }, [active])

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <Ctx.Provider value={{ isImpersonating: active, adminName, targetName, guard }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-lg font-semibold text-stone-800">{t('confirm_title')}</h2>
            <p className="mt-2 text-sm text-stone-600">
              {t('confirm_body', { name: targetName ?? '' })}
            </p>
            {pending.label && (
              <p className="mt-2 text-sm font-medium text-stone-800">{pending.label}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => settle(false)}
                className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50">
                {t('confirm_cancel')}
              </button>
              <button
                onClick={() => settle(true)}
                className="px-4 py-2 text-sm rounded-lg bg-gold text-white hover:bg-gold-dark">
                {t('confirm_ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useImpersonation = () => useContext(Ctx)
