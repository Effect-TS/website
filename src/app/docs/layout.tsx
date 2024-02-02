import { Navigation as DocsNavigation } from "@/components/docs/navigation"
import { Navigation } from "@/components/layout/navigation"
import { ReactNode } from "react"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navigation wide />
      <div className="docs-container relative w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-16 flex items-start justify-between min-h-screen pt-24 sm:pt-40">
        <DocsNavigation className="hidden md:flex" />
        {children}
      </div>
    </>
  )
}
