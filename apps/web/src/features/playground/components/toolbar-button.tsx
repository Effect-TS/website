import type { ComponentProps } from "react"

/**
 * A text button in the toolbar above the editor.
 */
export function ToolbarButton(props: Omit<ComponentProps<"button">, "type">) {
  return (
    <button
      type="button"
      className="h-7.5 cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
      {...props}
    />
  )
}
