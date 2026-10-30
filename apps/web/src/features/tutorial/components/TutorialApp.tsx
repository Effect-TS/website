import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useDefaultLayout } from "react-resizable-panels"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  completedAtom,
  firstUnfinished,
  isUnlocked,
  markCompletedAtom,
} from "../atoms"
import { loadLesson, type LoadedLesson } from "../data"
import type { LessonCode, OutlineChapter } from "../model"
import { lessonHref, useLessonRoute } from "../router"
import { LessonEditor, type EditorHandle } from "./LessonEditor"
import { LessonFooter } from "./LessonFooter"
import { LessonHeader } from "./LessonHeader"
import { LessonLoader } from "./LessonLoader"
import { Results, type Status } from "./Results"

interface Props {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly initialSlug: string
  readonly initialCode: LessonCode
  readonly children: ReactNode
}

interface Current {
  readonly slug: string
  readonly code: LessonCode
  /** `null` while the prose is the server-rendered `children`. */
  readonly html: string | null
}

const useIsWide = () => {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)")
    const update = () => setWide(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return wide
}

export function TutorialApp({
  outline,
  initialSlug,
  initialCode,
  children,
}: Props) {
  const lessons = useMemo(
    () => outline.flatMap((chapter) => chapter.lessons),
    [outline],
  )
  const order = useMemo(() => lessons.map((lesson) => lesson.slug), [lessons])
  const completed = useAtomValue(completedAtom)
  const markCompleted = useAtomSet(markCompletedAtom)
  const { slug, navigate } = useLessonRoute(initialSlug)
  const unlocked = isUnlocked(order, completed, slug)

  const [current, setCurrent] = useState<Current | null>({
    slug: initialSlug,
    code: initialCode,
    html: null,
  })
  const [status, setStatus] = useState<Status>({ _tag: "Loading" })
  const [booted, setBooted] = useState(0)
  const editor = useRef<EditorHandle>(null)
  const prose = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (unlocked) return
    const first = firstUnfinished(order, completed)
    if (first !== undefined) navigate(first, { replace: true })
  }, [unlocked, order, completed, navigate])

  useEffect(() => {
    if (!unlocked || current?.slug === slug) return
    let cancelled = false
    loadLesson(slug).then(
      (loaded: LoadedLesson) => {
        if (!cancelled) setCurrent({ slug, ...loaded })
      },
      () => {
        if (!cancelled) window.location.assign(lessonHref(slug))
      },
    )
    return () => {
      cancelled = true
    }
  }, [slug, unlocked, current?.slug])

  useEffect(() => {
    const index = order.indexOf(slug)
    for (const neighbour of [order[index - 1], order[index + 1]]) {
      if (neighbour !== undefined) void loadLesson(neighbour).catch(() => {})
    }
  }, [order, slug])

  const lesson = current?.slug === slug ? current : null
  const chapterTitle = outline.find((chapter) =>
    chapter.lessons.some((item) => item.slug === slug),
  )?.title

  useEffect(() => {
    const title = lessons.find((item) => item.slug === slug)?.title
    if (title !== undefined) {
      document.title = `${title} · ${chapterTitle} · Effect Tutorial`
    }
    prose.current?.scrollTo({ top: 0 })
  }, [slug, lessons, chapterTitle])

  const wide = useIsWide()
  const layout = useDefaultLayout({
    id: "tutorial-horizontal",
    storage: globalThis.localStorage,
  })

  if (!unlocked) return null

  const nextSlug = order[order.indexOf(slug) + 1]
  const nextTitle = lessons.find((item) => item.slug === nextSlug)?.title

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <LessonHeader
          outline={outline}
          order={order}
          slug={slug}
          completed={completed}
          isOpen={(target) => isUnlocked(order, completed, target)}
          onOpen={navigate}
          editable={lesson !== null}
          onReset={() => editor.current?.setCode(lesson?.code.main ?? "")}
          onSolve={() => editor.current?.setCode(lesson?.code.solution ?? "")}
        />
        <ResizablePanelGroup
          {...layout}
          orientation={wide ? "horizontal" : "vertical"}
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={40} minSize={20}>
            <div
              ref={prose}
              className="h-full overflow-y-auto px-6 py-8 lg:px-8"
            >
              {lesson === null ? (
                <p className="text-sm text-muted-foreground">Loading lesson…</p>
              ) : (
                <article
                  data-testid="tutorial-prose"
                  className="prose prose-effect max-w-none"
                  {...(lesson.html === null
                    ? { children }
                    : { dangerouslySetInnerHTML: { __html: lesson.html } })}
                />
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-zinc-200 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-500" />
          <ResizablePanel defaultSize={60} minSize={30}>
            <div
              data-testid="tutorial-editor"
              className="relative flex h-full flex-col"
            >
              <LessonLoader done={booted} />
              <LessonEditor
                slug={slug}
                lesson={lesson?.code ?? null}
                handle={editor}
                onPhase={setStatus}
                onPassed={() => markCompleted(slug)}
                onBoot={(done) => setBooted((value) => Math.max(value, done))}
              />
              <div
                data-testid="tutorial-results"
                data-phase={status._tag}
                className="max-h-1/2 shrink-0 overflow-y-auto border-t border-border bg-card"
              >
                <Results status={status} goals={lesson?.code.goals ?? []} />
              </div>
              <LessonFooter
                status={status}
                goals={lesson?.code.goals ?? []}
                next={
                  nextSlug === undefined || nextTitle === undefined
                    ? null
                    : { title: nextTitle, onOpen: () => navigate(nextSlug) }
                }
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
