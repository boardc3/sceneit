import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SCENEIT - AI Photo Enhancement',
  description: 'Transform any photo with AI-powered enhancement. Modernize interiors, upgrade exteriors, or reimagine any scene.',
  keywords: ['photo enhancement', 'AI', 'image editing', 'interior design', 'real estate'],
  authors: [{ name: 'SCENEIT' }],
  openGraph: {
    title: 'SCENEIT - AI Photo Enhancement',
    description: 'Transform any photo with AI-powered enhancement',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SCENEIT - AI Photo Enhancement',
    description: 'Transform any photo with AI-powered enhancement',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SCENEIT',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0a1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
