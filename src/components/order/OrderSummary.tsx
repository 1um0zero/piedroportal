'use client'

import { useTranslations } from 'next-intl'
import { SECTIONS } from './additions-config'
import { getFieldLabel, getSectionLabel, translateOptionValue, groupImageBlocks } from '@/lib/additions-helpers'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

/**
 * Shared order summary — the body of the registration "Confirmation" step,
 * reused on the order detail panel so any change lands on both sides.
 * Customer + Product, Specifications, Additions and Comments only — callers
 * own their surrounding chrome (submit actions, admin panel, translation, …).
 */
export type OrderSummaryProps = {
  companyName: string
  clinician?: string | null
  patientName?: string | null
  reference?: string | null
  product: {
    colour_id?: string | null; closure?: string | null
    color_name?: string | null; picture_name?: string | null; style_name?: string | null
  }
  unit: string
  quantity: number
  diffSizesPairs?: { qty: number; size: string }[]
  constrLeft?: string | null; constrRight?: string | null
  widthLeft?: string | null;  widthRight?: string | null
  sizeLeft?: string | null;   sizeRight?: string | null
  additions: Record<string, unknown> | null
  comments?: string | null
  showAdditions?: boolean
  /** Registration only — renders the "edit" links back to the additions step. */
  onEditAdditions?: () => void
  /** Panel only — extra content under the comments (e.g. translation tools). */
  commentsFooter?: React.ReactNode
}

type SidedVal = { l: unknown; r: unknown }

