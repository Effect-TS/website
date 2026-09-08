import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"
import * as Atom from "effect/unstable/reactivity/Atom"
import { ChevronDownIcon } from "lucide-react"
import * as React from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/Button"
import {
  EmbedCommand,
  EmbedState,
  getPlaybackTimeSeconds,
  useEmbedManager,
} from "@/features/youtube-embed"
import { cn } from "@/lib/utils"
import type { PodcastTranscriptCue, TranscriptFollowMode } from "../domain"
import { usePodcastEpisode } from "../context"

const AUTO_SCROLL_SETTLE_WINDOW_MS = 120

const isDesktopViewportAtom = Atom.make((get) => {
  if (typeof window === "undefined") {
    return
  }

  const mediaQuery = window.matchMedia("(min-width: 1024px)")
  const syncDesktop = () => {
    get.setSelf(mediaQuery.matches)
  }

  mediaQuery.addEventListener("change", syncDesktop)
  get.addFinalizer(() => mediaQuery.removeEventListener("change", syncDesktop))

  return mediaQuery.matches
})

export function PodcastTranscript() {
  const { transcript } = usePodcastEpisode()
  const embedManager = useEmbedManager()

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const cueElementMapRef = React.useRef(new Map<string, HTMLButtonElement>())
  const suppressScrollEventRef = React.useRef(false)
  const scrollSettleFrameRef = React.useRef<number | undefined>(undefined)
  const [isOpen, setIsOpen] = React.useState(true)
  const [autoFollowMode, setAutoFollowMode] =
    React.useState<TranscriptFollowMode>("auto")

  const { activeTranscriptCueAtom, setActiveTranscriptCueAtom } =
    React.useMemo(() => {
      const transcriptCueAtomReadonly = Atom.readable((get) => {
        const state = get(embedManager.stateAtom)
        return getActiveTranscriptCue(transcript, state)
      })

      const activeTranscriptCueAtom = Atom.optimistic(transcriptCueAtomReadonly)

      const setActiveTranscriptCueAtom = Atom.optimisticFn(
        activeTranscriptCueAtom,
        {
          reducer: (_, update) => update,
          fn: Atom.fn<PodcastTranscriptCue>()(
            Effect.fnUntraced(function* (cue, get) {
              get.set(embedManager.previewAtom, false)

              const command = new EmbedCommand.cases.seekTo({
                args: [cue.startTimeSeconds, true],
              })
              get.set(embedManager.stateAtom, command)

              yield* Effect.sync(() => get(transcriptCueAtomReadonly)).pipe(
                Effect.filterOrFail(
                  (actualCue) => actualCue?.id === cue.id,
                  () => "unconfirmed_update" as const,
                ),
                Effect.retry({
                  while: (error) => error === "unconfirmed_update",
                  schedule: Schedule.spaced("100 millis"),
                }),
                Effect.ignore,
              )
            }),
          ),
        },
      )

      return {
        activeTranscriptCueAtom,
        setActiveTranscriptCueAtom,
      } as const
    }, [transcript, embedManager])

  const activeTranscriptCue = useAtomValue(activeTranscriptCueAtom)
  const setActiveTranscriptCue = useAtomSet(setActiveTranscriptCueAtom)
  const isDesktopViewport = useAtomValue(isDesktopViewportAtom)

  const activeCueId = activeTranscriptCue?.id ?? transcript[0]?.id
  const shouldAutoFollow = isDesktopViewport && autoFollowMode === "auto"

  const pauseAutoFollow = React.useCallback(() => {
    setAutoFollowMode("paused-by-user")
  }, [])

  const resumeAutoFollow = React.useCallback(() => {
    setAutoFollowMode("auto")
  }, [])

  const clearScrollSettleFrame = React.useCallback(() => {
    if (scrollSettleFrameRef.current !== undefined) {
      window.cancelAnimationFrame(scrollSettleFrameRef.current)
      scrollSettleFrameRef.current = undefined
    }
  }, [])

  const waitForScrollToSettle = React.useCallback(
    (viewport: HTMLElement) => {
      clearScrollSettleFrame()

      let lastTop = viewport.scrollTop
      let stableSince = window.performance.now()

      const check = () => {
        const now = window.performance.now()
        const nextTop = viewport.scrollTop

        if (Math.abs(nextTop - lastTop) > 1) {
          lastTop = nextTop
          stableSince = now
        }

        if (now - stableSince >= AUTO_SCROLL_SETTLE_WINDOW_MS) {
          suppressScrollEventRef.current = false
          scrollSettleFrameRef.current = undefined
          return
        }

        scrollSettleFrameRef.current = window.requestAnimationFrame(check)
      }

      scrollSettleFrameRef.current = window.requestAnimationFrame(check)
    },
    [clearScrollSettleFrame],
  )

  const handleSeek = React.useCallback(
    (cue: PodcastTranscriptCue) => {
      setActiveTranscriptCue(cue)
    },
    [setActiveTranscriptCue],
  )

  const setCueElement = React.useCallback(
    (cueId: string, element: HTMLButtonElement | null) => {
      if (element) {
        cueElementMapRef.current.set(cueId, element)
      } else {
        cueElementMapRef.current.delete(cueId)
      }
    },
    [],
  )

  React.useEffect(() => {
    return () => {
      clearScrollSettleFrame()
    }
  }, [clearScrollSettleFrame])

  React.useEffect(() => {
    const root = rootRef.current

    if (root === null) {
      return
    }

    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]')

    if (!(viewport instanceof HTMLElement)) {
      return
    }

    const handleScroll = () => {
      if (suppressScrollEventRef.current) {
        return
      }
      pauseAutoFollow()
    }

    viewport.addEventListener("scroll", handleScroll, { passive: true })

    return () => viewport.removeEventListener("scroll", handleScroll)
  }, [isOpen, pauseAutoFollow])

  React.useEffect(() => {
    if (
      !isOpen ||
      !shouldAutoFollow ||
      activeCueId === undefined ||
      typeof window === "undefined"
    ) {
      return
    }

    const element = cueElementMapRef.current.get(activeCueId)
    const root = rootRef.current

    if (!element || !root) {
      return
    }

    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]')

    if (!(viewport instanceof HTMLElement)) {
      return
    }

    suppressScrollEventRef.current = true

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const viewportRect = viewport.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const elementTop = elementRect.top - viewportRect.top + viewport.scrollTop
    const targetTop = Math.max(
      0,
      elementTop - viewport.clientHeight / 2 + elementRect.height / 2,
    )

    viewport.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })

    if (prefersReducedMotion || Math.abs(viewport.scrollTop - targetTop) <= 1) {
      suppressScrollEventRef.current = false
    } else {
      waitForScrollToSettle(viewport)
    }

    return () => {
      clearScrollSettleFrame()
      suppressScrollEventRef.current = false
    }
  }, [
    activeCueId,
    clearScrollSettleFrame,
    isOpen,
    shouldAutoFollow,
    waitForScrollToSettle,
  ])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-card rounded-lg border border-zinc-700 lg:flex lg:min-h-0 lg:flex-col lg:data-open:flex-1"
    >
      <CollapsibleTrigger className="bg-card hover:bg-accent/50 flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition-colors data-panel-open:rounded-b-none lg:shrink-0">
        <h2 className="text-sm font-semibold">Transcript</h2>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div
          ref={rootRef}
          className="bg-card border-t border-zinc-700 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
        >
          <Button
            variant="ghost"
            size="sm"
            className="m-2 hidden self-start lg:inline-flex"
            aria-pressed={autoFollowMode === "auto"}
            onClick={
              autoFollowMode === "auto" ? pauseAutoFollow : resumeAutoFollow
            }
          >
            Follow playback
          </Button>
          <ScrollArea
            onFocusCapture={pauseAutoFollow}
            className="h-80 p-2 lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1"
          >
            <ul className="space-y-1 pr-2">
              {transcript.map((cue) => {
                const isActive = cue === activeTranscriptCue

                return (
                  <li
                    key={cue.id}
                    className="list-none [content-visibility:auto] [contain-intrinsic-size:auto_44px]"
                  >
                    <button
                      ref={(element) => setCueElement(cue.id, element)}
                      type="button"
                      onClick={() => handleSeek(cue)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group hover:bg-accent/50 flex w-full cursor-pointer items-baseline gap-4 rounded-md bg-inherit px-3 py-2.5 text-left",
                        isActive && "bg-accent",
                      )}
                    >
                      <code className="shrink-0 font-mono text-xs leading-relaxed text-muted-foreground">
                        <span className="sr-only">Jump to </span>
                        {cue.label}
                      </code>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm leading-relaxed text-zinc-300",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {cue.text}
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

const getActiveTranscriptCue = (
  transcript: ReadonlyArray<PodcastTranscriptCue>,
  state: EmbedState,
): PodcastTranscriptCue | undefined => {
  // When the embed is inactive the first cue is the "active" one
  if (state._tag !== "Active") {
    return transcript[0]
  }

  const currentTimeSeconds = getPlaybackTimeSeconds(state.playback)

  // If the current playback time is not defined, the video has not started
  // so again the first cue is the "active" one - this is mostly a defensive
  // check, as an active embed state should always have a current playback time
  if (!currentTimeSeconds) {
    return transcript[0]
  }

  // The "active" cue is the cue where the current playback time falls within
  // the bounds of the cue
  const activeCue = transcript.find((cue) => {
    return (
      cue.startTimeSeconds <= currentTimeSeconds &&
      currentTimeSeconds < cue.endTimeSeconds
    )
  })

  if (activeCue !== undefined) {
    return activeCue
  }

  return (
    transcript.findLast((cue) => cue.startTimeSeconds <= currentTimeSeconds) ??
    transcript[0]
  )
}
