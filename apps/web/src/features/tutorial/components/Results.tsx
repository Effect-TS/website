import { CircleCheck, Circle, CircleX } from "lucide-react"
import type { CheckResult, Problem } from "../runner/check"

export type Phase = { readonly _tag: "Loading" } | { readonly _tag: "Checking" }

export type Status = Phase | CheckResult

type GoalState = "pending" | "passed" | "failed"

const stateOf = (status: Status, goal: string): GoalState => {
  if (status._tag === "Passed") return "passed"
  if (status._tag !== "TestsFailed") return "pending"
  const result = status.results.find((candidate) => candidate.name === goal)
  return result === undefined ? "pending" : result.ok ? "passed" : "failed"
}

const messageOf = (status: Status, goal: string): string =>
  status._tag === "TestsFailed"
    ? (status.results.find((result) => result.name === goal)?.message ?? "")
    : ""

export const goalsReached = (
  status: Status,
  goals: ReadonlyArray<string>,
): number => goals.filter((goal) => stateOf(status, goal) === "passed").length

const ICONS = {
  pending: (
    <Circle className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
  ),
  passed: <CircleCheck className="size-4 shrink-0 text-brand" aria-hidden />,
  failed: <CircleX className="size-4 shrink-0 text-destructive" aria-hidden />,
} as const

function Problems({ problems }: { readonly problems: ReadonlyArray<Problem> }) {
  return (
    <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 p-3">
      {problems.map((problem, index) => (
        <li
          key={index}
          className="flex gap-2 font-mono text-xs leading-relaxed"
        >
          <span className="shrink-0 text-muted-foreground">
            line {problem.line}
          </span>
          <span className="text-foreground">{problem.message}</span>
        </li>
      ))}
    </ul>
  )
}

export function Results({
  status,
  goals,
}: {
  readonly status: Status
  readonly goals: ReadonlyArray<string>
}) {
  return (
    <div className="space-y-3 px-4 py-3">
      <ul className="space-y-1.5">
        {goals.map((goal) => {
          const state = stateOf(status, goal)
          const message = messageOf(status, goal)
          return (
            <li key={goal} className="text-sm">
              <div className="flex items-center gap-2">
                {ICONS[state]}
                <span className="text-foreground">{goal}</span>
              </div>
              {message !== "" && (
                <p className="pl-6 font-mono text-xs text-muted-foreground">
                  {message}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {(status._tag === "TypeErrors" || status._tag === "GoalTypeErrors") && (
        <Problems problems={status.problems} />
      )}
      {status._tag === "Crashed" && (
        <p className="font-mono text-xs text-destructive">{status.message}</p>
      )}
    </div>
  )
}
