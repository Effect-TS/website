import { Array, Effect, Option, Order, pipe } from "effect"
import type { HighlightRect, OffsetRange } from "./domain"

export const SNIPPET_ID = "visual-effect-snippet"

const PADDING_X = 8
const PADDING_Y = 6

/**
 * The box around the tokens that touch the ranges, in px from the snippet's
 * corner. It waits a frame so the tokens are in place.
 */
export const measureHighlight = (
  ranges: ReadonlyArray<OffsetRange>,
): Effect.Effect<Option.Option<HighlightRect>> =>
  Effect.callback((resume) => {
    const frame = requestAnimationFrame(() => {
      const container = document.getElementById(SNIPPET_ID)
      if (container === null || Array.isReadonlyArrayEmpty(ranges)) {
        resume(Effect.succeed(Option.none()))
        return
      }
      const matched = pipe(
        Array.fromIterable(
          container.querySelectorAll<HTMLElement>("span[data-start][data-end]"),
        ),
        Array.filter((span) => {
          const start = Number(span.dataset.start)
          const end = Number(span.dataset.end)
          return (
            Number.isFinite(start) &&
            Number.isFinite(end) &&
            Array.some(ranges, (range) =>
              start === end
                ? start >= range.startOffset && start < range.endOffset
                : start < range.endOffset && end > range.startOffset,
            )
          )
        }),
      )
      if (!Array.isReadonlyArrayNonEmpty(matched)) {
        resume(Effect.succeed(Option.none()))
        return
      }
      const boxes = Array.map(matched, (span) => span.getBoundingClientRect())
      const smallest = (pick: (box: DOMRect) => number) =>
        Array.min(Order.Number)(Array.map(boxes, pick))
      const largest = (pick: (box: DOMRect) => number) =>
        Array.max(Order.Number)(Array.map(boxes, pick))
      const left = smallest((box) => box.left)
      const top = smallest((box) => box.top)
      const right = largest((box) => box.right)
      const bottom = largest((box) => box.bottom)
      const origin = container.getBoundingClientRect()
      resume(
        Effect.succeed(
          Option.some({
            x: left - origin.left - PADDING_X,
            y: top - origin.top - PADDING_Y,
            width: right - left + PADDING_X * 2,
            height: bottom - top + PADDING_Y * 2,
          }),
        ),
      )
    })
    return Effect.sync(() => cancelAnimationFrame(frame))
  })
