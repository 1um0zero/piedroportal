import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import EmailComposer, { type CampaignRow, type TemplateOption } from '@/components/admin/EmailComposer'

/**
 * /admin/email — broadcast tool: compose an email and send it to one user,
 * all users of a company, or every user attached to a company, optionally
 * scheduled. Sending is throttled server-side (see lib/email-campaigns).
 */
export default async function AdminEmailPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  const [{ data: users }, { data: companies }, { data: campaigns }, { data: templates }, settings] = await Promise.all([
    service.from('profiles').select('id, full_name, email').not('email', 'is', null).order('full_name'),
    service.from('companies').select('id, name').order('name'),
    service.from('email_campaigns')
      .select('id, subject, audience, scheduled_at, status, total_recipients, sent_count, failed_count, created_at, body_html, body')
      .order('created_at', { ascending: false }).limit(50),
    service.from('message_templates')
      .select('id, name, subject, body_html, translations').eq('active', true).order('name'),
    getSettings(['broadcast_signature_html']),
  ])

  return (
    <EmailComposer
      users={(users ?? []).map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email }))}
      companies={companies ?? []}
      campaigns={(campaigns ?? []) as CampaignRow[]}
      templates={(templates ?? []) as TemplateOption[]}
      signatureHtml={settings.broadcast_signature_html ?? ''}
    />
  )
}
