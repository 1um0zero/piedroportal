import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { listTemplates } from '@/app/actions/message-templates'
import MessageTemplatesManager from '@/components/admin/MessageTemplatesManager'

/**
 * /admin/message-templates — configurator for reusable message templates.
 * Templates are consumed by the broadcast tool ("load from template") and,
 * programmatically, by any feature via sendTemplateEmail(key, …).
 */
export default async function AdminMessageTemplatesPage() {
  await requirePiedroAdminPage()
  const templates = await listTemplates()
  return <MessageTemplatesManager templates={templates} />
}
