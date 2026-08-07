import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"
import * as Atom from "effect/unstable/reactivity/Atom"
import { ChevronDownIcon, PlayIcon } from "lucide-react"
import * as React from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  EmbedState,
  getPlaybackTimeSeconds,
  useEmbedManager,
} from "@/features/youtube-embed"
import { cn } from "@/lib/utils"
import { usePodcastEpisode } from "../context"
import { EmbedCommand, type PodcastChapter } from "../domain"

export function PodcastChapters() {
  const { chapters } = usePodcastEpisode()
  const embedManager = useEmbedManager()

  const { activeChapterAtom, setActiveChapterAtom } = React.useMemo(() => {
    const chapterAtomReadonly = Atom.readable((get) => {
      const state = get(embedManager.stateAtom)
      return getActiveChapter(chapters, state)
    })

    const activeChapterAtom = Atom.optimistic(chapterAtomReadonly)

    const setActiveChapterAtom = Atom.fn<PodcastChapter>()(
      Effect.fnUntraced(function* (chapter, get) {
        get.set(embedManager.previewAtom, false)

        const command = new EmbedCommand.cases.seekTo({
          args: [chapter.startTimeSeconds, true],
        })
        get.set(embedManager.stateAtom, command)

        yield* Effect.sync(() => get(chapterAtomReadonly)).pipe(
          Effect.filterOrFail(
            (actualChapter) => actualChapter?.id === chapter.id,
            () => "unconfirmed_update" as const,
          ),
          Effect.retry({
            while: (error) => error === "unconfirmed_update",
            schedule: Schedule.spaced("100 millis"),
          }),
          Effect.ignore,
        )
      }),
    )

    return { activeChapterAtom, setActiveChapterAtom } as const
  }, [chapters, embedManager])

  const activeChapter = useAtomValue(activeChapterAtom)
  const setActiveChapter = useAtomSet(setActiveChapterAtom)

  const handleSeek = React.useCallback(
    (chapter: PodcastChapter) => {
      setActiveChapter(chapter)
    },
    [setActiveChapter],
  )

  return (
    <Collapsible
      defaultOpen={false}
      className="bg-card rounded-lg border border-zinc-700 lg:flex lg:min-h-0 lg:flex-col lg:data-open:flex-1"
    >
      <CollapsibleTrigger className="bg-card hover:bg-accent/50 flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition-colors data-panel-open:rounded-b-none lg:shrink-0">
        <h2 className="text-sm font-semibold">Chapters</h2>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="bg-card border-t border-zinc-700 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <ScrollArea className="h-64 p-2 lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            <ul className="pr-2">
              {chapters.map((chapter, index) => {
                const isActive = activeChapter
                  ? activeChapter === chapter
                  : index === 0

                return (
                  <li key={chapter.id} className="group m-0 list-none p-0">
                    <button
                      type="button"
                      onClick={() => handleSeek(chapter)}
                      aria-label={`Jump to ${chapter.label}: ${chapter.title}`}
                      className={cn(
                        "hover:bg-accent/50 flex w-full cursor-pointer items-center gap-3 bg-inherit px-3 py-2.5 text-left transition-colors",
                        isActive && "bg-accent",
                        index === 0 && "rounded-t-md",
                        index === chapters.length - 1 && "rounded-b-md",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {isActive ? (
                          <PlayIcon
                            className="size-3 transition-none"
                            fill="currentColor"
                          />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium transition-colors",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          {chapter.title}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {chapter.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

const getActiveChapter = (
  chapters: ReadonlyArray<PodcastChapter>,
  state: EmbedState,
): PodcastChapter | undefined => {
  // When the embed is inactive the first chapter is the "active" one
  if (state._tag !== "Active") {
    return chapters[0]
  }

  const currentTimeSeconds = getPlaybackTimeSeconds(state.playback)

  // If the current playback time is not defined, the video has not started
  // so again the first chapter is the "active" one - this is mostly a defensive
  // check, as an active embed state should always have a current playback time
  if (!currentTimeSeconds) {
    return chapters[0]
  }

  // The "active" chapter is the last chapter where the chapter start time
  // is less than or equal to the current time
  const activeChapter = chapters.findLast((chapter) => {
    return chapter.startTimeSeconds <= currentTimeSeconds
  })

  return activeChapter ?? chapters[0]
}
