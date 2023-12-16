import type { Metadata } from "next"
import { Inter } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import "./hljs.css"
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { ReactNode } from "react"
import Script from "next/script"
import { ThemeWrapper } from "@/components/layout/theme-wrapper"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
})
const calSans = localFont({
  src: "./cal-sans-semibold.woff2",
  weight: "600",
  display: "swap",
  variable: "--font-cal-sans"
})

export const metadata: Metadata = {
  title: "Effect – The best way toooooo build robust apps in Typescript",
  description:
    "Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs."
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`relative ${inter.variable} ${calSans.variable}`}
    >
      <body className="relative overflow-x-hidden relative antialiased font-light bg-white dark:bg-[#09090B] text-zinc-700 dark:text-zinc-400">
        <Script
          id="check-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ((!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) || localStorage.theme === 'dark') {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            `
          }}
        />

        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  )
}
