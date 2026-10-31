import * as Cause from "effect/Cause"
import * as Option from "effect/Option"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { RunnersDidNotPause } from "../playground/services/run-control"

/**
 * Says when the last Solve or Reset failed. A newer click interrupting an
 * older one is not a failure, and nothing is shown while one is running.
 */
export function LessonActionStatus({
  action,
  result,
}: {
  readonly action: "solve" | "reset"
  readonly result: AsyncResult.AsyncResult<unknown, unknown>
}) {
  if (!AsyncResult.isFailure(result) || Cause.hasInterruptsOnly(result.cause)) {
    return null
  }
  const name = action === "solve" ? "Solve" : "Reset"
  // The files are only replaced once every runner has paused, so this failure
  // leaves them exactly as they were.
  const unchanged = Option.exists(
    Cause.findErrorOption(result.cause),
    (error) => error instanceof RunnersDidNotPause,
  )
  return (
    <p role="alert" className="max-w-xs text-xs text-red-600 dark:text-red-400">
      {unchanged
        ? `${name} did not finish because the program in the terminal was still busy, so your files were not changed. Try again in a moment.`
        : `${name} did not finish. Try again, or reload the page if it keeps failing.`}
    </p>
  )
}
