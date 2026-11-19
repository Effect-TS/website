import type { RunnerMessage, RunRequest, RunResult } from "./protocol"

const TIMEOUT_MS = 5_000

/** Runs the compiled learner file and the goal test in a fresh worker. */
export function runLesson(request: RunRequest): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    })
    const logs: Array<string> = []
    const finish = (
      results: RunResult["results"],
      crash: RunResult["crash"],
    ) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ logs, results, crash })
    }
    const timer = setTimeout(
      () => finish([], "The code did not finish in 5 seconds."),
      TIMEOUT_MS,
    )

    worker.onmessage = (event: MessageEvent<RunnerMessage>) => {
      const message = event.data
      if (message._tag === "Log") logs.push(message.line)
      else if (message._tag === "Results") finish(message.results, undefined)
      else finish([], message.message)
    }
    worker.onerror = (event) => finish([], event.message)
    worker.postMessage(request)
  })
}
