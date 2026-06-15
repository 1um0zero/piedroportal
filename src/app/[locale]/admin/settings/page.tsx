import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getSettings } from '@/lib/settings'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function AdminSettingsPage() {
  await requirePiedroAdminPage()
  const current = await getSettings(['order_notify_email', 'admin_notify_email', 'chat_notify_email',
    'broadcast_reply_to', 'email_from', 'notify_locale',
    'dispatch_days_normal', 'dispatch_days_urgent', 'dispatch_show_all'])

  return <SettingsForm current={current} />
}
