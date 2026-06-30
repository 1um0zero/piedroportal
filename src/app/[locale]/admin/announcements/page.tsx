import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { listAnnouncements } from '@/lib/announcements'
import AnnouncementComposer from '@/components/admin/AnnouncementComposer'

/**
 * /admin/announcements — compose in-portal messages (pop-up / chip / banner),
 * pick where they appear and the date window in which they are live.
 */
export default async function AdminAnnouncementsPage() {
  await requirePiedroAdminPage()
  const announcements = await listAnnouncements()
  return <AnnouncementComposer announcements={announcements} />
}
