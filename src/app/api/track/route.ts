import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * First-party page-view collector. The client beacons { path, referrer, locale }
 * on every navigation; we attach the auth user (if any) and store one row.
 * Best-effort and non-blocking — always returns 204, never an error to the UI.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text()
    const { path, referrer, locale } = JSON.parse(raw || '{}') as {
      path?: string; referrer?: string; locale?: string
    }
    if (!path || typeof path !== 'string') return new Response(null, { status: 204 })

    // Pathname only — strip any query string defensively.
    const cleanPath = path.split('?')[0].slice(0, 512)
    // Referrer host only (avoid storing full external URLs with params).
    let refHost: string | null = null
    if (referrer) { try { refHost = new URL(referrer).host } catch { refHost = null } }

    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()

    await createServiceClient().from('page_views').insert({
      user_id: user?.id ?? null,
      path: cleanPath,
      referrer: refHost,
      locale: (locale ?? '').slice(0, 8) || null,
    })
  } catch {
    /* swallow — analytics must never affect the user */
  }
  return new Response(null, { status: 204 })
}
