import {
  File,
  makeDirectory,
  Workspace,
  WorkspaceShell
} from "@/workspaces/domain/workspace"
import { Result, Rx } from "@effect-rx/rx-react"
import { Clipboard } from "@effect/platform-browser"
import { Effect, Layer } from "effect"
import { editorRx } from "@/components/editor/rx"
import { hashRx } from "@/rx/location"
import { pipe } from "effect"
import { RxWorkspaceHandle } from "@/workspaces/rx/workspace"
import { WorkspaceCompression } from "./services/WorkspaceCompression"
import packageJson from "../../../snapshots/tutorials/package.json"
import { rpcClient } from "@/rpc/client"
import { RetrieveRequest, ShortenRequest } from "@/services/Shorten/domain"
import { devToolsLayer } from "@/tutorials/common"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareRx = Rx.family((handle: RxWorkspaceHandle) =>
  runtime.fn((_: void, get) =>
    Effect.gen(function* () {
      const compression = yield* WorkspaceCompression
      const workspace = get.once(handle.workspace)
      const editor = yield* Result.toExit(
        get.once(editorRx(handle).editor)
      ).pipe(Effect.orDie)

      yield* editor.save

      const compressed = yield* compression.compress(
        workspace,
        handle.handle.read
      )
      const hash = yield* rpcClient(new ShortenRequest({ text: compressed }))
      const url = new URL(location.href)
      url.hash = hash
      return url.toString()
    }).pipe(Effect.tapErrorCause(Effect.logError))
  )
)

const defaultWorkspace = new Workspace({
  name: "playground",
  dependencies: packageJson.dependencies,
  prepare:
    "npm install -E typescript@next tsc-watch @types/node @effect/experimental",
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  initialFilePath: "src/main.ts",
  snapshot: "tutorials",
  tree: [
    // TODO: Revert this back to the old program
    makeDirectory("src", [
      new File({
        name: "main.ts",
        initialContent: `import { Effect } from "effect"
import { NodeRuntime } from "@effect/platform-node"
import { DevToolsLive } from "./DevTools"

const program = Effect.gen(function* () {
  yield* Effect.log("Welcome to the Effect Playground!").pipe(
    Effect.withSpan("leaf: depth 3"),
    Effect.withSpan("node: depth 2")
  )
  yield* Effect.void.pipe(Effect.withSpan("leaf: depth 2"))
}).pipe(
  Effect.withSpan("node: depth 1"),
  Effect.withSpan("root", { attributes: { source: "Playground" } })
)

program.pipe(
  Effect.provide(DevToolsLive),
  NodeRuntime.runMain
)
`
      }),
      devToolsLayer
    ])
  ]
})

const makeDefaultWorkspace = () =>
  defaultWorkspace.withName(`playground-${Date.now()}`)

export const importRx = runtime.rx((get) =>
  Effect.gen(function* () {
    const hash = get(hashRx)
    if (hash._tag === "None") return makeDefaultWorkspace()
    const compressed = yield* rpcClient(
      new RetrieveRequest({ hash: hash.value })
    )
    if (compressed._tag === "None") return makeDefaultWorkspace()
    const compression = yield* WorkspaceCompression
    return yield* pipe(
      compression.decompress(compressed.value),
      Effect.orElseSucceed(makeDefaultWorkspace)
    )
  })
)