export default function OrderSummary(props: OrderSummaryProps) {
  const {
    companyName, clinician, patientName, reference, product, unit, quantity,
    constrLeft = '', constrRight = '', widthLeft = '', widthRight = '',
    sizeLeft = '', sizeRight = '', comments, onEditAdditions, commentsFooter,
  } = props
  const additions = props.additions ?? {}
  const diffSizesPairs = props.diffSizesPairs ?? []
  const showAdditions = props.showAdditions ?? true
  const isDouble = unit === 'LEFT_RIGHT'

  const t  = useTranslations('order')
  const ta = useTranslations('additions')

  // Detailed additions list for display (parents, children, sided values).
  const hasChildren = (fieldKey: string, section: typeof SECTIONS[0]) =>
    section.fields.some(f => f.conditionalOn === fieldKey)

  const addDetail = SECTIONS.map(sec => {
    const filled = sec.fields.flatMap(field => {
      if (field.conditionalOn) {
        const parent = additions[field.conditionalOn]
        const isParentActive = typeof parent === 'boolean'
          ? parent
          : (parent as SidedVal)?.l || (parent as SidedVal)?.r
        if (!isParentActive) return []
      }

      if (field.side === 'global') {
        return additions[field.key] === true
          ? [{ label: getFieldLabel(field, ta).replace(/\s*\(mm\)/gi, ''), l: null, r: null }]
          : []
      }

      const sv = additions[field.key] as SidedVal | null

      if (field.type === 'toggle') {
        const isCheckedL = sv?.l === true
        const isCheckedR = sv?.r === true
        if (!isCheckedL && !isCheckedR) return []
        if (hasChildren(field.key, sec)) {
          return [{ label: getFieldLabel(field, ta), l: null, r: null, isParent: true }]
        }
        return [{ label: getFieldLabel(field, ta), l: isCheckedL ? '✓' : null, r: isCheckedR ? '✓' : null }]
      }

      const hasL = sv?.l != null && sv.l !== '' && sv.l !== false
      const hasR = sv?.r != null && sv.r !== '' && sv.r !== false
      if (!hasL && !hasR) return []

      const baseLabel = getFieldLabel(field, ta).replace(/↳\s*/g, '  · ').replace(/\s*\(mm\)/gi, '')
      const isImage = field.type === 'image'
      const showVal = (v: unknown) =>
        field.type === 'mm' ? `${String(v)} mm`
        : isImage ? translateOptionValue(field.key, String(v), ta)
        : String(v)
      return [{
        label: baseLabel,
        l: hasL ? showVal(sv!.l) : null,
        r: hasR ? showVal(sv!.r) : null,
        // Image lookup uses the canonical English value (sv), not the translated label.
        imgL: isImage && hasL ? (field.images?.[String(sv!.l)] ?? null) : null,
        imgR: isImage && hasR ? (field.images?.[String(sv!.r)] ?? null) : null,
      }]
    })
    return { key: sec.key, label: getSectionLabel(sec, ta), filled }
  }).filter(s => s.filled.length > 0)

  // Diagram + caption (used inside the rocker block)
  const figure = (src: string, caption: string | null, side?: string) => (
    <figure className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-20 object-contain mx-auto" />
      {side && <figcaption className="text-[9px] text-stone-400 uppercase mt-0.5">{side}</figcaption>}
      {caption && <figcaption className="text-[10px] font-semibold text-stone-700">{caption}</figcaption>}
    </figure>
  )

  // Rocker block: diagram(s) on the left, child measurements grouped on the right
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderImageBlock = (item: any, key: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children = (item.children ?? []) as any[]
    const imgL: string | null = item.imgL ?? null
    const imgR: string | null = item.imgR ?? null
    const twoImgs = isDouble && imgL && imgR && imgL !== imgR
    return (
      <div key={key} className="py-2 border-b border-stone-50">
        <p className="text-xs text-stone-600 mb-2">{item.label}</p>
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex gap-3">
            {twoImgs
              ? <>{figure(imgL!, item.l, t('left'))}{figure(imgR!, item.r, t('right'))}</>
              : figure((imgL ?? imgR)!, item.l ?? item.r)}
          </div>
          {children.length > 0 && (
            <div className="flex-1 min-w-0">
              {isDouble ? (
                <>
                  <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 pb-1 border-b border-stone-100 text-[10px] font-semibold text-stone-400 uppercase">
                    <span></span><span className="text-right">{t('left')}</span><span className="text-right">{t('right')}</span>
                  </div>
                  {children.map((c, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2 py-1 text-xs">
                      <span className="text-stone-500">{c.label.replace(/·/g, '').trim()}</span>
                      <span className="text-stone-800 font-semibold text-right">{c.l ?? '—'}</span>
                      <span className="text-stone-800 font-semibold text-right">{c.r ?? '—'}</span>
                    </div>
                  ))}
                </>
              ) : (
                children.map((c, i) => (
                  <div key={i} className="grid grid-cols-[2fr_1fr] gap-2 py-1 text-xs">
                    <span className="text-stone-500">{c.label.replace(/·/g, '').trim()}</span>
                    <span className="text-stone-800 font-semibold text-right">{c.l ?? c.r ?? ''}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Customer + Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-[14px] p-5 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('customer')}</h3>
          <p className="font-semibold text-stone-900">{companyName}</p>
          {clinician   && <p className="text-xs text-stone-500">{t('clinician')}: {clinician}</p>}
          {patientName && <p className="text-xs text-stone-500">{t('patient')}: {patientName}</p>}
          {reference   && <p className="text-xs text-stone-500">{t('reference')}: {reference}</p>}

          {/* Product info */}
          <div className="pt-3 border-t border-stone-100 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-stone-900">{product.colour_id}</p>
              {product.closure && (
                <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">{product.closure}</span>
              )}
            </div>
            <p className="text-sm text-stone-500">{product.color_name}</p>
          </div>

          {/* Qty + Unit badge */}
          <div className="flex items-center gap-2 pt-2">
            <div className="w-12 h-12 bg-gold/10 border-2 border-gold rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-gold">{unit === 'DIFF_SIZES' ? diffSizesPairs.filter(p => p.size).reduce((sum, p) => sum + p.qty, 0) : quantity}</span>
            </div>
            <div className="flex-1 bg-stone-100 rounded-lg px-3 py-2">
              <span className="text-sm font-bold text-stone-700 uppercase">
                {unit === 'PAIR' ? t('unit_pair').toUpperCase() :
                 unit === 'LEFT' ? t('unit_left').toUpperCase() :
                 unit === 'RIGHT' ? t('unit_right').toUpperCase() :
                 unit === 'LEFT_RIGHT' ? t('unit_lr').toUpperCase() :
                 unit === 'DIFF_SIZES' ? t('unit_sizes').split(' ')[0].toUpperCase() :
                 ''}
              </span>
            </div>
          </div>
        </div>

        {/* Product Image */}
        <div className="flex items-center justify-center p-6">
          {product.picture_name && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${BUCKET}/${product.picture_name}`}
              alt={product.style_name ?? ''}
              className="w-full max-w-[280px] object-contain"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
            />
          )}
        </div>
      </div>

      {/* Specifications */}
      {(constrLeft || constrRight || widthLeft || widthRight || sizeLeft || sizeRight || (unit === 'DIFF_SIZES' && diffSizesPairs.some(p => p.size))) && (
        <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">{t('specifications')}</h3>
          {isDouble ? (
            <div className="space-y-1">
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 pb-1 border-b border-stone-200 text-[10px] font-semibold text-stone-500 uppercase">
                <div></div>
                <div className="text-center">{t('left')}</div>
                <div className="text-center">{t('right')}</div>
              </div>
              {(constrLeft || constrRight) && (
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('construction')}</span>
                  <span className="text-stone-800 font-semibold text-center">{constrLeft || '—'}</span>
                  <span className="text-stone-800 font-semibold text-center">{constrRight || '—'}</span>
                </div>
              )}
              {(widthLeft || widthRight) && (
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('width')}</span>
                  <span className="text-stone-800 font-semibold text-center">{widthLeft || '—'}</span>
                  <span className="text-stone-800 font-semibold text-center">{widthRight || '—'}</span>
                </div>
              )}
              {(sizeLeft || sizeRight) && (
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('size')}</span>
                  <span className="text-stone-800 font-semibold text-center">{sizeLeft || '—'}</span>
                  <span className="text-stone-800 font-semibold text-center">{sizeRight || '—'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {(constrLeft || constrRight) && (
                <div className="grid grid-cols-[1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('construction')}</span>
                  <span className="text-stone-800 font-semibold text-right">{unit === 'RIGHT' ? constrRight : constrLeft}</span>
                </div>
              )}
              {(widthLeft || widthRight) && (
                <div className="grid grid-cols-[1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('width')}</span>
                  <span className="text-stone-800 font-semibold text-right">{unit === 'RIGHT' ? widthRight : widthLeft}</span>
                </div>
              )}
              {unit !== 'DIFF_SIZES' && (sizeLeft || sizeRight) && (
                <div className="grid grid-cols-[1fr_1fr] gap-2 py-1.5 text-xs border-b border-stone-50">
                  <span className="font-semibold text-stone-600">{t('size')}</span>
                  <span className="text-stone-800 font-semibold text-right">{unit === 'RIGHT' ? sizeRight : sizeLeft}</span>
                </div>
              )}
            </div>
          )}

          {/* Different Sizes grid */}
          {unit === 'DIFF_SIZES' && diffSizesPairs.some(p => p.size) && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
                  <div className="font-semibold text-stone-500 uppercase">{t('pairs_1').replace(' 1', 's')}</div>
                  <div className="font-semibold text-stone-500 text-right uppercase">{t('size')}</div>
                  {diffSizesPairs.filter(p => p.size).map((pair, i) => (
                    <div key={i} className="contents">
                      <div className="text-stone-700">{pair.qty}</div>
                      <div className="text-stone-700 font-semibold text-right">{pair.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additions detail */}
      {showAdditions && addDetail.length > 0 && (
        <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide">{t('tab2')}</h2>
            {onEditAdditions && (
              <button type="button" onClick={onEditAdditions} className="text-xs text-gold hover:underline">editar</button>
            )}
          </div>
          <div className="space-y-4">
            {addDetail.map(sec => (
              <div key={sec.key}>
                <p className="text-[11px] font-bold text-gold uppercase tracking-wide mb-2">{sec.label}</p>
                <div className="space-y-1">
                  <div className={`grid ${isDouble ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr]'} gap-2 pb-1 border-b border-stone-200 text-[10px] font-semibold text-stone-500 uppercase`}>
                    <div></div>
                    {isDouble ? (
                      <><div className="text-right">{t('left')}</div><div className="text-right">{t('right')}</div></>
                    ) : (
                      <div className="text-right">{unit === 'PAIR' ? t('unit_pair').split(' ')[0].toUpperCase() : unit === 'LEFT' ? t('left').toUpperCase() : t('right').toUpperCase()}</div>
                    )}
                  </div>
                  {groupImageBlocks(sec.filled).map((f, i) => {
                    if (f.children) return renderImageBlock(f, i)
                    const isChild = f.label.includes('·')
                    const isParent = (f as { isParent?: boolean }).isParent === true
                    if (isParent) {
                      return (
                        <div key={i} className="pt-2 pb-1 mt-1">
                          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">{f.label}</p>
                        </div>
                      )
                    }
                    return (
                      <div key={i} className={`grid ${isDouble ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr]'} gap-2 py-1.5 text-xs border-b border-stone-50 ${isChild ? 'pl-6' : ''}`}>
                        <span className="text-stone-600">{f.label}</span>
                        {isDouble ? (
                          <>
                            <span className="text-stone-800 font-semibold text-right">{f.l ?? (f.l === null && f.r === null ? '' : '—')}</span>
                            <span className="text-stone-800 font-semibold text-right">{f.r ?? (f.l === null && f.r === null ? '' : '—')}</span>
                          </>
                        ) : (
                          <span className="text-stone-800 font-semibold text-right">{f.l ?? f.r ?? ''}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showAdditions && addDetail.length === 0 && onEditAdditions && (
        <p className="text-xs text-stone-400 italic px-1">
          {t('tab2')}: {t('no_additions')}{' '}
          <button type="button" onClick={onEditAdditions} className="text-gold hover:underline">{t('add_additions')}</button>
        </p>
      )}

      {/* Comments */}
      {(comments || commentsFooter) && (
        <div className="bg-white rounded-[14px] p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('comments')}</h3>
          {comments && <p className="text-sm text-stone-700 whitespace-pre-wrap">{comments}</p>}
          {commentsFooter}
        </div>
      )}
    </div>
  )
}
