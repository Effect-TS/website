import { AlertDialog } from "@base-ui/react/alert-dialog"
import * as React from "react"

/**
 * A modal "are you sure?" for actions that discard work. Cancel has the
 * initial focus, and Escape cancels.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onOpenChange: (open: boolean) => void
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup
          data-testid="confirm-dialog"
          initialFocus={cancelRef}
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-zinc-300 bg-white p-6 shadow-2xl transition-all duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:max-w-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          <AlertDialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex items-center justify-end gap-3">
            <AlertDialog.Close
              ref={cancelRef}
              className="cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
