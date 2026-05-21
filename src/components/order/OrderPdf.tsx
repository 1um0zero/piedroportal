import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { SECTIONS } from './additions-config'

const GOLD = '#C9A96E'
const DARK = '#1C1917'
const MUTED = '#78716C'
const LIGHT = '#F5F5F4'
const BORDER = '#E7E5E4'

const s = StyleSheet.create({
  page:          { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: DARK, backgroundColor: '#fff' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${GOLD}` },
  brand:         { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1 },
  brandSub:      { fontSize: 8, color: MUTED, marginTop: 2 },
  refBlock:      { alignItems: 'flex-end' },
  refNum:        { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK },
  refDate:       { fontSize: 8, color: MUTED, marginTop: 2 },
  badge:         { marginTop: 4, backgroundColor: LIGHT, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  badgeText:     { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
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
}

const UNIT_LABELS: Record<string, string> = {
  PAIR: 'Par (L = R)', LEFT: 'Esquerdo', RIGHT: 'Direito',
  LEFT_RIGHT: 'L ≠ R', DIFF_SIZES: 'Tamanhos diferentes',
}

function formatSide(left: unknown, right: unknown, unit: string): string {
  if (unit === 'LEFT_RIGHT') return `L: ${left ?? '—'}  R: ${right ?? '—'}`
  if (unit === 'RIGHT') return String(right ?? '—')
  return String(left ?? '—')
}

export function OrderPdf({
  reference, status, unit, clinician, patient_name, quantity,
  construction_left, construction_right, width_left, width_right,
  size_left, size_right, additions, comments, created_at,
  companyName, productColourId, productColorName, productClosure, productImageUrl,
}: OrderPdfProps) {
  const isDouble = unit === 'LEFT_RIGHT'
  const date = new Date(created_at).toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Collect filled additions fields
  const addSections = SECTIONS
    .filter(sec => sec.key !== 'others')
    .map(sec => {
      const filled = sec.fields.flatMap(field => {
        if (field.side === 'global') {
          return additions?.[field.key] === true
            ? [{ label: field.label.replace(/\s*\(mm\)/gi, ''), l: 'Yes', r: null, global: true }]
            : []
        }
        const sv = additions?.[field.key] as SidedVal | null
        const hasL = sv?.l != null && sv.l !== '' && sv.l !== false
        const hasR = sv?.r != null && sv.r !== '' && sv.r !== false
        if (!hasL && !hasR) return []
        return [{ label: field.label.replace(/\s*\(mm\)/gi, '').replace(/↳\s*/g, '  · '), l: hasL ? String(sv!.l) : null, r: hasR ? String(sv!.r) : null, global: false }]
      })
      return { label: sec.label, filled }
    })
    .filter(s => s.filled.length > 0)

  const globalFields = SECTIONS
    .find(s => s.key === 'others')
    ?.fields.filter(f => f.side === 'global' && additions?.[f.key] === true) ?? []

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>PIEDRO</Text>
            <Text style={s.brandSub}>Piedro International</Text>
          </View>
          <View style={s.refBlock}>
            <Text style={s.refNum}>{reference ?? '—'}</Text>
            <Text style={s.refDate}>{date}</Text>
            <View style={s.badge}><Text style={s.badgeText}>{status}</Text></View>
          </View>
        </View>

        {/* Customer + Product cards */}
        <View style={s.row2}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Cliente</Text>
            <View style={s.kv}><Text style={s.kLabel}>Empresa</Text><Text style={s.kValue}>{companyName}</Text></View>
            {clinician   && <View style={s.kv}><Text style={s.kLabel}>Clínico</Text><Text style={s.kValue}>{clinician}</Text></View>}
            {patient_name && <View style={s.kv}><Text style={s.kLabel}>Paciente</Text><Text style={s.kValue}>{patient_name}</Text></View>}
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Produto</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              {productImageUrl && (
                <Image src={productImageUrl}
                  style={{ width: 64, height: 64, objectFit: 'contain', backgroundColor: LIGHT, borderRadius: 4 }} />
              )}
              <View style={{ flex: 1 }}>
                <View style={s.kv}><Text style={s.kLabel}>Modelo</Text><Text style={s.kValue}>{productColourId}</Text></View>
                <View style={s.kv}><Text style={s.kLabel}>Cor</Text><Text style={s.kValue}>{productColorName}</Text></View>
                <View style={s.kv}><Text style={s.kLabel}>Fecho</Text><Text style={s.kValue}>{productClosure}</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Specifications */}
        <Text style={s.sectionTitle}>Especificações</Text>
        <View style={s.fieldRow}><Text style={s.fieldLabel}>Unidade</Text><Text style={s.fieldVal}>{UNIT_LABELS[unit] ?? unit}</Text></View>
        <View style={s.fieldRow}><Text style={s.fieldLabel}>Quantidade</Text><Text style={s.fieldVal}>{quantity}</Text></View>
        {(construction_left || construction_right) && (
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Construção</Text><Text style={s.fieldVal}>{formatSide(construction_left, construction_right, unit)}</Text></View>
        )}
        {(width_left || width_right) && (
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Largura</Text><Text style={s.fieldVal}>{formatSide(width_left, width_right, unit)}</Text></View>
        )}
        {(size_left || size_right) && (
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Tamanho</Text><Text style={s.fieldVal}>{formatSide(size_left, size_right, unit)}</Text></View>
        )}

        {/* Additions */}
        {addSections.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Adições</Text>
            {isDouble && (
              <View style={s.lrHeader}>
                <Text style={s.lrHeaderLabel}>Campo</Text>
                <Text style={s.lrHeaderSide}>Left</Text>
                <Text style={s.lrHeaderSide}>Right</Text>
              </View>
            )}
            {addSections.map(sec => (
              <View key={sec.label}>
                <Text style={{ ...s.cardTitle, marginTop: 8, marginBottom: 4 }}>{sec.label}</Text>
                {sec.filled.map((f, i) => (
                  <View key={i} style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{f.label}</Text>
                    {isDouble && !f.global ? (
                      <>
                        <Text style={s.fieldValL}>{f.l ?? '—'}</Text>
                        <Text style={s.fieldValR}>{f.r ?? '—'}</Text>
                      </>
                    ) : (
                      <Text style={s.fieldVal}>{f.l ?? f.r ?? '—'}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Others / global toggles */}
        {globalFields.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Outros</Text>
            {globalFields.map(f => (
              <View key={f.key} style={s.fieldRow}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldVal}>Sim</Text>
              </View>
            ))}
          </>
        )}

        {/* Comments */}
        {comments && (
          <View style={s.comments}>
            <Text style={s.commentsLabel}>Comentários</Text>
            <Text style={s.commentsText}>{comments}</Text>
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
