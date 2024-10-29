import * as Effect from "effect/Effect"
import { Rx } from "@effect-rx/rx-react"
import { Span } from "../domain/devtools"
import { DevTools } from "../services/devtools"

export interface RxDevTools extends Rx.Rx.InferSuccess<typeof devToolsRx> { }

const devToolsRuntime = Rx.runtime(DevTools.Default)

export const devToolsRx = devToolsRuntime.rx(
  Effect.gen(function*() {
    const devTools = yield* DevTools

    const rootSpansRx = Rx.subscriptionRef(devTools.rootSpans)
    const selectedSpanIndexRx = Rx.make(0)
    const selectedSpanRx = Rx.writable(
      (get): Span | undefined => {
        const rootSpans = get(rootSpansRx)
        const index = get(selectedSpanIndexRx)
        return rootSpans[index]
      },
      (ctx, index: number) => ctx.set(selectedSpanIndexRx, index)
    )

    return {
      rootSpans: rootSpansRx,
      selectedSpan: selectedSpanRx,
      selectedSpanIndex: selectedSpanIndexRx
    }
  })
)

