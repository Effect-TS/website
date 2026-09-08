import { useRef } from "react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  finalFocus,
}: {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onClose: () => void
  readonly finalFocus?: import("react").RefObject<HTMLElement | null>
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        initialFocus={cancel}
        finalFocus={finalFocus}
        showCloseButton={false}
        overlayClassName="bg-black/25 backdrop-blur-sm"
        className="block rounded-md border border-border-strong bg-popover p-6 shadow-2xl ring-0 sm:max-w-md"
      >
        <DialogTitle className="text-lg font-semibold leading-normal">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-3 leading-relaxed">
          {description}
        </DialogDescription>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button
            ref={cancel}
            variant="outline"
            className="h-auto rounded-lg px-4 py-2"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-auto rounded-lg px-4 py-2"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
