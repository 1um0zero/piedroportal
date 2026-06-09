import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getSettings } from '@/lib/settings'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function AdminSettingsPage() {
  await requirePiedroAdminPage()
  const current = await getSettings(['order_notify_email', 'admin_notify_email', 'email_from', 'notify_locale',
    'dispatch_days_normal', 'dispatch_days_urgent', 'dispatch_show_all'])

  // Show the env-var fallback as a hint when no DB value is set.
  const envFallback = {
    order_notify_email: process.env.ORDER_NOTIFY_EMAIL ?? '',
    admin_notify_email: process.env.ADMIN_NOTIFY_EMAIL ?? '',
    email_from:         process.env.EMAIL_FROM ?? '',
  }

  return <SettingsForm current={current} envFallback={envFallback} />
}
