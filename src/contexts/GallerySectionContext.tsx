'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Section } from '@/types'

type Ctx = { section: Section; setSection: (s: Section) => void }

const GallerySectionContext = createContext<Ctx>({ section: 'KIDS', setSection: () => {} })

/**
 * Shares the active gallery section (KIDS/MEN/WOMEN) between the header switch
 * (rendered in the Navbar) and the GalleryPage content. Wraps the whole locale
 * layout so both subtrees read/write the same value. Inert outside the gallery.
 */
export function GallerySectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<Section>('KIDS')
  return (
    <GallerySectionContext.Provider value={{ section, setSection }}>
      {children}
    </GallerySectionContext.Provider>
  )
}

export function useGallerySection() {
  return useContext(GallerySectionContext)
}
