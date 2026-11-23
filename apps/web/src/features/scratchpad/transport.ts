import type { Transport } from "@codemirror/lsp-client"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

/**
 * The language server failed for good and will not come back by retrying on
 * its own (the in-browser worker could not load its assets, or its server
 * could not be restarted). Retrying means starting over.
 */
export class TransportFatalError extends Data.TaggedError(
  "TransportFatalError",
)<{
  readonly message: string
}> {}

export type TransportLoadPhase = "downloading" | "compiling" | "starting"

export interface TransportRecovery {
  /** The trap, as "Name: message". */
  readonly reason: string
  readonly method: string | undefined
  readonly uri: string | undefined
  readonly ms: number
  /** Document URIs whose text crashes the server, paused until their next edit. */
  readonly quarantined: ReadonlyArray<string>
}

/** Lifecycle of the in-browser language server (`layerWorker`). */
export type TransportEvent =
  | { readonly _tag: "Connected"; readonly connectionId: number }
  | { readonly _tag: "Disconnected"; readonly error: TransportFatalError }
  | {
      readonly _tag: "Loading"
      readonly phase: TransportLoadPhase
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | { readonly _tag: "Recovered"; readonly recovery: TransportRecovery }

export interface LspTransportService {
  readonly transport: Transport
  readonly events: Stream.Stream<TransportEvent>
  readonly reconnect: Effect.Effect<void>
  readonly disconnect: Effect.Effect<void>
}

export class LspTransport extends Context.Service<
  LspTransport,
  LspTransportService
>()("@web/scratchpad/LspTransport") {}
