import {
  File,
  makeDirectory,
  Workspace,
  WorkspaceShell
} from "@/workspaces/domain/workspace"
import { Result, Rx } from "@effect-rx/rx-react"
import { Clipboard } from "@effect/platform-browser"
import { Effect, Layer, String } from "effect"
import { editorRx } from "@/components/editor/rx"
import { hashRx } from "@/rx/location"
import { pipe } from "effect"
import { WorkspaceHandle } from "@/workspaces/rx"
import { WorkspaceCompression } from "./services/WorkspaceCompression"
import packageJson from "../../../snapshots/tutorials/package.json"
import { rpcClient } from "@/rpc/client"
import { RetrieveRequest, ShortenRequest } from "@/services/Shorten/domain"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareRx = Rx.family((handle: WorkspaceHandle) =>
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
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.catchTags({
        CompressionError: () => Effect.fail("Failed to compress workspace"),
        ShortenError: (err) =>
          Effect.fail(
            err.reason === "TooLarge"
              ? "Workspace is too large to share"
              : "Failed to shorten URL"
          )
      })
    )
  )
)

const defaultWorkspace = new Workspace({
  name: "playground",
  dependencies: packageJson.dependencies,
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  initialFilePath: "src/main.ts",
  snapshot: "tutorials",
  tree: [
    makeDirectory("src", [
      new File({
        name: "main.ts",
        initialContent: String.stripMargin(
          `|import { Effect } from "effect"
           |
           |Effect.gen(function* () {
           |  yield* Effect.log("Welcome to the Effect Playground!")
           |}).pipe(Effect.runPromise)
           |`
        )
      })
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
    if (!compressed) return makeDefaultWorkspace()
    const compression = yield* WorkspaceCompression
    return yield* pipe(
      compression.decompress(compressed),
      Effect.orElseSucceed(makeDefaultWorkspace)
    )
  })
)
