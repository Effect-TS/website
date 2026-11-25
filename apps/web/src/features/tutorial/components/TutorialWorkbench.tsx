import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  completedAtom,
  firstUnfinished,
  isUnlocked,
  markCompletedAtom,
} from "../atoms"
import { loadLesson, type LoadedLesson } from "../data"
import type { LessonCode, OutlineChapter } from "../model"
import { lessonHref } from "../router"
import {
  editorActionsAtom,
  navigateAtom,
  reportBootAtom,
  slugAtom,
  statusAtom,
  bootedAtom,
} from "../state"
import { LessonEditor, type EditorHandle } from "./LessonEditor"
import { LessonFooter } from "./LessonFooter"
import { LessonLoader } from "./LessonLoader"
import { Results } from "./Results"

interface Props {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly initialSlug: string
  readonly initialCode: LessonCode
}

interface Current {
  readonly slug: string
  readonly code: LessonCode
  /** `null` for the lesson whose prose the page already rendered. */
  readonly html: string | null
}

const PROSE = "[data-testid=tutorial-prose]"
const PROSE_SCROLLER = "[data-tutorial-prose]"

/**
 * The editor column: editor, goals, footer. It also keeps the statically
 * rendered prose in step with the lesson, so only this part is dynamic.
 */
export function TutorialWorkbench({
  outline,
  initialSlug,
  initialCode,
}: Props) {
  const lessons = useMemo(
    () => outline.flatMap((chapter) => chapter.lessons),
    [outline],
  )
  const order = useMemo(() => lessons.map((lesson) => lesson.slug), [lessons])
  const slug = useAtomValue(slugAtom)
  const completed = useAtomValue(completedAtom)
  const booted = useAtomValue(bootedAtom)
  const status = useAtomValue(statusAtom)
  const setStatus = useAtomSet(statusAtom)
  const setActions = useAtomSet(editorActionsAtom)
  const markCompleted = useAtomSet(markCompletedAtom)
  const reportBoot = useAtomSet(reportBootAtom)
  const navigate = useAtomSet(navigateAtom)
  const unlocked = isUnlocked(order, completed, slug)

  const [current, setCurrent] = useState<Current | null>({
    slug: initialSlug,
    code: initialCode,
    html: null,
  })
  const editor = useRef<EditorHandle>(null)

  useEffect(() => {
    if (unlocked) return
    const first = firstUnfinished(order, completed)
    if (first !== undefined) navigate({ slug: first, replace: true })
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

  useEffect(() => {
    if (lesson === null) return
    const meta = lessons.find((item) => item.slug === slug)
    const chapter = outline.find((item) =>
      item.lessons.some((entry) => entry.slug === slug),
    )
    if (meta !== undefined && chapter !== undefined) {
      document.title = `${meta.title} · ${chapter.title} · Effect Tutorial`
    }
    if (lesson.html !== null) {
      const article = document.querySelector(PROSE)
      if (article !== null) article.innerHTML = lesson.html
      document.querySelector(PROSE_SCROLLER)?.scrollTo({ top: 0 })
    }
  }, [lesson, slug, lessons, outline])

  useEffect(() => {
    if (lesson === null) {
      setActions(null)
      return
    }
    setActions({
      reset: () => editor.current?.setCode(lesson.code.main),
      solve: () => editor.current?.setCode(lesson.code.solution),
    })
    return () => setActions(null)
  }, [lesson, setActions])

  if (!unlocked) return null

  const nextSlug = order[order.indexOf(slug) + 1]
  const nextTitle = lessons.find((item) => item.slug === nextSlug)?.title
  const goals = lesson?.code.goals ?? []

  return (
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
        onBoot={reportBoot}
      />
      <div
        data-testid="tutorial-results"
        data-phase={status._tag}
        className="max-h-1/2 shrink-0 overflow-y-auto border-t border-border bg-card"
      >
        <Results status={status} goals={goals} />
      </div>
      <LessonFooter
        status={status}
        goals={goals}
        next={
          nextSlug === undefined || nextTitle === undefined
            ? null
            : {
                title: nextTitle,
                onOpen: () => navigate({ slug: nextSlug }),
              }
        }
      />
    </div>
  )
}
