import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import type { ReactNode } from 'react'

// latin-ext is required for NL/FR/DE diacritics (ë, ï, ç, ü, …).
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Piedro Portal',
  description: 'Piedro International — Orthopedic Footwear Portal',
  // Private portal handling patient data — keep out of search indexes.
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: [
      { url: '/piedro-foot.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/piedro-foot.svg',
  },
  // Rich preview when the portal link is shared (WhatsApp, e-mail, Slack…).
  openGraph: {
    type: 'website',
    siteName: 'Piedro Portal',
    title: 'Piedro Portal',
    description: 'Piedro International — Orthopedic Footwear Portal',
    url: SITE_URL,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Piedro — always one step ahead' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Piedro Portal',
    description: 'Piedro International — Orthopedic Footwear Portal',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={inter.variable}>
      <body className="min-h-screen bg-cream text-stone-900 antialiased">
        {children}
      </body>
    </html>
  )
}
