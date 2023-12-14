import { Navigation } from "@/components/docs/navigation"
import { ReactNode } from "react"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-container relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 flex items-start min-h-screen pt-24 sm:pt-40">
      <Navigation className="hidden md:flex" />
      {children}
    </div>
  )
}
