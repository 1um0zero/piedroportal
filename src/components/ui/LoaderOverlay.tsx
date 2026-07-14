'use client'

/**
 * LoaderOverlay — full-screen branded wait for indeterminate, blocking jobs
 * (e.g. generating a PDF preview). Soft translucent backdrop + the Piedro
 * logo-strap loader. Render it conditionally: {busy && <LoaderOverlay label=… />}.
 */

import PiedroLogoLoader from './PiedroLogoLoader'

type Props = {
  /** Caption under the loader (e.g. "Generating preview…"). */
  label?: string
  size?: number
}

export default function LoaderOverlay({ label, size = 88 }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center
                 bg-white/70 backdrop-blur-sm"
    >
      <div
        className="flex flex-col items-center rounded-[14px] bg-white px-12 py-10"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <PiedroLogoLoader size={size} label={label} />
      </div>
    </div>
  )
}
