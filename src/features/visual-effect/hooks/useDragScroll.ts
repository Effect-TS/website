import * as React from "react"

const DRAG_THRESHOLD_PX = 6

export const useDragScroll = <T extends HTMLElement>() => {
  const ref = React.useRef<T | null>(null)
  const drag = React.useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    captured: false,
  })

  const onPointerDown = React.useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current
    if (element === null || event.button !== 0) {
      return
    }

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft,
      moved: false,
      captured: false,
    }
  }, [])

  const onPointerMove = React.useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current
    if (element === null || drag.current.pointerId !== event.pointerId) {
      return
    }

    const delta = event.clientX - drag.current.startX

    if (!drag.current.moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
      drag.current.moved = true
      drag.current.captured = true
      element.setPointerCapture(event.pointerId)
    }

    if (drag.current.moved) {
      element.scrollLeft = drag.current.startScrollLeft - delta
    }
  }, [])

  const endDrag = React.useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current
    if (element === null || drag.current.pointerId !== event.pointerId) {
      return
    }

    if (drag.current.captured && element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
    drag.current.pointerId = -1
  }, [])

  const onClickCapture = React.useCallback((event: React.MouseEvent<T>) => {
    if (drag.current.moved) {
      event.preventDefault()
      event.stopPropagation()
      drag.current.moved = false
    }
  }, [])

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  } as const
}
