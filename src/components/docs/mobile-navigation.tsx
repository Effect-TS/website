"use client"

import { FC, useEffect, useState } from "react"
import { Icon, IconName } from "../icons"
import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"

export const MobileNavigation: FC<{ className?: string }> = ({ className = "" }) => {
  const [open, setOpen] = useState<boolean>(false)
  const pathname = usePathname()

  useEffect(() => {
    if (open) {
      document.body.classList.add("no-scroll")
    } else {
      document.body.classList.remove("no-scroll")
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button onClick={() => setOpen((open) => !open)} className={`mt-1 mr-3 ${className}`}>
        <Icon name="bars" className="h-5 text-black dark:text-white" />
      </button>
      {open && (
        <div className="mobile-docs-navigation md:hidden fixed left-0 top-0 w-screen h-screen z-50 bg-white/70 dark:bg-[#09090B]/70 backdrop-blur flex">
          <div className="bg-black p-6 pl-8 shrink">
            <Navigation />
          </div>
          <button onClick={() => setOpen((open) => !open)} className="absolute right-4 top-[1.625rem]">
            <Icon name={open ? "close" : "bars"} className="h-6 text-black dark:text-white" />
          </button>
        </div>
      )}
    </>
  )
}
