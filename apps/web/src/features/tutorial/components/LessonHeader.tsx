import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { OutlineChapter } from "../model"
import { lessonHref } from "../router"
import { LessonMenu } from "./LessonMenu"
import { ToolbarButton } from "./ToolbarButton"

interface Props {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly order: ReadonlyArray<string>
  readonly slug: string
  readonly completed: ReadonlyArray<string>
  readonly isOpen: (slug: string) => boolean
  readonly onOpen: (slug: string) => void
  readonly onReset: () => void
  readonly onSolve: () => void
  readonly onClearFrom: () => void
  readonly onClearAll: () => void
  readonly editable: boolean
}

const arrow =
  "flex size-7.5 items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 text-zinc-700 no-underline hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"

function Arrow({
  testId,
  direction,
  target,
  title,
  reason,
  onOpen,
}: {
  readonly testId: string
  readonly direction: "previous" | "next"
  readonly target: string | undefined
  readonly title: string | undefined
  readonly reason: string | undefined
  readonly onOpen: (slug: string) => void
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight
  const enabled = target !== undefined && reason === undefined
  const text =
    target === undefined
      ? direction === "previous"
        ? "This is the first lesson"
        : "This is the last lesson"
      : (reason ??
        `${direction === "previous" ? "Previous" : "Next"}: ${title}`)
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          enabled ? (
            <a
              data-testid={testId}
              href={lessonHref(target)}
              aria-label={text}
              className={arrow}
              onClick={(event) => {
                event.preventDefault()
                onOpen(target)
              }}
            />
          ) : (
            <span
              data-testid={testId}
              role="link"
              aria-disabled="true"
              aria-label={text}
              className={arrow}
            />
          )
        }
      >
        <Icon className="size-4" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="bottom">{text}</TooltipContent>
    </Tooltip>
  )
}

export function LessonHeader({
  outline,
  order,
  slug,
  completed,
  isOpen,
  onOpen,
  onReset,
  onSolve,
  onClearFrom,
  onClearAll,
  editable,
}: Props) {
  const index = order.indexOf(slug)
  const chapter = outline.find((item) =>
    item.lessons.some((lesson) => lesson.slug === slug),
  )
  const lessons = outline.flatMap((item) => item.lessons)
  const titleOf = (target: string | undefined) =>
    lessons.find((lesson) => lesson.slug === target)?.title
  const prev = order[index - 1]
  const next = order[index + 1]
  const done = completed.includes(slug)
  const percent = Math.round((completed.length / order.length) * 100)

  return (
    <header className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background px-4 py-2">
      <LessonMenu
        outline={outline}
        current={slug}
        completed={completed}
        isOpen={isOpen}
        onOpen={onOpen}
        label={`Lesson ${index + 1} of ${order.length}`}
      />
      <div className="flex items-center gap-1">
        <Arrow
          testId="tutorial-prev"
          direction="previous"
          target={prev}
          title={titleOf(prev)}
          reason={undefined}
          onOpen={onOpen}
        />
        <Arrow
          testId="tutorial-next"
          direction="next"
          target={next}
          title={titleOf(next)}
          reason={done ? undefined : "Reach this lesson's goals to continue"}
          onOpen={onOpen}
        />
      </div>

      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-muted-foreground md:flex"
      >
        <span>Tutorial</span>
        <span aria-hidden="true">/</span>
        <span>{chapter?.title}</span>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-foreground">
          {titleOf(slug)}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ToolbarButton
          data-testid="tutorial-reset"
          disabled={!editable}
          onClick={onReset}
        >
          Reset
        </ToolbarButton>
        <ToolbarButton
          data-testid="tutorial-solve"
          disabled={!editable}
          onClick={onSolve}
        >
          Solve
        </ToolbarButton>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <ToolbarButton
                data-testid="tutorial-clear"
                disabled={!editable}
                aria-label="Clear progress"
                className="flex items-center gap-1"
              />
            }
          >
            Clear
            <ChevronDown className="size-3.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem
              data-testid="tutorial-clear-lesson"
              onClick={onClearFrom}
            >
              Clear from this lesson on
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="tutorial-clear-all"
              variant="destructive"
              onClick={() => {
                if (window.confirm("Clear all tutorial progress and code?")) {
                  onClearAll()
                }
              }}
            >
              Clear all progress
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        role="progressbar"
        aria-label="Tutorial progress"
        aria-valuemin={0}
        aria-valuemax={order.length}
        aria-valuenow={completed.length}
        className="absolute inset-x-0 bottom-0 h-0.5 bg-border"
      >
        <div
          className="h-full bg-brand transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  )
}
