import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import './hljs.css'
import {Navigation} from '@/components/layout/navigation'
import {Footer} from '@/components/layout/footer'

const inter = Inter({subsets: ['latin'], display: 'swap', variable: '--font-inter'})
const calSans = localFont({
  src: './cal-sans-semibold.woff2',
  weight: '600',
  display: 'swap',
  variable: '--font-cal-sans'
})

export const metadata: Metadata = {
  title: 'Effect',
  description: 'Lorem ipsum'
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`overflow-x-hidden ${inter.variable} ${calSans.variable}`}>
      <body className="relative overflow-x-hidden antialiased bg-[#09090B] font-light text-zinc-400">
        <Navigation />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
