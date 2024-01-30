"use client"

import { Icon } from "@/components/icons"
import { FC, PropsWithChildren, useRef, useState } from "react"

export const Pre: FC<PropsWithChildren<{ filename?: string }>> = ({
  children,
  filename
}) => {
  const container = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState<boolean>(false)

  const copy = () => {
    const code: string = container.current?.innerText ?? ""
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative mt-7">
      <div className="group w-full bg-gradient-to-br from-zinc-500 to-zinc-800 p-px rounded-xl overflow-hidden [.code-output_&]:rounded-b-none">
        <div className="bg-zinc-950 rounded-[11px] [.code-output_&]:rounded-b-none">
          <div className="flex justify-start group-hover:justify-between items-center pr-2 border-b border-zinc-800">
            <div className="flex">
              <div className="h-10 flex items-center gap-2 px-3 border-r border-zinc-800">
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
              </div>
              {filename && (
                <div className="h-10 px-3 flex items-center border-r border-zinc-800 font-mono text-sm text-zinc-300 dark:text-zinc-300">
                  {filename}
                </div>
              )}
            </div>
            <button
              onClick={copy}
              className="hidden group-hover:block h-6 rounded-lg p-px shadow-lg bg-gradient-to-br from-zinc-300 to-zinc-500"
            >
              <div className="h-full flex items-center gap-1 px-2 font-medium rounded-[7px] bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-sm">
                <Icon name={copied ? "check" : "clipboard"} className="h-3" />
                <span>{copied ? "Copied" : "Copy"}</span>
              </div>
            </button>
          </div>
          <pre
            ref={container}
            className="shiki twoslash rounded-none"
            style={{ margin: 0, padding: 0, backgroundColor: "transparent" }}
          >
            {children}
          </pre>
        </div>
      </div>
    </div>
  )
}
