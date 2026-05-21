'use client'

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/3d/`

export function GlbViewer({ file }: { file: string }) {
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-stone-200 bg-stone-50"
      style={{ height: 200 }}>
      <model-viewer
        src={`${BASE}${file}`}
        camera-controls
        auto-rotate
        auto-rotate-delay="1000"
        shadow-intensity="0.5"
        tone-mapping="neutral"
        style={{ width: '100%', height: '100%' } as React.CSSProperties}
      />
    </div>
  )
}
