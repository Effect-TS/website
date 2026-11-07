import { Array, Option } from "effect"
import type { FinalizerEntry, FinalizerPanel } from "./domain"

export const FINALIZER_CARD_WIDTH = 200
const SPACING = 35
const MARGIN = 16

export interface FinalizerLayout {
  readonly entry: FinalizerEntry
  readonly x: number
  readonly zIndex: number
  readonly isRunning: boolean
}

const indexOf = (entries: ReadonlyArray<FinalizerEntry>, id: string): number =>
  Array.findFirstIndex(entries, (entry) => entry.id === id).pipe(
    Option.getOrElse(() => 0),
  )

/**
 * Pending finalizers queue on the left, the running one sits in the middle,
 * and the finished ones stack on the right.
 */
export const layoutFinalizers = (
  panel: FinalizerPanel,
  containerWidth: number,
): ReadonlyArray<FinalizerLayout> => {
  if (containerWidth <= 0) {
    return []
  }
  const pending = Array.filter(
    panel.finalizers,
    ({ phase }) => phase === "Pending",
  )
  const completed = Array.filter(
    panel.finalizers,
    ({ phase }) =>
      phase === "Succeeded" || phase === "Failed" || phase === "Interrupted",
  )
  return Array.map(panel.finalizers, (entry) => {
    if (entry.phase === "Running") {
      return {
        entry,
        x: (containerWidth - FINALIZER_CARD_WIDTH) / 2,
        zIndex: 20,
        isRunning: true,
      }
    }
    if (entry.phase === "Pending") {
      const index = indexOf(pending, entry.id)
      return {
        entry,
        x: index * SPACING + MARGIN,
        zIndex: 10 + index,
        isRunning: false,
      }
    }
    const index = indexOf(completed, entry.id)
    const rightOffset = (Array.length(completed) - 1 - index) * SPACING + MARGIN
    return {
      entry,
      x: containerWidth - rightOffset - FINALIZER_CARD_WIDTH,
      zIndex: 10 - index,
      isRunning: false,
    }
  })
}
