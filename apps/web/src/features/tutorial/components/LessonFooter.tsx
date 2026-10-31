import { ToolbarButton } from "./ToolbarButton"
import { goalsReached, type Status } from "./Results"

interface Props {
  readonly status: Status
  readonly goals: ReadonlyArray<string>
  readonly next: { readonly title: string; readonly onOpen: () => void } | null
}

/** Why the learner cannot continue yet, or `undefined` when they can. */
export function blockedReason(
  status: Status,
  goals: ReadonlyArray<string>,
): string | undefined {
  switch (status._tag) {
    case "Passed":
      return undefined
    case "Loading":
      return "Loading the editor…"
    case "Checking":
      return "Checking your code…"
    case "TypeErrors":
      return "Fix the type errors to continue"
    case "GoalTypeErrors":
      return "The types do not match the goal"
    case "Crashed":
      return "The code stopped with an error"
    case "TestsFailed":
      return `${goals.length - goalsReached(status, goals)} of ${goals.length} goals not reached`
  }
}

export function LessonFooter({ status, goals, next }: Props) {
  const reason = blockedReason(status, goals)
  return (
    <footer className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-4 py-2">
      <p
        data-testid="tutorial-status"
        className={
          reason === undefined
            ? "text-sm text-brand"
            : "text-sm text-muted-foreground"
        }
      >
        {reason ?? "Goals reached"}
      </p>
      {next !== null && (
        <ToolbarButton
          data-testid="tutorial-next-cta"
          disabled={reason !== undefined}
          onClick={next.onOpen}
          className="ml-auto"
        >
          Next: {next.title} →
        </ToolbarButton>
      )}
    </footer>
  )
}
