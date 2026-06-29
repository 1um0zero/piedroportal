import 'server-only'
import { Resend } from 'resend'
import { getSettings } from '@/lib/settings'
import { createServiceClient } from '@/lib/supabase/service'
import { escapeHtml } from '@/lib/escape-html'

const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'

const VERDICT_LABEL: Record<string, string> = {
  chosen: 'Escolhido', option: 'Opção', rejected: 'Recusado',
}
const APPROVAL_LABEL: Record<string, { label: string; color: string }> = {
  approved:   { label: 'Aprovado',     color: '#16a34a' },
  rejected:   { label: 'Rejeitado',    color: '#dc2626' },
  discussion: { label: 'Em discussão', color: '#B8975A' },
}

/** Email the admin that a reviewer answered a LAB approval sheet (fire-and-forget). */
export async function notifyResponse(sheetId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const cfg = await getSettings(['admin_notify_email', 'email_from'])
  const ADMIN_EMAILS = (cfg.admin_notify_email ?? '').split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
  const EMAIL_FROM = cfg.email_from
  if (!apiKey || !ADMIN_EMAILS.length || !EMAIL_FROM) return

  const service = createServiceClient()
  const { data: sheet } = await service.from('lab_sheets')
    .select('id, title, kind, verdict, reviewer_name, overall_comment').eq('id', sheetId).single()
  if (!sheet) return

  // Approval kind: one sheet-level verdict (no per-option rows).
  let body: string
  if (sheet.kind === 'approval') {
    const v = sheet.verdict ? APPROVAL_LABEL[sheet.verdict] : null
    body = v
      ? `<p style="font-size:15px;margin:0 0 8px"><strong style="color:${v.color}">${escapeHtml(v.label)}</strong></p>`
      : '<p style="font-size:14px;color:#78716C;margin:0 0 8px">Sem veredicto.</p>'
  } else {
    const { data: options } = await service.from('lab_options')
      .select('title, verdict, comment, position').eq('sheet_id', sheetId).order('position')
    const rows = (options ?? []).map(o => {
      const v = o.verdict ? VERDICT_LABEL[o.verdict] ?? o.verdict : '—'
      const color = o.verdict === 'chosen' ? '#B8975A' : o.verdict === 'rejected' ? '#dc2626' : '#78716C'
      return `<tr>
        <td style="padding:8px 0;font-weight:500;color:#44403C">${escapeHtml(o.title)}</td>
        <td style="padding:8px 0;font-weight:600;color:${color}">${escapeHtml(v)}</td>
        <td style="padding:8px 0;color:#78716C">${escapeHtml(o.comment ?? '')}</td>
      </tr>`
    }).join('')
    body = `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_EMAILS,
    subject: `Folha de aprovação respondida — ${sheet.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal · Lab</p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 8px">${escapeHtml(sheet.title)}</h2>
        <p style="font-size:14px;color:#78716C;margin:0 0 20px">Respondida por ${escapeHtml(sheet.reviewer_name ?? 'revisor')}.</p>
        ${body}
        ${sheet.overall_comment ? `<p style="font-size:14px;color:#44403C;margin:20px 0 0;padding:12px;background:#f5f5f4;border-radius:8px"><strong>Comentário geral:</strong><br>${escapeHtml(sheet.overall_comment)}</p>` : ''}
        <div style="margin:32px 0 0">
          <a href="${PORTAL_URL}/admin/lab/${sheet.id}"
             style="background:#B8975A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block">
            Ver folha
          </a>
        </div>
      </div>`,
  })
}
