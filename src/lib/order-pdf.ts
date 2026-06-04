import { createServiceClient } from './supabase/service'

// Order PDFs contain patient health data. The bucket must be PRIVATE; access is
// granted only through short-lived signed URLs generated server-side.
//
// ⚠️ CLIENT ACTION: set the `order-pdfs` bucket to Private in Supabase Storage.
// While it stays public the stored objects remain reachable by URL.
const BUCKET = 'order-pdfs'
const EXPIRES_SECONDS = 60 * 30 // 30 minutes

function pathFor(orderId: string) {
  return `${orderId}.pdf`
}

// Batch-sign the PDFs for a list of order ids (one Storage call).
// Returns a map id -> signed URL; ids without a retrievable PDF are omitted.
export async function signOrderPdfs(orderIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(orderIds)].filter(Boolean)
  if (ids.length === 0) return {}

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUrls(ids.map(pathFor), EXPIRES_SECONDS)
  if (error || !data) return {}

  const map: Record<string, string> = {}
  data.forEach((entry, i) => {
    if (entry.signedUrl && !entry.error) map[ids[i]] = entry.signedUrl
  })
  return map
}

// Sign a single order's PDF, or null if it cannot be retrieved.
export async function signOrderPdf(orderId: string): Promise<string | null> {
  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(pathFor(orderId), EXPIRES_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
