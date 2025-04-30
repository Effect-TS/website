import { Rx } from "@effect-rx/rx-react"
import { Span } from "../domain/devtools"
import { DevToolsLayer, rootSpansRx } from "../services/devtools"

export interface RxDevTools extends Rx.Rx.InferSuccess<typeof devToolsRx> {}

export const devToolsRx = Rx.runtime(DevToolsLayer)

export const selectedSpanIndexRx = Rx.make(0)

export const selectedSpanRx = Rx.writable(
  (get): Span | undefined => {
    const rootSpans = get(rootSpansRx)
    const index = get(selectedSpanIndexRx)
    return rootSpans[index]
  },
  (ctx, index: number) => ctx.set(selectedSpanIndexRx, index)
)
