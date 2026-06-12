import { type NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin/guard'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'email-assets'
const MAX_DIM = 1000 // e-mail bodies are ~600px wide; no need for more

/**
 * Upload one image pasted/dropped into the e-mail composer. Normalised to PNG
 * (max 1000px, no upscale) and stored in the public `email-assets` bucket
 * (auto-created on first use) so e-mail clients can load it by URL —
 * base64 data-URIs are blocked by Gmail/Outlook.
 *
 * FormData: file
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image too large (max 8 MB)' }, { status: 400 })

  let png: Buffer
  try {
    png = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Could not process image' }, { status: 400 })
  }

  const service = createServiceClient()
  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.png`

  let { error: upErr } = await service.storage
    .from(BUCKET).upload(name, png, { contentType: 'image/png', upsert: false })
  if (upErr && /bucket/i.test(upErr.message)) {
    // First use — create the public bucket, then retry once.
    await service.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    ;({ error: upErr } = await service.storage
      .from(BUCKET).upload(name, png, { contentType: 'image/png', upsert: false }))
  }
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data } = service.storage.from(BUCKET).getPublicUrl(name)
  return NextResponse.json({ ok: true, url: data.publicUrl })
}
