import * as Atom from "effect/unstable/reactivity/Atom"
import { Span } from "../domain/devtools"
import { rootSpansAtom } from "../services/devtools"

export const selectedSpanIndexAtom = Atom.make(0)

export const selectedSpanAtom = Atom.writable(
  (get): Span | undefined => {
    const rootSpans = get(rootSpansAtom)
    const index = get(selectedSpanIndexAtom)
    return rootSpans[index]
  },
  (ctx, index: number) => ctx.set(selectedSpanIndexAtom, index),
)
