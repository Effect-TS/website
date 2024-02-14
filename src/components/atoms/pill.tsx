import Link from "next/link"
import { FC, ReactNode } from "react"
import { Icon } from "../icons"

export const Pill: FC<{ href: string; children: ReactNode }> = ({
  href,
  children
}) => {
  return (
    <Link
      href={href}
      className="text-xs sm:text-sm md:text-base whitespace-nowrap bg-gradient-to-br from-zinc-700 to-zinc-800 text-white font-normal rounded-full inline-flex items-center gap-1 px-3 h-7 button-hover"
    >
      <div>{children}</div>
      <Icon name="arrow-right" className="h-3.5" />
    </Link>
  )
}
