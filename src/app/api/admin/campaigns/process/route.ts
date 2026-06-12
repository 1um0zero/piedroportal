import { type NextRequest, NextResponse } from 'next/server'
import { processDueCampaigns } from '@/lib/email-campaigns'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Cron-driven campaign processor (vercel.json: every 5 minutes). Each tick
 * drains a paced slice of any due campaign, so bulk sends drip out at a
 * spam-safe rate. Fail-closed: requires CRON_SECRET to be configured AND
 * matched (Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processDueCampaigns(45_000)
  return NextResponse.json(result)
}
