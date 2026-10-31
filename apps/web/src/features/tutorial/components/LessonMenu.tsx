import { Popover } from "@base-ui/react/popover"
import { ChevronDown, Circle, CircleCheck, Lock } from "lucide-react"
import type { OutlineChapter } from "../model"
import { lessonHref } from "../router"

interface Props {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly current: string
  readonly completed: ReadonlyArray<string>
  readonly isOpen: (slug: string) => boolean
  readonly onOpen: (slug: string) => void
  readonly label: string
}

function Status({
  done,
  current,
  locked,
}: {
  readonly done: boolean
  readonly current: boolean
  readonly locked: boolean
}) {
  if (done)
    return <CircleCheck className="size-4 text-brand" aria-label="Completed" />
  if (locked)
    return (
      <Lock className="size-4 text-subtle-foreground" aria-label="Locked" />
    )
  return (
    <Circle
      className={
        current
          ? "size-4 fill-foreground text-foreground"
          : "size-4 text-muted-foreground"
      }
      aria-label={current ? "Current lesson" : "Not completed"}
    />
  )
}

export function LessonMenu({
  outline,
  current,
  completed,
  isOpen,
  onOpen,
  label,
}: Props) {
  const total = outline.reduce(
    (sum, chapter) => sum + chapter.lessons.length,
    0,
  )
  return (
    <Popover.Root>
      <Popover.Trigger
        data-testid="tutorial-menu"
        className="flex h-7.5 max-w-full cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          align="start"
          className="isolate z-50"
        >
          <Popover.Popup
            data-testid="tutorial-menu-panel"
            className="max-h-(--available-height) w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none"
          >
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {completed.length} of {total} lessons complete
            </p>
            {outline.map((chapter) => (
              <details
                key={chapter.slug}
                open={chapter.lessons.some((lesson) => lesson.slug === current)}
                className="group"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-foreground select-none hover:bg-muted [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    className="size-3.5 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0"
                    aria-hidden
                  />
                  {chapter.title}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {
                      chapter.lessons.filter((lesson) =>
                        completed.includes(lesson.slug),
                      ).length
                    }
                    /{chapter.lessons.length}
                  </span>
                </summary>
                <ul className="ml-3 border-l border-border py-1 pl-2">
                  {chapter.lessons.map((lesson) => {
                    const done = completed.includes(lesson.slug)
                    const isCurrent = lesson.slug === current
                    const locked = !isOpen(lesson.slug)
                    return (
                      <li key={lesson.slug}>
                        {locked ? (
                          <span
                            aria-disabled="true"
                            title="Complete the previous lessons first"
                            className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-subtle-foreground"
                          >
                            <Status done={done} current={false} locked />
                            {lesson.title}
                          </span>
                        ) : (
                          <Popover.Close
                            render={
                              <a
                                href={lessonHref(lesson.slug)}
                                aria-current={isCurrent ? "page" : undefined}
                                onClick={(event) => {
                                  if (
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey ||
                                    event.button !== 0
                                  )
                                    return
                                  event.preventDefault()
                                  onOpen(lesson.slug)
                                }}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navigation-foreground no-underline hover:bg-muted hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                              />
                            }
                          >
                            <Status
                              done={done}
                              current={isCurrent}
                              locked={false}
                            />
                            {lesson.title}
                          </Popover.Close>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </details>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
