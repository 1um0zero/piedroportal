'use client'

import { useEffect, useState } from 'react'

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/3d/`
const SCRIPT_URL = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js'

// Load <model-viewer> as a proper ES module once, shared across all instances
let scriptLoaded = false
function loadModelViewer(): Promise<void> {
  if (scriptLoaded || document.querySelector('script[data-model-viewer]')) {
    scriptLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.type = 'module'
    s.src = SCRIPT_URL
    s.setAttribute('data-model-viewer', '1')
    s.onload = () => { scriptLoaded = true; resolve() }
    s.onerror = () => resolve() // fail silently
    document.head.appendChild(s)
  })
}

export function GlbViewer({ file, inline = false }: { file: string; inline?: boolean }) {
  const [ready, setReady] = useState(scriptLoaded)

  useEffect(() => {
    if (scriptLoaded) { setReady(true); return }
    loadModelViewer().then(() => setReady(true))
  }, [])

  if (inline) {
    return (
      <div className="rounded-lg overflow-hidden border border-stone-200 bg-stone-50 relative shrink-0"
        style={{ width: 80, height: 80 }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-stone-300 border-t-gold rounded-full animate-spin" />
          </div>
        )}
        {ready && (
          <model-viewer
            src={`${BASE}${file}`}
            camera-controls
            auto-rotate
            auto-rotate-delay="800"
            shadow-intensity="0.5"
            tone-mapping="neutral"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 relative"
      style={{ height: 200 }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-300 border-t-gold rounded-full animate-spin" />
        </div>
      )}
      {ready && (
        <model-viewer
          src={`${BASE}${file}`}
          camera-controls
          auto-rotate
          auto-rotate-delay="800"
          shadow-intensity="0.5"
          tone-mapping="neutral"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
