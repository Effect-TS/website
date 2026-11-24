/**
 * Traces: the spans the running program reports, for the bottom panel's
 * Traces tab (playground-parity ticket 07).
 *
 * The seed's `src/DevTools.ts` provides `DevTools.layerSocket` on
 * `DEV_TOOLS_PORT`, so its spans need no setup. A proxy in the Container
 * accepts that connection and prints what the program sends, one JSON
 * request per line, and this module decodes the lines into the shared trace
 * store (`features/devtools/traces.ts`). The store resets when a new Run
 * starts.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import {
  type DevToolsRequest,
  parseDevToolsLine,
  recordDevToolsRequest,
  resetTraces,
  type TraceAtoms,
} from "@/features/devtools/traces"
import { Container, type ContainerService } from "./container.ts"
import { Runs } from "./runs.ts"

/** The devtools TCP port Effect's `DevTools.layerSocket` connects to. */
export const DEV_TOOLS_PORT = 34437

export const DEV_TOOLS_PROXY_NAME = "dev-tools-proxy.cjs"

/**
 * Accepts devtools connections and prints what they send. Each connection
 * is buffered to whole lines, so a Run killed mid-write, or two programs at
 * once, never tear a line.
 */
export const DEV_TOOLS_PROXY_SCRIPT = `const Net = require("node:net")

const server = Net.createServer((socket) => {
  let pending = ""
  socket.setEncoding("utf8")
  socket.on("data", (chunk) => {
    pending += chunk
    const end = pending.lastIndexOf("\\n")
    if (end === -1) return
    process.stdout.write(pending.slice(0, end + 1))
    pending = pending.slice(end + 1)
  })
  socket.on("error", () => {})
})
process.stdout.on("error", () => {})
server.on("error", () => {})

server.listen(${DEV_TOOLS_PORT})
`

/**
 * Starts the proxy once the Container has booted and emits the programs'
 * devtools requests. The proxy runs for as long as the stream is read.
 */
export const devToolsRequests = (
  container: ContainerService,
): Stream.Stream<DevToolsRequest> =>
  Stream.unwrap(
    Effect.gen(function* () {
      // Waits through a failed boot until a retry succeeds.
      yield* container.phaseChanges.pipe(
        Stream.filter((phase) => phase._tag === "ready"),
        Stream.take(1),
        Stream.runDrain,
      )
      yield* container.writeHostDirFile(
        DEV_TOOLS_PROXY_NAME,
        DEV_TOOLS_PROXY_SCRIPT,
      )
      const process = yield* container.spawn({
        command: "node",
        args: [container.hostDirPath(DEV_TOOLS_PROXY_NAME)],
      })
      return process.output
    }),
  ).pipe(
    Stream.splitLines,
    Stream.map(parseDevToolsLine),
    Stream.filter(Option.isSome),
    Stream.map((request) => request.value),
    Stream.catchCause((cause) =>
      Stream.fromEffect(
        Effect.logWarning("Container devtools proxy", cause),
      ).pipe(Stream.drain),
    ),
  )

export interface FollowTracesOptions {
  readonly container: ContainerService
  /** The latest Run's id, then every change. A new id resets the traces. */
  readonly runIds: Stream.Stream<number | undefined>
  readonly registry: AtomRegistry.AtomRegistry
  readonly atoms: TraceAtoms
}

/**
 * Fills `atoms` from the program's spans until the scope closes, and resets
 * them when a new Run starts. A proxy that exits is started again.
 */
export const followTraces = (
  options: FollowTracesOptions,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { atoms, registry } = options
    yield* options.runIds.pipe(
      Stream.filter((id): id is number => id !== undefined),
      Stream.changes,
      Stream.runForEach(() => Effect.sync(() => resetTraces(registry, atoms))),
      Effect.forkScoped,
    )
    yield* devToolsRequests(options.container).pipe(
      Stream.runForEach((request) =>
        Effect.sync(() => recordDevToolsRequest(registry, atoms, request)),
      ),
      Effect.repeat(Schedule.spaced("1 second")),
      Effect.forkScoped,
    )
  })

/**
 * Follows the Container's traces into `atoms` for the layer's lifetime.
 * Without a Container it does nothing; without Runs the traces never reset.
 */
export const layerTraces = (
  atoms: TraceAtoms,
): Layer.Layer<never, never, AtomRegistry.AtomRegistry> =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const container = yield* Effect.serviceOption(Container)
      if (Option.isNone(container)) return
      const runs = yield* Effect.serviceOption(Runs)
      yield* followTraces({
        container: container.value,
        registry: yield* AtomRegistry.AtomRegistry,
        atoms,
        runIds: Option.match(runs, {
          onNone: () => Stream.empty,
          onSome: (runs) =>
            runs.stateChanges.pipe(Stream.map((state) => state.run?.id)),
        }),
      })
    }),
  )
