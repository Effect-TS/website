import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import {
  makeTraceAtoms,
  recordDevToolsRequest,
} from "@/features/devtools/traces"
import { WebContainer } from "./webcontainer"

/** The Playground's trace viewer state. */
export const playgroundTraceAtoms = makeTraceAtoms()

export const DevToolsLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const registry = yield* AtomRegistry.AtomRegistry
    const container = yield* WebContainer

    yield* container.devTools.pipe(
      Stream.runForEach((request) =>
        Effect.sync(() =>
          recordDevToolsRequest(registry, playgroundTraceAtoms, request),
        ),
      ),
      Effect.forkDetach,
    )
  }),
).pipe(Layer.provide(WebContainer.layer))
