import { Effect } from "effect"
import { Rx } from "@effect-rx/rx-react"
import { Span } from "../domain/devtools"
import { TraceProvider } from "../services/TraceProvider"

const devToolsRuntime = Rx.runtime(TraceProvider.Live)

export const devToolsRx = devToolsRuntime.rx(
  Effect.gen(function* () {
    const { rootSpans } = yield* TraceProvider

    const rootSpansRx = Rx.subscriptionRef(rootSpans)
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

export interface RxDevTools extends Rx.Rx.InferSuccess<typeof devToolsRx> {}
