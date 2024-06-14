import { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Navigation } from "@/components/layout/navigation"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
      <Toaster />
    </>
  )
}
