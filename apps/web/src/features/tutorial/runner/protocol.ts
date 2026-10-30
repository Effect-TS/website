import type { TestResult } from "./test-api"

export type RunnerMessage =
  | { readonly _tag: "Log"; readonly line: string }
  | { readonly _tag: "Results"; readonly results: ReadonlyArray<TestResult> }
  | { readonly _tag: "Crash"; readonly message: string }

export interface RunRequest {
  readonly main: string
  readonly test: string
}

export interface RunResult {
  readonly logs: ReadonlyArray<string>
  readonly results: ReadonlyArray<TestResult>
  /** Set when the code threw outside a test, or the run timed out. */
  readonly crash: string | undefined
}
