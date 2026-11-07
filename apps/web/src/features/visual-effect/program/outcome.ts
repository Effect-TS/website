import { Cause, Exit, Result } from "effect"
import { RenderableResult } from "../model/domain"
import type { Outcome, ResultDisplay } from "./domain"

/** What an effect hands back is a result with a display. A stray defect is shown as text. */
export const displayOf = (value: unknown): ResultDisplay =>
  RenderableResult.is(value)
    ? value.display()
    : { size: "Small", text: String(value) }

export const outcomeOf = (exit: Exit.Exit<unknown, unknown>): Outcome => {
  if (Exit.isSuccess(exit)) {
    return { _tag: "Succeeded", value: displayOf(exit.value) }
  }
  if (Cause.hasInterruptsOnly(exit.cause)) {
    return { _tag: "Interrupted" }
  }
  const defect = Cause.findDefect(exit.cause)
  return Result.isSuccess(defect)
    ? { _tag: "Died", defect: displayOf(defect.success) }
    : { _tag: "Failed", error: displayOf(Cause.squash(exit.cause)) }
}
