import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const PORTAL_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://piedroportal.vercel.app'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? 'tavares@umzero.pt'

async function notifyAdmin(email: string, fullName: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return   // silently skip if not configured

  const resend = new Resend(apiKey)
  const date = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })

  await resend.emails.send({
    from: 'Piedro Portal <onboarding@resend.dev>',
    to:   ADMIN_EMAIL,
    subject: `Novo utilizador — ${email}`,
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
            <td style="padding:8px 0;font-weight:500">${fullName || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#78716C">Email</td>
            <td style="padding:8px 0;font-weight:500">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#78716C">Data</td>
            <td style="padding:8px 0">${date}</td>
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
  }).catch(err => console.error('Notification email failed:', err))
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/gallery'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll:  () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const user = data.user
      const createdAt = new Date(user.created_at).getTime()
      const isNewUser = Date.now() - createdAt < 10 * 60 * 1000  // confirmed within 10 min of creation

      if (isNewUser) {
        const fullName = (user.user_metadata?.full_name as string) ?? ''
        notifyAdmin(user.email ?? '', fullName)  // fire-and-forget
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
