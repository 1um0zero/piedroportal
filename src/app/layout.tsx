import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import type { ReactNode } from 'react'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Piedro Portal',
  description: 'Piedro International — Orthopedic Footwear Portal',
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
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        strategy="lazyOnload"
      />
    </html>
  )
}
