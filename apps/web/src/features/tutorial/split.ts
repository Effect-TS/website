const STORAGE_KEY = "effect-website:tutorial:prose-width"
const MIN = 20
const MAX = 70
const STEP = 2

const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value))

/** Makes `[data-tutorial-handle]` resize the prose column of its split. */
export function initSplit(): void {
  const handle = document.querySelector<HTMLElement>("[data-tutorial-handle]")
  const split = handle?.closest<HTMLElement>("[data-tutorial-split]")
  if (!handle || !split) return

  const apply = (percent: number, persist: boolean) => {
    const value = clamp(percent)
    split.style.setProperty("--prose-width", `${value}%`)
    handle.setAttribute("aria-valuenow", String(Math.round(value)))
    if (persist) localStorage.setItem(STORAGE_KEY, String(value))
    return value
  }
  const current = () => {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : 40
  }
  apply(current(), false)

  handle.addEventListener("pointerdown", (event) => {
    handle.setPointerCapture(event.pointerId)
    const bounds = split.getBoundingClientRect()
    const move = (moveEvent: PointerEvent) =>
      apply(((moveEvent.clientX - bounds.left) / bounds.width) * 100, true)
    const stop = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", stop)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", stop)
  })

  handle.addEventListener("keydown", (event) => {
    const direction =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
    if (direction === 0) return
    event.preventDefault()
    apply(current() + direction * STEP, true)
  })
}
