import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/escape-html'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}
const ADMIN_EMAIL  = process.env.ADMIN_NOTIFY_EMAIL ?? 'tavares@umzero.pt'
const EMAIL_FROM   = process.env.EMAIL_FROM ?? 'Piedro Portal <onboarding@resend.dev>'
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://piedroportal.vercel.app'

export async function POST(request: NextRequest) {
  // Verify Supabase webhook secret
  const auth = request.headers.get('authorization')
  if (WEBHOOK_SECRET && auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { type?: string; record?: Record<string, unknown> }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only act on INSERT events
  if (payload.type !== 'INSERT') return NextResponse.json({ ok: true })

  const { email, full_name, created_at } = payload.record ?? {}
  if (!email) return NextResponse.json({ ok: true })

  const date = created_at
    ? new Date(created_at as string).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
    : new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })

  const resend = getResend()
  if (!resend) return NextResponse.json({ ok: true, skipped: 'email not configured' })

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `Novo utilizador — ${escapeHtml(email as string)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">
          Piedro Portal
        </p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 20px">
          Novo utilizador registado
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
          <tr>
            <td style="padding:8px 0;color:#78716C;width:100px">Nome</td>
            <td style="padding:8px 0;font-weight:500">${escapeHtml(full_name as string) || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#78716C">Email</td>
            <td style="padding:8px 0;font-weight:500">${escapeHtml(email as string)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#78716C">Data</td>
            <td style="padding:8px 0">${escapeHtml(date)}</td>
          </tr>
        </table>
        <div style="margin:32px 0">
          <a href="${PORTAL_URL}/admin/users"
             style="background:#B8975A;color:#fff;text-decoration:none;padding:12px 24px;
                    border-radius:8px;font-size:13px;font-weight:600;display:inline-block">
            Associar ao account →
          </a>
        </div>
        <p style="font-size:12px;color:#A8A29E">
          Este utilizador ainda não tem empresa associada.
          Clica no botão acima para atribuir o account correcto.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
