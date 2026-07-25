import * as React from "react"

export const useScrollRightFade = <T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  deps: ReadonlyArray<unknown> = [],
) => {
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const update = React.useCallback(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    setCanScrollRight(element.scrollLeft < element.scrollWidth - element.clientWidth - 1)
  }, [ref])

  React.useEffect(() => {
    update()
  }, [update, ...deps])

  React.useEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, update])

  return { canScrollRight, onScroll: update } as const
}
