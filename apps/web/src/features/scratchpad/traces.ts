/**
 * Traces: the spans the running program reports, for the bottom panel's
 * Traces tab (playground-parity ticket 07).
 *
 * The seed's `src/DevTools.ts` provides `DevTools.layerSocket` on
 * `DEV_TOOLS_PORT`, so its spans need no setup. A proxy in the Container
 * accepts that connection and prints what the program sends, one JSON
 * request per line, and this module decodes the lines into the shared trace
 * store (`features/devtools/traces.ts`). A new Run's traces replace the
 * previous Run's (see `followTraces`).
 */
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import type { Span } from "@/features/devtools/span"
import {
  applyDevToolsRequest,
  type DevToolsRequest,
  parseDevToolsLine,
  recordDevToolsRequest,
  replaceTraces,
  supersedeTraces,
  type TraceAtoms,
} from "@/features/devtools/traces"
import { Container, type ContainerService } from "./container.ts"
import { Terminal } from "./terminal.ts"

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
  /** The program's devtools requests. */
  readonly requests: Stream.Stream<DevToolsRequest>
  /** The latest Run's id, then every change. A new id supersedes the traces. */
  readonly runIds: Stream.Stream<number | undefined>
  readonly registry: AtomRegistry.AtomRegistry
  readonly atoms: TraceAtoms
  /** How long a new Run's first trace may run before it is shown live. */
  readonly holdFor?: Duration.Input | undefined
}

/** A new Run's traces, gathered before they are shown. */
interface Held {
  roots: ReadonlyArray<Span>
  timing: boolean
}

/**
 * Fills `atoms` from the program's spans until the scope closes.
 *
 * A new Run's traces replace the previous Run's (shown dimmed meanwhile)
 * once its first trace has ended, or has run for `holdFor` (a second): a
 * quick trace then appears once, complete, instead of rescaling through
 * several shapes as its spans arrive in the first milliseconds.
 */
export const followTraces = (
  options: FollowTracesOptions,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { atoms, registry } = options
    const holdFor = options.holdFor ?? "1 second"
    let held: Held | undefined

    const show = (hold: Held) => {
      if (held !== hold) return
      held = undefined
      replaceTraces(registry, atoms, hold.roots)
    }

    yield* options.runIds.pipe(
      Stream.filter((id): id is number => id !== undefined),
      Stream.changes,
      Stream.runForEach(() =>
        Effect.sync(() => {
          held = { roots: [], timing: false }
          supersedeTraces(registry, atoms)
        }),
      ),
      Effect.forkScoped,
    )
    yield* options.requests.pipe(
      Stream.runForEach((request) =>
        Effect.suspend(() => {
          const hold = held
          if (hold === undefined) {
            recordDevToolsRequest(registry, atoms, request)
            return Effect.void
          }
          hold.roots = applyDevToolsRequest(hold.roots, request)
          if (hold.roots.some((root) => Option.isSome(root.endTime))) {
            show(hold)
            return Effect.void
          }
          if (hold.timing || hold.roots.length === 0) return Effect.void
          hold.timing = true
          return Effect.sleep(holdFor).pipe(
            Effect.andThen(Effect.sync(() => show(hold))),
            Effect.forkScoped,
            Effect.asVoid,
          )
        }),
      ),
      Effect.repeat(Schedule.spaced("1 second")),
      Effect.forkScoped,
    )
  })

/**
 * Follows the Container's traces into `atoms` for the layer's lifetime.
 * Without a Container it does nothing; without a Terminal (whose runner
 * reports each Run) the traces are never replaced.
 */
export const layerTraces = (
  atoms: TraceAtoms,
): Layer.Layer<never, never, AtomRegistry.AtomRegistry> =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const container = yield* Effect.serviceOption(Container)
      if (Option.isNone(container)) return
      const terminal = yield* Effect.serviceOption(Terminal)
      yield* followTraces({
        requests: devToolsRequests(container.value),
        registry: yield* AtomRegistry.AtomRegistry,
        atoms,
        runIds: Option.match(terminal, {
          onNone: () => Stream.empty,
          onSome: (terminal) =>
            terminal.stateChanges.pipe(Stream.map((state) => state.run?.id)),
        }),
      })
    }),
  )
