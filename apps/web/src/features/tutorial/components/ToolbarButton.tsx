import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/** Same look as the playground's Reset and Share buttons. */
export function ToolbarButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "h-7.5 cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white",
        className,
      )}
      {...props}
    />
  )
}
