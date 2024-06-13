import { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-screen flex flex-col">
        {children}
      </div>
      <Toaster />
    </>
  )
}
