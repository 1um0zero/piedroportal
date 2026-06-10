'use client'

import { useState } from 'react'
import Flipbook from './Flipbook'
import type { CatalogueType } from '@/lib/catalogues'

type Book = { type: CatalogueType; pages: string[] }

export default function CatalogueViewer({ books, labels }: {
  books: Book[]
  labels: {
    tabs: Record<CatalogueType, string>
    prev: string
    next: string
    page: string
  }
}) {
  const [active, setActive] = useState<CatalogueType>(books[0]?.type ?? 'kids')
  const book = books.find((b) => b.type === active) ?? books[0]

  return (
    <div>
      {/* Catalogue switcher */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-full border border-stone-200 bg-white p-1 shadow-sm">
          {books.map((b) => (
            <button
              key={b.type}
              onClick={() => setActive(b.type)}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                active === b.type ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {labels.tabs[b.type]}
            </button>
          ))}
        </div>
      </div>

      {/* Re-mount the book when switching so page-flip rebuilds cleanly */}
      {book && (
        <Flipbook
          key={book.type}
          pages={book.pages}
          labels={{ prev: labels.prev, next: labels.next, page: labels.page }}
        />
      )}
    </div>
  )
}
