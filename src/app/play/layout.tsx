import { ReactNode } from "react"
import { Toolbar } from "./components/Toolbar"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      {children}
    </div>
  )
}
