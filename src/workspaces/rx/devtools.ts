import { Effect } from "effect"
import { Rx, RxRef } from "@effect-rx/rx-react"
import { SpanNode, TraceProvider } from "../services/TraceProvider"

const devToolsRuntime = Rx.runtime(TraceProvider.Live)

const EMPTY_REF = RxRef.make(undefined)

export const devToolsRx = devToolsRuntime.rx(
  Effect.gen(function* () {
    const { rootSpans, getSpanChildren } = yield* TraceProvider

    const rootSpansRx = Rx.subscriptionRef(rootSpans)
    const selectedSpanIndexRx = Rx.make(0)
    const selectedSpanRx = Rx.writable(
      (get): RxRef.RxRef<SpanNode> | RxRef.RxRef<undefined> => {
        const rootSpans = get(rootSpansRx)
        const index = get(selectedSpanIndexRx)
        return rootSpans[index] ?? EMPTY_REF
      },
      (ctx, index: number) => ctx.set(selectedSpanIndexRx, index)
    )

    return {
      rootSpans: rootSpansRx,
      selectedSpan: selectedSpanRx,
      selectedSpanIndex: selectedSpanIndexRx,
      getSpanChildren
    }
  })
)

export interface RxDevTools extends Rx.Rx.InferSuccess<typeof devToolsRx> {}
