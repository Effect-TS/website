import { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
