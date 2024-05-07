import clsx from "clsx"
import { PanelResizeHandle as PRH } from "react-resizable-panels"

export function PanelResizeHandle({
  direction,
  className
}: {
  readonly direction: "horizontal" | "vertical"
  readonly className?: string
}) {
  return (
    <PRH
      className={clsx(
        `${direction === "horizontal" ? "h-1" : "w-1"}`,
        className
      )}
    />
  )
}
