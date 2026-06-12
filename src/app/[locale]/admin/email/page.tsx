import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import EmailComposer, { type CampaignRow } from '@/components/admin/EmailComposer'

/**
 * /admin/email — broadcast tool: compose an email and send it to one user,
 * all users of a company, or every user attached to a company, optionally
 * scheduled. Sending is throttled server-side (see lib/email-campaigns).
 */
export default async function AdminEmailPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  const [{ data: users }, { data: companies }, { data: campaigns }] = await Promise.all([
    service.from('profiles').select('id, full_name, email').not('email', 'is', null).order('full_name'),
    service.from('companies').select('id, name').order('name'),
    service.from('email_campaigns')
      .select('id, subject, audience, scheduled_at, status, total_recipients, sent_count, failed_count, created_at')
      .order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <EmailComposer
      users={(users ?? []).map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email }))}
      companies={companies ?? []}
      campaigns={(campaigns ?? []) as CampaignRow[]}
    />
  )
}
