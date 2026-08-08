import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Effect from "effect/Effect"
import * as Atom from "effect/unstable/reactivity/Atom"

const delayedSnippetHoverAtom = Atom.family((scopeKey: string) =>
  Atom.make<string | null>(null).pipe(
    Atom.withLabel(`snippet-hover:${scopeKey}`),
  ),
)

const snippetHoverTokenAtom = Atom.family((scopeKey: string) =>
  Atom.make(0).pipe(Atom.withLabel(`snippet-hover-token:${scopeKey}`)),
)

interface SnippetHoverUpdate {
  readonly scopeKey: string
  readonly hoveredTarget: string | null
  readonly hideDelayMilliseconds: number
}

const updateSnippetHoverAtom = Atom.fn<SnippetHoverUpdate>()(
  (input, get) =>
    Effect.gen(function* () {
      const token = get(snippetHoverTokenAtom(input.scopeKey)) + 1
      get.set(snippetHoverTokenAtom(input.scopeKey), token)

      if (input.hoveredTarget !== null) {
        get.set(delayedSnippetHoverAtom(input.scopeKey), input.hoveredTarget)
        return
      }

      yield* Effect.sleep(input.hideDelayMilliseconds)

      if (get(snippetHoverTokenAtom(input.scopeKey)) !== token) {
        return
      }

      get.set(delayedSnippetHoverAtom(input.scopeKey), null)
    }),
  { concurrent: true },
)

export const useSnippetHoverState = (
  scopeKey: string,
  hideDelayMilliseconds: number,
): {
  readonly delayedTarget: string | null
  readonly onHoverTargetChange: (target: string | null) => void
} => {
  const delayedTarget = useAtomValue(delayedSnippetHoverAtom(scopeKey))
  const updateSnippetHover = useAtomSet(updateSnippetHoverAtom)

  return {
    delayedTarget,
    onHoverTargetChange(target) {
      updateSnippetHover({
        scopeKey,
        hoveredTarget: target,
        hideDelayMilliseconds,
      })
    },
  }
}
