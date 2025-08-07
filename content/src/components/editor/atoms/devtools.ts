import { Atom } from "@effect-atom/atom-react"
import { Span } from "../domain/devtools"
import { DevToolsLayer, rootSpansAtom } from "../services/devtools"

export interface AtomDevTools extends Atom.Success<typeof devToolsAtom> {}

export const devToolsAtom = Atom.runtime(DevToolsLayer)

export const selectedSpanIndexAtom = Atom.make(0)

export const selectedSpanAtom = Atom.writable(
  (get): Span | undefined => {
    const rootSpans = get(rootSpansAtom)
    const index = get(selectedSpanIndexAtom)
    return rootSpans[index]
  },
  (ctx, index: number) => ctx.set(selectedSpanIndexAtom, index)
)
