import { useCallback, useEffect, useRef, useState } from "react"

export interface TabsIndicatorRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export const useTabsIndicator = (selection: unknown) => {
  const [indicatorRect, setIndicatorRect] = useState<
    TabsIndicatorRect | undefined
  >(undefined)
  const rootElementReference = useRef<HTMLElement | undefined>(undefined)
  const resizeObserverReference = useRef<ResizeObserver | undefined>(undefined)
  const frameReference = useRef<number | undefined>(undefined)

  const updateIndicator = useCallback(() => {
    const rootElement = rootElementReference.current

    if (rootElement === undefined) {
      setIndicatorRect(undefined)
      return
    }

    const tabListElement = getTabListElement(rootElement)

    if (tabListElement === undefined) {
      setIndicatorRect(undefined)
      return
    }

    const activeTriggerElement = getActiveTriggerElement(tabListElement)

    if (activeTriggerElement === undefined) {
      setIndicatorRect(undefined)
      return
    }

    const tabListRect = tabListElement.getBoundingClientRect()
    const activeTriggerRect = activeTriggerElement.getBoundingClientRect()
    // The indicator is positioned relative to the tab list's padding box,
    // so subtract the border to convert border-box rects to padding-box offsets
    const { borderLeftWidth, borderTopWidth } = getComputedStyle(tabListElement)
    const nextRect: TabsIndicatorRect = {
      left:
        activeTriggerRect.left - tabListRect.left - parseFloat(borderLeftWidth),
      top: activeTriggerRect.top - tabListRect.top - parseFloat(borderTopWidth),
      width: activeTriggerRect.width,
      height: activeTriggerRect.height,
    }

    setIndicatorRect((currentRect) => {
      if (rectMatches(nextRect, currentRect)) {
        return currentRect
      }

      return nextRect
    })
  }, [])

  const scheduleIndicatorUpdate = useCallback(() => {
    const activeFrame = frameReference.current

    if (activeFrame !== undefined) {
      cancelAnimationFrame(activeFrame)
    }

    frameReference.current = requestAnimationFrame(() => {
      frameReference.current = undefined
      updateIndicator()
    })
  }, [updateIndicator])

  const rootRef = useCallback(
    (node: HTMLDivElement | null) => {
      resizeObserverReference.current?.disconnect()
      resizeObserverReference.current = undefined

      if (node === null) {
        rootElementReference.current = undefined
        setIndicatorRect(undefined)
        return
      }

      rootElementReference.current = node
      const tabListElement = getTabListElement(node)

      if (tabListElement !== undefined) {
        const resizeObserver = new ResizeObserver(() => {
          scheduleIndicatorUpdate()
        })

        resizeObserver.observe(tabListElement)
        resizeObserverReference.current = resizeObserver
      }

      scheduleIndicatorUpdate()
    },
    [scheduleIndicatorUpdate],
  )

  useEffect(() => {
    scheduleIndicatorUpdate()
  }, [scheduleIndicatorUpdate, selection])

  useEffect(() => {
    const fontsApi = document.fonts

    if (fontsApi === undefined) {
      return
    }

    void fontsApi.ready.then(() => {
      scheduleIndicatorUpdate()
    })
  }, [scheduleIndicatorUpdate])

  useEffect(() => {
    return () => {
      resizeObserverReference.current?.disconnect()

      const activeFrame = frameReference.current

      if (activeFrame !== undefined) {
        cancelAnimationFrame(activeFrame)
      }
    }
  }, [])

  return {
    indicatorRect,
    rootRef,
  } as const
}

const rectMatches = (
  nextRect: TabsIndicatorRect,
  currentRect: TabsIndicatorRect | undefined,
): boolean => {
  if (currentRect === undefined) {
    return false
  }

  return (
    nextRect.left === currentRect.left &&
    nextRect.top === currentRect.top &&
    nextRect.width === currentRect.width &&
    nextRect.height === currentRect.height
  )
}

const getTabListElement = (root: HTMLElement): HTMLDivElement | undefined => {
  const tabListCandidate = root.querySelector('[data-slot="tabs-list"]')

  if (tabListCandidate instanceof HTMLDivElement) {
    return tabListCandidate
  }

  return undefined
}

const getActiveTriggerElement = (
  tabListElement: HTMLDivElement,
): HTMLButtonElement | undefined => {
  const activeTriggerCandidate = tabListElement.querySelector(
    '[data-slot="tabs-trigger"][aria-selected="true"]',
  )

  if (activeTriggerCandidate instanceof HTMLButtonElement) {
    return activeTriggerCandidate
  }

  return undefined
}
