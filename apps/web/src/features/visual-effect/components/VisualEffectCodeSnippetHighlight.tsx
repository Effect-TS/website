import { motion, useReducedMotion } from "motion/react"
import * as React from "react"
import type { ResolvedOffsetRange } from "@/features/visual-effect/model/snippet-highlights"
import { SPRINGS } from "@/lib/animation"

interface HighlightRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function VisualEffectCodeSnippetHighlight({
  containerRef,
  ranges,
}: {
  readonly containerRef: React.RefObject<HTMLDivElement | null>
  readonly ranges: ReadonlyArray<ResolvedOffsetRange>
}) {
  const [rect, setRect] = React.useState<HighlightRect | null>(null)
  const [displayRect, setDisplayRect] = React.useState<HighlightRect | null>(
    null,
  )
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    if (rect !== null) {
      setDisplayRect(rect)
    }
  }, [rect])

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (container === null || ranges.length === 0) {
      setRect(null)
      return
    }

    const measure = () => {
      const currentContainer = containerRef.current
      if (currentContainer === null) {
        setRect(null)
        return
      }

      const tokenSpans = Array.from(
        currentContainer.querySelectorAll<HTMLSpanElement>(
          "span[data-start][data-end]",
        ),
      )

      const matchedRects: Array<DOMRect> = []
      for (const span of tokenSpans) {
        const startText = span.dataset.start
        const endText = span.dataset.end

        if (startText === undefined || endText === undefined) {
          continue
        }

        const spanStart = Number(startText)
        const spanEnd = Number(endText)

        if (!Number.isFinite(spanStart) || !Number.isFinite(spanEnd)) {
          continue
        }

        const intersectsRange = ranges.some((range) => {
          if (spanStart === spanEnd) {
            return spanStart >= range.startOffset && spanStart < range.endOffset
          }

          return spanStart < range.endOffset && spanEnd > range.startOffset
        })

        if (!intersectsRange) {
          continue
        }

        matchedRects.push(span.getBoundingClientRect())
      }

      if (matchedRects.length === 0) {
        setRect(null)
        return
      }

      const firstRect = matchedRects[0]!
      let left = firstRect.left
      let top = firstRect.top
      let right = firstRect.right
      let bottom = firstRect.bottom

      for (let index = 1; index < matchedRects.length; index++) {
        const currentRect = matchedRects[index]!
        left = Math.min(left, currentRect.left)
        top = Math.min(top, currentRect.top)
        right = Math.max(right, currentRect.right)
        bottom = Math.max(bottom, currentRect.bottom)
      }

      const containerRect = currentContainer.getBoundingClientRect()
      const nextRect: HighlightRect = {
        x: left - containerRect.left - 8,
        y: top - containerRect.top - 6,
        width: right - left + 16,
        height: bottom - top + 12,
      }

      setRect((currentRect) => {
        if (currentRect !== null && rectMatches(currentRect, nextRect)) {
          return currentRect
        }

        return nextRect
      })
    }

    const frame = window.requestAnimationFrame(measure)
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(measure)
    })
    resizeObserver.observe(container)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [containerRef, ranges])

  const opacityTransition = reduceMotion
    ? { duration: 0.12 }
    : { duration: 0.18, ease: "easeOut" as const }
  const geometryTransition = reduceMotion ? { duration: 0.12 } : SPRINGS.default

  if (displayRect === null) {
    return null
  }

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 rounded-md"
      initial={{
        opacity: 0,
        x: displayRect.x,
        y: displayRect.y,
        width: displayRect.width,
        height: displayRect.height,
      }}
      animate={{
        opacity: rect === null ? 0 : 1,
        x: displayRect.x,
        y: displayRect.y,
        width: displayRect.width,
        height: displayRect.height,
      }}
      transition={{
        opacity: opacityTransition,
        x: geometryTransition,
        y: geometryTransition,
        width: geometryTransition,
        height: geometryTransition,
      }}
      onAnimationComplete={() => {
        if (rect === null) {
          setDisplayRect(null)
        }
      }}
      style={{
        background: "rgba(56, 189, 248, 0.15)",
        border: "1px solid rgba(56, 189, 248, 0.6)",
        boxShadow: "0 0 14px rgba(56, 189, 248, 0.3)",
      }}
    />
  )
}

const rectMatches = (first: HighlightRect, second: HighlightRect): boolean => {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  )
}
