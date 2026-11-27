import * as React from "react"

const WIDTH_KEY = "trace-details-width"
export const DEFAULT_DETAILS_WIDTH = 560
export const MIN_DETAILS_WIDTH = 280
/** Room the waterfall always keeps beside the details. */
const WATERFALL_MIN_WIDTH = 240
const KEYBOARD_STEP = 24

const readWidth = (): number => {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    const parsed = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(parsed)
      ? Math.max(MIN_DETAILS_WIDTH, parsed)
      : DEFAULT_DETAILS_WIDTH
  } catch {
    return DEFAULT_DETAILS_WIDTH
  }
}

const writeWidth = (width: number) => {
  try {
    localStorage.setItem(WIDTH_KEY, String(Math.round(width)))
  } catch {
    // Storage unavailable: the width just isn't remembered.
  }
}

/**
 * The column that holds the span details. Beside the waterfall it has a drag
 * handle on its left edge (arrow keys work too, double-click resets), and the
 * width is remembered. When the panel is too narrow for two columns it sits
 * under the waterfall at full width, with no handle.
 */
export function DetailsColumn({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const [width, setWidth] = React.useState(readWidth)
  const ref = React.useRef<HTMLDivElement>(null)

  const maxWidth = () => {
    const row = ref.current?.parentElement?.getBoundingClientRect().width
    return row === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(MIN_DETAILS_WIDTH, row - WATERFALL_MIN_WIDTH)
  }
  const clamp = (next: number) =>
    Math.min(maxWidth(), Math.max(MIN_DETAILS_WIDTH, next))

  const update = (next: number) => {
    setWidth(next)
    writeWidth(next)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth =
      ref.current?.getBoundingClientRect().width ?? DEFAULT_DETAILS_WIDTH
    let next = startWidth
    const onMove = (move: PointerEvent) => {
      next = clamp(startWidth - (move.clientX - startX))
      setWidth(next)
    }
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onUp)
      handle.removeEventListener("pointercancel", onUp)
      writeWidth(next)
    }
    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      update(clamp(width + KEYBOARD_STEP))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      update(clamp(width - KEYBOARD_STEP))
    }
  }

  return (
    <div
      ref={ref}
      data-testid="trace-details-column"
      style={{ "--details-width": `${width}px` } as React.CSSProperties}
      className="relative flex max-h-[55%] min-h-0 shrink-0 flex-col border-t border-border bg-card/40 @2xl:max-h-none @2xl:w-[min(var(--details-width),calc(100%_-_240px))] @2xl:border-t-0 @2xl:border-l"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize span details"
        aria-valuenow={Math.round(width)}
        aria-valuemin={MIN_DETAILS_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={() => update(DEFAULT_DETAILS_WIDTH)}
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize transition-colors hover:bg-brand/30 focus-visible:bg-brand/30 focus-visible:outline-none @2xl:block"
      />
      {children}
    </div>
  )
}
