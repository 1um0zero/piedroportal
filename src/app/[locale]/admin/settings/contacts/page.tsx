import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getContactInfo } from '@/lib/contact-info.server'
import ContactsForm from '@/components/admin/ContactsForm'

export default async function AdminContactsPage() {
  await requirePiedroAdminPage()
  const current = await getContactInfo()
  return <ContactsForm current={current} />
}
