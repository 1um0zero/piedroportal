import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { SECTIONS } from './additions-config'
import type { Locale } from '@/types'
import { getPdfTranslation, getUnitLabel, getDateLocale } from '@/lib/pdf-translations'

const GOLD = '#C9A96E'
const DARK = '#1C1917'
const MUTED = '#78716C'
const LIGHT = '#F5F5F4'
const BORDER = '#E7E5E4'

const s = StyleSheet.create({
  page:          { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: DARK, backgroundColor: '#fff' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${GOLD}` },
  logo:          { width: 80, height: 40, objectFit: 'contain' },
  brand:         { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1 },
  brandSub:      { fontSize: 8, color: MUTED, marginTop: 2 },
  refBlock:      { alignItems: 'flex-end' },
  refNum:        { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK },
  refDate:       { fontSize: 8, color: MUTED, marginTop: 2 },
  badge:         { marginTop: 4, backgroundColor: LIGHT, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  badgeText:     { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  qtyBox:        { width: 32, height: 32, border: `2px solid ${GOLD}`, borderRadius: 4, backgroundColor: `${GOLD}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  qtyText:       { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GOLD },
  unitBadge:     { flex: 1, backgroundColor: LIGHT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 },
  unitText:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, textTransform: 'uppercase' },
  row2:          { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card:          { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 12 },
  cardTitle:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  kv:            { flexDirection: 'row', marginBottom: 3 },
  kLabel:        { width: 72, fontSize: 8, color: MUTED },
  kValue:        { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  sectionTitle:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 12, paddingBottom: 4, borderBottom: `1px solid ${BORDER}` },
  fieldRow:      { flexDirection: 'row', paddingVertical: 3, borderBottom: `1px solid ${BORDER}` },
  fieldLabel:    { flex: 2, fontSize: 8, color: MUTED },
  fieldVal:      { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' },
  fieldValL:     { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' },
  fieldValR:     { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'center' },
  lrHeader:      { flexDirection: 'row', paddingBottom: 4, borderBottom: `1px solid ${BORDER}`, marginBottom: 2 },
  lrHeaderLabel: { flex: 2, fontSize: 7, color: MUTED },
  lrHeaderSide:  { flex: 1, fontSize: 7, color: MUTED, textAlign: 'center' },
  comments:      { marginTop: 12, backgroundColor: LIGHT, borderRadius: 6, padding: 10 },
  commentsLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  commentsText:  { fontSize: 8, color: DARK, lineHeight: 1.5 },
  footer:        { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:    { fontSize: 7, color: MUTED },
})

type SidedVal = { l: unknown; r: unknown }

export type OrderPdfProps = {
  reference: string | null
  status: string
  unit: string
  clinician: string | null
  patient_name: string | null
  quantity: number
  construction_left: string | null
  construction_right: string | null
  width_left: string | null
  width_right: string | null
  size_left: number | null
  size_right: number | null
  additions: Record<string, unknown> | null
  comments: string | null
  created_at: string
  companyName: string
  productColourId: string
  productColorName: string
  productClosure: string
  productImageUrl?: string
  diff_sizes_pairs?: Array<{ qty: number; size: number }> | null
  locale: Locale
  showWatermark?: boolean
}

export function OrderPdf({
  reference, status, unit, clinician, patient_name, quantity,
  construction_left, construction_right, width_left, width_right,
  size_left, size_right, additions, comments, created_at,
  companyName, productColourId, productColorName, productClosure, productImageUrl,
  diff_sizes_pairs, locale, showWatermark = false,
}: OrderPdfProps) {
  const t = (key: string) => getPdfTranslation(locale, key)
  const isDouble = unit === 'LEFT_RIGHT'
  const date = new Date(created_at).toLocaleDateString(getDateLocale(locale), {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Helper: check if this field has children (is a parent toggle)
  const hasChildren = (fieldKey: string, section: typeof SECTIONS[0]) =>
    section.fields.some(f => f.conditionalOn === fieldKey)

  // Collect filled additions fields
  const addSections = SECTIONS
    .map(sec => {
      const filled = sec.fields.flatMap(field => {
        // Skip if this is a conditional child whose parent is not set
        if (field.conditionalOn) {
          const parent = additions?.[field.conditionalOn]
          const isParentActive = typeof parent === 'boolean'
            ? parent
            : (parent as SidedVal)?.l || (parent as SidedVal)?.r
          if (!isParentActive) return []
        }

        const fieldLabel = t(`additions.field_labels.${field.key}`)

        if (field.side === 'global') {
          return additions?.[field.key] === true
            ? [{ label: fieldLabel.replace(/\s*\(mm\)/gi, ''), l: null, r: null, global: true }]
            : []
        }

        const sv = additions?.[field.key] as SidedVal | null

        // For toggle fields
        if (field.type === 'toggle') {
          const isCheckedL = sv?.l === true
          const isCheckedR = sv?.r === true
          if (!isCheckedL && !isCheckedR) return []

          // If this toggle has children, show it as a parent label
          if (hasChildren(field.key, sec)) {
            return [{
              label: fieldLabel,
              l: null,
              r: null,
              global: false,
              isParent: true
            }]
          }

          // Standalone toggle: show with no value (just the label)
          return [{
            label: fieldLabel,
            l: isCheckedL ? '' : null,
            r: isCheckedR ? '' : null,
            global: false
          }]
        }

        // For non-toggle fields
        const hasL = sv?.l != null && sv.l !== '' && sv.l !== false
        const hasR = sv?.r != null && sv.r !== '' && sv.r !== false
        if (!hasL && !hasR) return []

        return [{
          label: fieldLabel.replace(/\s*\(mm\)/gi, '').replace(/↳\s*/g, '  · '),
          l: hasL ? String(sv!.l) : null,
          r: hasR ? String(sv!.r) : null,
          global: false
        }]
      })
      return { label: t(`additions.sections.${sec.key}`), filled }
    })
    .filter(s => s.filled.length > 0)

  const totalQty = unit === 'DIFF_SIZES' && diff_sizes_pairs
    ? diff_sizes_pairs.reduce((sum, p) => sum + p.qty, 0)
    : quantity

  const unitLabel = getUnitLabel(locale, unit)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Image src="/piedro-logo.png" style={s.logo} />
            <Text style={s.brandSub}>Piedro International</Text>
          </View>
          <View style={s.refBlock}>
            <Text style={s.refNum}>{reference ?? t('additions.empty_value')}</Text>
            <Text style={s.refDate}>{date}</Text>
            <View style={s.badge}><Text style={s.badgeText}>{status}</Text></View>
          </View>
        </View>

        {/* Customer + Product cards */}
        <View style={s.row2}>
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('order.customer')}</Text>
            <View style={s.kv}><Text style={s.kLabel}>{t('order.company')}</Text><Text style={s.kValue}>{companyName}</Text></View>
            {clinician && <View style={s.kv}><Text style={s.kLabel}>{t('order.clinician')}</Text><Text style={s.kValue}>{clinician}</Text></View>}
            {patient_name && <View style={s.kv}><Text style={s.kLabel}>{t('order.patient_short')}</Text><Text style={s.kValue}>{patient_name}</Text></View>}
            {reference && <View style={s.kv}><Text style={s.kLabel}>{t('order.ref_short')}</Text><Text style={s.kValue}>{reference}</Text></View>}

            {/* Product info */}
            <View style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>{productColourId}</Text>
                <View style={{ backgroundColor: LIGHT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: DARK }}>{productClosure}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 8, color: MUTED }}>{productColorName}</Text>
            </View>

            {/* Qty + Unit */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <View style={s.qtyBox}>
                <Text style={s.qtyText}>{totalQty}</Text>
              </View>
              <View style={s.unitBadge}>
                <Text style={s.unitText}>{unitLabel}</Text>
              </View>
            </View>
          </View>

          {/* Product Image */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {productImageUrl && (
              <Image src={productImageUrl}
                style={{ width: 140, height: 140, objectFit: 'contain' }} />
            )}
          </View>
        </View>

        {/* Construction, Width, Size */}
        {(construction_left || construction_right || width_left || width_right || size_left || size_right) && (
          <>
            <Text style={s.sectionTitle}>{t('order.specifications')}</Text>
            {isDouble ? (
              <>
                <View style={{ flexDirection: 'row', paddingBottom: 4, borderBottom: `1px solid ${BORDER}` }}>
                  <Text style={{ flex: 2, fontSize: 7, color: MUTED }}></Text>
                  <Text style={{ flex: 1, fontSize: 7, color: MUTED, textAlign: 'center', textTransform: 'uppercase' }}>{t('additions.left')}</Text>
                  <Text style={{ flex: 1, fontSize: 7, color: MUTED, textAlign: 'center', textTransform: 'uppercase' }}>{t('additions.right')}</Text>
                </View>
                {(construction_left || construction_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.construction_short')}</Text>
                    <Text style={s.fieldValL}>{construction_left ?? t('additions.empty_value')}</Text>
                    <Text style={s.fieldValR}>{construction_right ?? t('additions.empty_value')}</Text>
                  </View>
                )}
                {(width_left || width_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.width')}</Text>
                    <Text style={s.fieldValL}>{width_left ?? t('additions.empty_value')}</Text>
                    <Text style={s.fieldValR}>{width_right ?? t('additions.empty_value')}</Text>
                  </View>
                )}
                {(size_left || size_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.size')}</Text>
                    <Text style={s.fieldValL}>{size_left ?? t('additions.empty_value')}</Text>
                    <Text style={s.fieldValR}>{size_right ?? t('additions.empty_value')}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {(construction_left || construction_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.construction_short')}</Text>
                    <Text style={s.fieldVal}>{unit === 'RIGHT' ? construction_right : construction_left}</Text>
                  </View>
                )}
                {(width_left || width_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.width')}</Text>
                    <Text style={s.fieldVal}>{unit === 'RIGHT' ? width_right : width_left}</Text>
                  </View>
                )}
                {unit !== 'DIFF_SIZES' && (size_left || size_right) && (
                  <View style={s.fieldRow}>
                    <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED }}>{t('order.size')}</Text>
                    <Text style={s.fieldVal}>{unit === 'RIGHT' ? size_right : size_left}</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* Different Sizes grid */}
        {unit === 'DIFF_SIZES' && diff_sizes_pairs && diff_sizes_pairs.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', marginTop: 8, paddingBottom: 2, borderBottom: `1px solid ${BORDER}` }}>
              <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase' }}>{t('order.pairs_short')}</Text>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', textAlign: 'right' }}>{t('order.size')}</Text>
            </View>
            {diff_sizes_pairs.map((pair, idx) => (
              <View key={idx} style={{ flexDirection: 'row', paddingVertical: 3, borderBottom: `1px solid ${LIGHT}` }}>
                <Text style={{ flex: 1, fontSize: 8, color: DARK }}>{pair.qty}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, textAlign: 'right' }}>{pair.size}</Text>
              </View>
            ))}
          </>
        )}

        {/* Additions */}
        {addSections.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('additions.sections.additions')}</Text>
            {isDouble && (
              <View style={s.lrHeader}>
                <Text style={s.lrHeaderLabel}></Text>
                <Text style={s.lrHeaderSide}>{t('additions.left')}</Text>
                <Text style={s.lrHeaderSide}>{t('additions.right')}</Text>
              </View>
            )}
            {addSections.map(sec => (
              <View key={sec.label}>
                <Text style={{ ...s.cardTitle, marginTop: 8, marginBottom: 4 }}>{sec.label}</Text>
                {sec.filled.map((f, i) => {
                  const isParent = (f as any).isParent === true

                  if (isParent) {
                    return (
                      <Text key={i} style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginBottom: 2 }}>
                        {f.label}
                      </Text>
                    )
                  }

                  return (
                    <View key={i} style={s.fieldRow}>
                      <Text style={s.fieldLabel}>{f.label}</Text>
                      {isDouble && !f.global ? (
                        <>
                          <Text style={s.fieldValL}>{f.l ?? (f.l === null && f.r === null ? '' : t('additions.empty_value'))}</Text>
                          <Text style={s.fieldValR}>{f.r ?? (f.l === null && f.r === null ? '' : t('additions.empty_value'))}</Text>
                        </>
                      ) : (
                        <Text style={s.fieldVal}>{f.l ?? f.r ?? ''}</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            ))}
          </>
        )}

        {/* Comments */}
        {comments && (
          <View style={s.comments}>
            <Text style={s.commentsLabel}>{t('additions.fields.comments')}</Text>
            <Text style={s.commentsText}>{comments}</Text>
          </View>
        )}

        {/* Watermark */}
        {showWatermark && (
          <View fixed style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 0.15,
            transform: 'rotate(-45deg)'
          }}>
            <Text style={{
              fontSize: 72,
              fontFamily: 'Helvetica-Bold',
              color: '#DC2626',
              textTransform: 'uppercase',
              letterSpacing: 4,
              textAlign: 'center'
            }}>
              NOT{'\n'}CONFIRMED
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Piedro International — Piedro Portal</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
