const DRAG_THRESHOLD_PX = 6

/**
 * Lets a strip scroll when the pointer drags it. A drag that moved the strip
 * is not a click on the tab it ends on. It returns a function that stops it.
 */
export const dragScroll = (element: HTMLElement): (() => void) => {
  const drag = { pointerId: -1, startX: 0, startScrollLeft: 0, moved: false }

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    drag.pointerId = event.pointerId
    drag.startX = event.clientX
    drag.startScrollLeft = element.scrollLeft
    drag.moved = false
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (drag.pointerId !== event.pointerId) return
    const delta = event.clientX - drag.startX
    if (!drag.moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
      drag.moved = true
      element.setPointerCapture(event.pointerId)
    }
    if (drag.moved) {
      element.scrollLeft = drag.startScrollLeft - delta
    }
  }
  const onPointerEnd = (event: PointerEvent): void => {
    if (drag.pointerId !== event.pointerId) return
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
    drag.pointerId = -1
  }
  const onClickCapture = (event: MouseEvent): void => {
    if (drag.moved) {
      event.preventDefault()
      event.stopPropagation()
      drag.moved = false
    }
  }

  element.addEventListener("pointerdown", onPointerDown)
  element.addEventListener("pointermove", onPointerMove)
  element.addEventListener("pointerup", onPointerEnd)
  element.addEventListener("pointercancel", onPointerEnd)
  element.addEventListener("click", onClickCapture, true)
  return () => {
    element.removeEventListener("pointerdown", onPointerDown)
    element.removeEventListener("pointermove", onPointerMove)
    element.removeEventListener("pointerup", onPointerEnd)
    element.removeEventListener("pointercancel", onPointerEnd)
    element.removeEventListener("click", onClickCapture, true)
  }
}

/**
 * Tells `onChange` whether more tabs wait on the right, when the strip scrolls,
 * resizes or gets new tabs. It reports a value only when it changes. It returns
 * a function that stops it.
 */
export const watchRightEdge = (
  element: HTMLElement,
  onChange: (canScrollRight: boolean) => void,
): (() => void) => {
  let canScrollRight: boolean | undefined = undefined
  const report = (): void => {
    const next =
      element.scrollLeft < element.scrollWidth - element.clientWidth - 1
    if (next !== canScrollRight) {
      canScrollRight = next
      onChange(next)
    }
  }
  const resize = new ResizeObserver(report)
  const mutation = new MutationObserver(report)
  resize.observe(element)
  mutation.observe(element, { childList: true, subtree: true })
  element.addEventListener("scroll", report)
  report()
  return () => {
    resize.disconnect()
    mutation.disconnect()
    element.removeEventListener("scroll", report)
  }
}
