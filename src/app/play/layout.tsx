import { ReactNode } from "react"
import { Toolbar } from "./components/Toolbar"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-screen flex flex-col">
        <Toolbar />
        {children}
      </div>
      <Toaster />
    </>
  )
}
