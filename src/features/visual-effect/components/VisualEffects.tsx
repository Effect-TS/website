import { useAtomMount, useAtomSet } from "@effect/atom-react"
import { useCallback, useState } from "react"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import { type ExampleCategory, EXAMPLES_CATALOG } from "@/features/visual-effect/catalog"
import { useDragScroll } from "@/features/visual-effect/hooks/useDragScroll"
import { useScrollRightFade } from "@/features/visual-effect/hooks/useScrollRightFade"
import {
  prefersReducedMotionAtom,
  resetExampleSilentlyAtom,
  stopAllSoundAtom,
} from "@/features/visual-effect/state/atoms"
import { VisualEffect } from "./VisualEffect"

const ORDERED_CATEGORIES: ReadonlyArray<ExampleCategory> = [
  "concurrency",
  "schedule",
  "error-handling",
  "constructors",
  "scope",
]

export default function VisualEffects() {
  useAtomMount(prefersReducedMotionAtom)

  const [category, setCategory] = useState<ExampleCategory>(ORDERED_CATEGORIES[0]!)
  const resetExampleSilently = useAtomSet(resetExampleSilentlyAtom)
  const stopAllSounds = useAtomSet(stopAllSoundAtom)

  const reset = useCallback(() => {
    for (const entry of Object.values(EXAMPLES_CATALOG)) {
      for (const example of entry.examples) {
        resetExampleSilently(example)
      }
    }
    stopAllSounds(void 0)
  }, [resetExampleSilently, stopAllSounds])

  const drag = useDragScroll<HTMLDivElement>()
  const scrollFade = useScrollRightFade(drag.ref, [category])

  return (
    <div className="border-r border-zinc-800 shadow-2xl shadow-black/20">
      <div className="relative">
        <div
          ref={drag.ref}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onClickCapture={drag.onClickCapture}
          onScroll={scrollFade.onScroll}
          className="scrollbar-hide flex overflow-x-auto overscroll-x-contain bg-zinc-950/90 select-none"
        >
          {ORDERED_CATEGORIES.map((cat) => {
            const entry = EXAMPLES_CATALOG[cat]
            const active = cat === category
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  reset()
                  setCategory(cat)
                }}
                className={`min-w-fit flex-1 shrink-0 cursor-pointer px-4 py-3 font-mono text-sm tracking-wide whitespace-nowrap uppercase transition-colors md:px-6 md:text-base ${
                  active ? "bg-zinc-900 font-medium text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {entry.label}
              </button>
            )
          })}
        </div>
        {scrollFade.canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-zinc-950/90 to-transparent" />
        )}
      </div>

      <div className="w-full">
        <SubTabs
          key={category}
          examples={EXAMPLES_CATALOG[category].examples}
          onTabChange={reset}
        />
      </div>
    </div>
  )
}

function SubTabs({
  examples,
  onTabChange,
}: {
  readonly examples: ReadonlyArray<ExampleDefinition>
  readonly onTabChange: () => void
}) {
  const [activeKey, setActiveKey] = useState<string>(examples[0]?.key ?? "")
  const drag = useDragScroll<HTMLDivElement>()
  const scrollFade = useScrollRightFade(drag.ref, [examples])

  if (examples.length === 0) return null

  const activeExample = examples.find((e) => e.key === activeKey) ?? examples[0]!

  return (
    <div className="flex flex-col">
      <div className="relative">
        <div
          ref={drag.ref}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onClickCapture={drag.onClickCapture}
          onScroll={scrollFade.onScroll}
          className="scrollbar-hide flex items-center overflow-x-auto overscroll-x-contain border-y border-zinc-800 bg-zinc-950 select-none"
        >
          {examples.map((example) => {
            const isActive = example.key === activeKey
            return (
              <button
                key={example.key}
                type="button"
                onClick={() => {
                  onTabChange()
                  setActiveKey(example.key)
                }}
                className={`min-w-fit flex-1 shrink-0 cursor-pointer px-3 py-2 font-mono text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <span>{example.title}</span>
                {example.subtitle && (
                  <span className="ml-1 text-zinc-400">({example.subtitle})</span>
                )}
              </button>
            )
          })}
        </div>
        {scrollFade.canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-zinc-950 to-transparent" />
        )}
      </div>

      <div className="overflow-x-auto p-3 lg:p-4">
        <VisualEffect example={activeExample} />
      </div>
    </div>
  )
}
