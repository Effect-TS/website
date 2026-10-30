import type { ReactNode } from "react"
import type { OutlineChapter } from "../model"
import { LessonHeader } from "./LessonHeader"
import { LoaderCard } from "./LessonLoader"

interface Props {
  readonly outline: ReadonlyArray<OutlineChapter>
  readonly slug: string
  readonly children: ReactNode
}

const noop = () => {}

/**
 * Server-rendered twin of `TutorialApp`: same header and columns, real prose,
 * and the loader card. It shows until React takes over, so nothing jumps.
 */
export function TutorialShell({ outline, slug, children }: Props) {
  const order = outline.flatMap((chapter) =>
    chapter.lessons.map((lesson) => lesson.slug),
  )
  return (
    <div className="flex h-full flex-col">
      <LessonHeader
        outline={outline}
        order={order}
        slug={slug}
        completed={[]}
        isOpen={() => false}
        onOpen={noop}
        onReset={noop}
        onSolve={noop}
        editable={false}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 overflow-y-auto px-6 py-8 lg:w-[40%] lg:px-8">
          <article className="prose prose-effect max-w-none">
            {children}
          </article>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center border-t border-border bg-zinc-50 p-4 lg:border-t-0 lg:border-l dark:bg-zinc-950">
          <LoaderCard done={0} />
        </div>
      </div>
    </div>
  )
}
