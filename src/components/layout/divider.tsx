import { FC } from "react"

export const Divider: FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <hr
      className={`w-full border-none h-px bg-gradient-to-r from-black/0 via-black/20 to-black/0 dark:from-white/0 dark:via-white/25 dark:to-white/0 ${className}`}
    />
  )
}
