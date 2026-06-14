import { requireSuperAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import ChatFeedbackList, { type FeedbackRow } from '@/components/admin/ChatFeedbackList'

/**
 * /admin/chat-feedback — super-admin review queue for assistant answers a user
 * flagged as "should be improved". Curated by hand: prompt fixes are applied to
 * the assistant system prompt, never auto-generated. See migration 028.
 */
export default async function ChatFeedbackPage() {
  await requireSuperAdminPage()
  const service = createServiceClient()

  const { data } = await service
    .from('chat_feedback')
    .select('id, role_seen, question, answer, status, note, created_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">Assistant feedback</h1>
      <p className="text-sm text-stone-500 mb-6">
        Answers users flagged for improvement. Review, then fix the assistant prompt where needed.
      </p>
      <ChatFeedbackList rows={(data ?? []) as FeedbackRow[]} />
    </div>
  )
}
