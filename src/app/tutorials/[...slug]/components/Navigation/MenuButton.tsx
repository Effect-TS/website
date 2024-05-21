"use client"

import { Icon } from "@/components/icons"
import { useClickOutside } from "@/hooks/useClickOutside"
import { useCallback, useRef, useState } from "react"

export function MenuButton({
  title,
  section,
  children
}: {
  readonly section: string
  readonly title: string
  readonly children: JSX.Element
}) {
  const [visible, setVisible] = useState(false)

  const onClick = useCallback(
    function () {
      setVisible((_) => !_)
    },
    [setVisible]
  )

  const ref = useRef<HTMLElement>(null)
  useClickOutside(ref, function () {
    setVisible(false)
  })

  return (
    <div className="flex-1 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg p-px cursor-pointer">
      <nav
        ref={ref}
        className="bg-gray-100 dark:bg-neutral-900 p-2 rounded-lg relative"
      >
        <div onClick={onClick} className="flex items-center">
          <strong className="font-medium">{section}</strong>
          <Separator />
          <span>{title}</span>
          <div className="flex-1" aria-hidden />
          <Icon name="chevron-right" className="h-4 rotate-90" />
        </div>
        <div
          className={`absolute transition-all z-10 top-0 left-0 w-full mt-12 ${
            visible ? "visible opacity-100" : "invisible opacity-0"
          }`}
        >
          {children}
        </div>
      </nav>
    </div>
  )
}

function Separator() {
  return <span className="text-lg px-2 leading-none">/</span>
}
