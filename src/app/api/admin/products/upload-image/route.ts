import { type NextRequest, NextResponse } from 'next/server'
import { requireBackoffice } from '@/lib/admin/guard'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizeToPng } from '@/lib/products/normalize-image'

export const runtime = 'nodejs'
export const maxDuration = 30

const BUCKET = 'products'

/**
 * Upload one product image. Accepts any common raster format and ALWAYS
 * normalises it (remove a plain white background, trim to the shoe, re-centre on
 * a fixed transparent square at a constant scale) following the
 * `<colour_id>.<NN>.png` rule. Normalisation is unconditional so every image in
 * the gallery renders at the SAME scale — it cannot be turned off. If the index
 * is 01, the product's picture_name is pointed at this file.
 *
 * FormData: file, colourId, index (1..99)
 */
export async function POST(request: NextRequest) {
  const auth = await requireBackoffice()
  if ('error' in auth) return auth.error

  const form = await request.formData()
  const file = form.get('file')
  const colourId = String(form.get('colourId') ?? '').trim()
  const index = parseInt(String(form.get('index') ?? ''), 10)

  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!colourId) return NextResponse.json({ error: 'colourId required' }, { status: 400 })
  if (!Number.isFinite(index) || index < 1 || index > 99)
    return NextResponse.json({ error: 'index must be 1..99' }, { status: 400 })

  // Enforce model scope: the target product must be within the caller's models.
  if (!auth.scope.allModels) {
    const svc = createServiceClient()
    const { data: prod } = await svc
      .from('products').select('style_name').eq('colour_id', colourId).maybeSingle()
    if (!prod || !auth.scope.canModel(prod.style_name as string))
      return NextResponse.json({ error: 'Forbidden: model out of scope' }, { status: 403 })
  }

  const storageName = `${colourId}.${String(index).padStart(2, '0')}.png`

  const source = Buffer.from(await file.arrayBuffer())
  let png: Buffer
  try {
    png = await normalizeToPng(source)
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[upload-image] processing failed', { file: file.name, detail })
    return NextResponse.json(
      { error: `Could not process image "${file.name}": ${detail}` },
      { status: 400 },
    )
  }

  const service = createServiceClient()
  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(storageName, png, { contentType: 'image/png', upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Main image → set as the product's picture_name.
  if (index === 1) {
    const { error: dbErr } = await service
      .from('products').update({ picture_name: storageName }).eq('colour_id', colourId)
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, storageName })
}
