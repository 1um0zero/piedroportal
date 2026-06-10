import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { Locale } from '@/types'
import { getPdfTranslation, getDateLocale } from '@/lib/pdf-translations'

const GOLD = '#C9A96E'
const DARK = '#1C1917'
const MUTED = '#78716C'
const LIGHT = '#F5F5F4'
const BORDER = '#E7E5E4'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://piedroportal.vercel.app'
const LOGO_URL = `${SITE_URL}/piedro-logo.png`

// A few item-table headers not in the shared pdf-translations dictionary.
const L: Record<Locale, { stock: string; model: string; size: string; pairs: string; total: string }> = {
  en: { stock: 'Stock order', model: 'Model',  size: 'Size',     pairs: 'Pairs',  total: 'Total pairs' },
  nl: { stock: 'Voorraadbestelling', model: 'Model', size: 'Maat', pairs: 'Paar', total: 'Totaal paar' },
  fr: { stock: 'Commande de stock', model: 'Modèle', size: 'Pointure', pairs: 'Paires', total: 'Total paires' },
  de: { stock: 'Lagerbestellung', model: 'Modell', size: 'Größe', pairs: 'Paar', total: 'Paare gesamt' },
}

const s = StyleSheet.create({
  page:       { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: DARK, backgroundColor: '#fff' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${GOLD}` },
  logo:       { width: 80, height: 40, objectFit: 'contain' },
  brandSub:   { fontSize: 8, color: MUTED, marginTop: 2 },
  refBlock:   { alignItems: 'flex-end' },
  refNum:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK },
  refDate:    { fontSize: 8, color: MUTED, marginTop: 2 },
  badge:      { marginTop: 4, backgroundColor: LIGHT, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  badgeText:  { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:       { backgroundColor: LIGHT, borderRadius: 6, padding: 12, marginBottom: 14 },
  cardTitle:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  kv:         { flexDirection: 'row', marginBottom: 3 },
  kLabel:     { width: 100, fontSize: 8, color: MUTED },
  kValue:     { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  thead:      { flexDirection: 'row', paddingBottom: 4, borderBottom: `1px solid ${BORDER}` },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase' },
  trow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottom: `1px solid ${LIGHT}` },
  thumb:      { width: 26, height: 26, objectFit: 'contain', marginRight: 8 },
  totalRow:   { flexDirection: 'row', paddingVertical: 6, marginTop: 2, borderTop: `1px solid ${BORDER}` },
  comments:   { marginTop: 14, backgroundColor: LIGHT, borderRadius: 6, padding: 10 },
  commentsLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  commentsText:  { fontSize: 8, color: DARK, lineHeight: 1.5 },
  footer:     { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: MUTED },
})

export type StockOrderPdfProps = {
  reference: string | null
  status: string
  created_at: string
  companyName: string
  clinician: string | null
  patientName: string | null
  comments: string | null
  locale: Locale
  items: Array<{ size: number; qty: number; colourId: string; colorName: string; imageUrl?: string }>
  showWatermark?: boolean
}

export function StockOrderPdf({
  reference, status, created_at, companyName, clinician, patientName, comments, locale, items, showWatermark = false,
}: StockOrderPdfProps) {
  const t = (key: string) => getPdfTranslation(locale, key)
  const lx = L[locale] ?? L.en
  const date = new Date(created_at).toLocaleDateString(getDateLocale(locale), { day: '2-digit', month: '2-digit', year: 'numeric' })
  const totalPairs = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image */}
            <Image src={LOGO_URL} style={s.logo} />
            <Text style={s.brandSub}>Piedro International</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: GOLD }}>{lx.stock}</Text>
          </View>
          <View style={s.refBlock}>
            <Text style={s.refNum}>{reference ?? '—'}</Text>
            <Text style={s.refDate}>{date}</Text>
            <View style={s.badge}><Text style={s.badgeText}>{status}</Text></View>
          </View>
        </View>

        {/* Customer */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('order.customer')}</Text>
          <View style={s.kv}><Text style={s.kLabel}>{t('order.company')}</Text><Text style={s.kValue}>{companyName}</Text></View>
          {clinician   && <View style={s.kv}><Text style={s.kLabel}>{t('order.clinician')}</Text><Text style={s.kValue}>{clinician}</Text></View>}
          {patientName && <View style={s.kv}><Text style={s.kLabel}>{t('order.patient_short')}</Text><Text style={s.kValue}>{patientName}</Text></View>}
          {reference   && <View style={s.kv}><Text style={s.kLabel}>{t('order.ref_short')}</Text><Text style={s.kValue}>{reference}</Text></View>}
        </View>

        {/* Items */}
        <View style={s.thead}>
          <Text style={{ ...s.th, flex: 3 }}>{lx.model}</Text>
          <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>{lx.size}</Text>
          <Text style={{ ...s.th, flex: 1, textAlign: 'right' }}>{lx.pairs}</Text>
        </View>
        {items.map((i, idx) => (
          <View key={idx} style={s.trow}>
            <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center' }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image */}
              {i.imageUrl && <Image src={i.imageUrl} style={s.thumb} />}
              <View>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK }}>{i.colourId}</Text>
                <Text style={{ fontSize: 7, color: MUTED }}>{i.colorName}</Text>
              </View>
            </View>
            <Text style={{ flex: 1, fontSize: 9, textAlign: 'center', color: DARK }}>{i.size}</Text>
            <Text style={{ flex: 1, fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: DARK }}>{i.qty}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={{ flex: 4, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase' }}>{lx.total}</Text>
          <Text style={{ flex: 1, fontSize: 10, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: DARK }}>{totalPairs}</Text>
        </View>

        {/* Comments */}
        {comments && (
          <View style={s.comments}>
            <Text style={s.commentsLabel}>{t('additions.fields.comments')}</Text>
            <Text style={s.commentsText}>{comments}</Text>
          </View>
        )}

        {showWatermark && (
          <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', opacity: 0.15, transform: 'rotate(-45deg)' }}>
            <Text style={{ fontSize: 72, fontFamily: 'Helvetica-Bold', color: '#DC2626', textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center' }}>
              NOT{'\n'}CONFIRMED
            </Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Piedro International — Piedro Portal</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
