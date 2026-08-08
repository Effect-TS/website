import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import { acquireReleaseExample } from "./effect-acquire-release"
import { addFinalizerExample } from "./effect-add-finalizer"
import { allExample } from "./effect-all"
import { allShortCircuitExample } from "./effect-all-short-circuit"
import { catchExample } from "./effect-catch"
import { dieExample } from "./effect-die"
import { eventuallyExample } from "./effect-eventually"
import { failExample } from "./effect-fail"
import { forEachExample } from "./effect-for-each"
import { partitionExample } from "./effect-partition"
import { promiseExample } from "./effect-promise"
import { raceExample } from "./effect-race"
import { raceAllExample } from "./effect-race-all"
import { repeatSpacedExample } from "./effect-repeat-spaced"
import { repeatWhileExample } from "./effect-repeat-while"
import { retryExponentialExample } from "./effect-retry-exponential"
import { retryRecursExample } from "./effect-retry-recurs"
import { sleepExample } from "./effect-sleep"
import { succeedExample } from "./effect-succeed"
import { syncExample } from "./effect-sync"
import { timeoutExample } from "./effect-timeout"
import { validateExample } from "./effect-validate"

export type ExampleCategory =
  | "concurrency"
  | "constructors"
  | "error-handling"
  | "schedule"
  | "scope"

export interface ExampleCatalogEntry {
  readonly label: string
  readonly examples: ReadonlyArray<ExampleDefinition>
}

export const EXAMPLES_CATALOG: Record<ExampleCategory, ExampleCatalogEntry> = {
  concurrency: {
    label: "Concurrency",
    examples: [allExample, raceExample, raceAllExample, forEachExample],
  },
  schedule: {
    label: "Schedule",
    examples: [
      retryRecursExample,
      retryExponentialExample,
      repeatSpacedExample,
      repeatWhileExample,
    ],
  },
  constructors: {
    label: "Constructors",
    examples: [
      succeedExample,
      failExample,
      dieExample,
      syncExample,
      promiseExample,
      sleepExample,
    ],
  },
  "error-handling": {
    label: "Error Handling",
    examples: [
      allShortCircuitExample,
      catchExample,
      timeoutExample,
      eventuallyExample,
      partitionExample,
      validateExample,
    ],
  },
  scope: {
    label: "Scope",
    examples: [addFinalizerExample, acquireReleaseExample],
  },
}
