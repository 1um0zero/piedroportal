import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import type { ReactNode } from 'react'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Piedro Portal',
  description: 'Piedro International — Orthopedic Footwear Portal',
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
