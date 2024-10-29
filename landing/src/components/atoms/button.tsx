"use client"
import Link from "next/link"
import { FC, ReactNode } from "react"
import { Icon } from "../icons"
import { track } from "@vercel/analytics"

export const Button: FC<{
  secondary?: boolean | false
  href: string
  children: ReactNode
  className?: string
  external?: boolean
}> = ({ secondary, href, children, className = "", external }) => {
  return (
    <Link
      href={href}
      className={`inline-flex relative z-10 h-10 rounded-xl p-px shadow-lg button-hover ${
        secondary
          ? "bg-gradient-to-br from-zinc-300 to-zinc-500"
          : "bg-gradient-to-b from-white to-zinc-300"
      } ${className}`}
      {...(external && {
        rel: "noopener noreferrer",
        target: "_blank",
        onClick: () => track("click-external-link", { href })
      })}
    >
      <div
        className={`flex items-center gap-1 px-6 font-medium rounded-[11px] whitespace-nowrap ${
          secondary
            ? "bg-gradient-to-br from-zinc-700 to-zinc-900 text-white"
            : "bg-white text-black"
        }`}
      >
        <span>{children}</span>
        <Icon
          name={href.startsWith("http") ? "arrow-up-right" : "arrow-right"}
          className={`h-3.5 ${href.startsWith("http") ? "-mt-1" : ""}`}
        />
      </div>
    </Link>
  )
}
