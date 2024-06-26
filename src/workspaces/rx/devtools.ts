import { Effect } from "effect"
import { Rx } from "@effect-rx/rx-react"
import { TraceProvider } from "../services/TraceProvider"

const devToolsRuntime = Rx.runtime(TraceProvider.Live)

export const devToolsRx = devToolsRuntime.rx(
  Effect.gen(function* () {
    const { traces, getSpanChildren } = yield* TraceProvider

    return {
      traces: Rx.subscriptionRef(traces),
      selectedTrace: Rx.make(0),
      getSpanChildren
    }
  })
)
