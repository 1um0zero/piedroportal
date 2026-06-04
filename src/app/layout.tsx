import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import type { ReactNode } from 'react'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Piedro Portal',
  description: 'Piedro International — Orthopedic Footwear Portal',
  // Private portal handling patient data — keep out of search indexes.
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: '/piedro-foot.svg',
    shortcut: '/piedro-foot.svg',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={geistSans.variable}>
      <body className="min-h-screen bg-cream text-stone-900 antialiased">
        {children}
      </body>
    </html>
  )
}
