'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (file: File) => void
  onClose:   () => void
}

export function CameraModal({ onCapture, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasBack, setHasBack]   = useState(false)

  async function startCamera(mode: 'user' | 'environment' = facingMode) {
    // Stop existing stream
    streamRef.current?.getTracks().forEach(t => t.stop())
    setPreview(null); setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Check if device has multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      setHasBack(videoDevices.length > 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera not available')
    }
  }

  useEffect(() => {
    startCamera()
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flipCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }

  function capture() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setPreview(canvas.toDataURL('image/jpeg', 0.92))
  }

  function retake() {
    setPreview(null)
    startCamera()
  }

  function confirm() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      onCapture(file)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-white text-sm font-medium">Take Photo</p>
        {hasBack && !preview ? (
          <button onClick={flipCamera} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        ) : <span className="w-6" />}
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 px-8 text-center">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/>
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 px-8 py-6 flex items-center justify-center gap-8">
        {preview ? (
          <>
            <button onClick={retake}
              className="px-5 py-2.5 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors">
              Retake
            </button>
            <button onClick={confirm}
              className="px-7 py-2.5 rounded-full bg-gold text-white text-sm font-semibold hover:bg-gold-dark transition-colors">
              Use Photo
            </button>
          </>
        ) : (
          <button onClick={capture} disabled={!!error}
            className="w-16 h-16 rounded-full bg-white border-4 border-white/40 hover:scale-105
                       transition-transform disabled:opacity-40 shadow-lg" />
        )}
      </div>
    </div>
  )
}
