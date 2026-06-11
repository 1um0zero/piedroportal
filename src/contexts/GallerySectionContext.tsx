'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Section } from '@/types'

type Ctx = {
  section: Section; setSection: (s: Section) => void
  // Active exclusive-collection token (e.g. 'LIV' for Livingston), '' = none.
  exclusive: string; setExclusive: (v: string) => void
}

const GallerySectionContext = createContext<Ctx>({
  section: 'KIDS', setSection: () => {},
  exclusive: '', setExclusive: () => {},
})

/**
 * Shares the active gallery section (KIDS/MEN/WOMEN) and the active exclusive
 * collection (e.g. Livingston / LIV) between the header (rendered in the Navbar)
 * and the GalleryPage content. Wraps the whole locale layout so both subtrees
 * read/write the same value. Inert outside the gallery.
 */
export function GallerySectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<Section>('KIDS')
  const [exclusive, setExclusive] = useState<string>('')
  return (
    <GallerySectionContext.Provider value={{ section, setSection, exclusive, setExclusive }}>
      {children}
    </GallerySectionContext.Provider>
  )
}

export function useGallerySection() {
  return useContext(GallerySectionContext)
}
