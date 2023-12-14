"use client"

import { Icon } from "@/components/icons"
import { FC, PropsWithChildren, useRef, useState } from "react"

export const Pre: FC<PropsWithChildren<{}>> = ({ children }) => {
  const container = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState<boolean>(false)

  const copy = () => {
    const code: string = container.current?.innerText ?? ""
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative mt-7">
      <div className="w-full bg-gradient-to-br from-zinc-500 to-zinc-800 p-px rounded-xl overflow-hidden">
        <pre className="shiki twoslash" style={{ margin: 0, padding: 0, backgroundColor: "transparent" }}>
          <div ref={container} className="bg-zinc-950 rounded-[11px]">
            {children}
          </div>
        </pre>
      </div>
      <button onClick={copy} className="absolute right-4 -top-3 z-10 h-6 rounded-lg p-px shadow-lg bg-gradient-to-br from-zinc-300 to-zinc-500">
        <div className="h-full flex items-center gap-1 px-2 font-medium rounded-[7px] bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-sm">
          <Icon name={copied ? "check" : "clipboard"} className="h-3" />
          <span>{copied ? "Copied" : "Copy"}</span>
        </div>
      </button>
    </div>
  )
}
