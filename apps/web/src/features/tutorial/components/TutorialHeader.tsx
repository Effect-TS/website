import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useMemo } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  clearAllAtom,
  clearFromAtom,
  completedAtom,
  isUnlocked,
} from "../atoms"
import type { OutlineChapter } from "../model"
import { editorActionsAtom, navigateAtom, slugAtom } from "../state"
import { LessonHeader } from "./LessonHeader"

/** The header island: menu, arrows, breadcrumb, Reset, Solve, progress. */
export function TutorialHeader({
  outline,
}: {
  readonly outline: ReadonlyArray<OutlineChapter>
}) {
  const order = useMemo(
    () =>
      outline.flatMap((chapter) =>
        chapter.lessons.map((lesson) => lesson.slug),
      ),
    [outline],
  )
  const slug = useAtomValue(slugAtom)
  const completed = useAtomValue(completedAtom)
  const actions = useAtomValue(editorActionsAtom)
  const navigate = useAtomSet(navigateAtom)
  const clearFrom = useAtomSet(clearFromAtom)
  const clearAll = useAtomSet(clearAllAtom)

  return (
    <TooltipProvider>
      <LessonHeader
        outline={outline}
        order={order}
        slug={slug}
        completed={completed}
        isOpen={(target) => isUnlocked(order, completed, target)}
        onOpen={(target) => navigate({ slug: target })}
        editable={actions !== null}
        onReset={() => actions?.reset()}
        onSolve={() => actions?.solve()}
        onClearFrom={() => {
          clearFrom({ order, slug })
          actions?.reset()
        }}
        onClearAll={() => {
          clearAll(order)
          if (slug === order[0]) actions?.reset()
        }}
      />
    </TooltipProvider>
  )
}

const noop = () => {}

/** Server-rendered twin of the header, shown until the island hydrates. */
export function TutorialHeaderShell({
  outline,
  slug,
}: {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly slug: string
}) {
  const order = outline.flatMap((chapter) =>
    chapter.lessons.map((lesson) => lesson.slug),
  )
  return (
    <LessonHeader
      outline={outline}
      order={order}
      slug={slug}
      completed={[]}
      isOpen={() => false}
      onOpen={noop}
      onReset={noop}
      onSolve={noop}
      onClearFrom={noop}
      onClearAll={noop}
      editable={false}
    />
  )
}
