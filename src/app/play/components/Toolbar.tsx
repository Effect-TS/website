import { Logo } from "@/components/atoms/logo"
import { LogoDark } from "@/components/atoms/logo-dark"
import Link from "next/link"
import { Suspense } from "react"
import { ToolbarItemsDynamic } from "./ToolbarItemsDynamic"
import { NavigationMenu } from "@/components/layout/navigation"

export function Toolbar() {
  return (
    <div className="border-b dark:border-neutral-700 px-4 flex items-center space-y-0 h-16">
      <ToolbarHeader />

      <div aria-hidden className="flex-1" />

      <div>
        <Suspense fallback={null}>
          <ToolbarItemsDynamic />
        </Suspense>
      </div>
    </div>
  )
}

function ToolbarHeader() {
  return (
    <header className="flex items-center">
      <Link href="/" className="z-50 -mr-5">
        <Logo className="hidden dark:block h-6" />
        <LogoDark className="dark:hidden h-6" />
      </Link>

      <h2 className="relative text-lg font-semibold text-nowrap">
        Playground
        <span className="font-mono normal-case absolute ml-2 mt-[-3px] text-slate-400 dark:text-slate-500 text-[10px]">
          Alpha
        </span>
      </h2>

      <nav className="flex gap-6 pl-16">
        <NavigationMenu />
      </nav>
    </header>
  )
}
