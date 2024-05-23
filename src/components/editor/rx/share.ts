import { WorkspaceHandle } from "./workspace"
import { File, Workspace, WorkspaceShell } from "../domain/workspace"
import { Result, Rx } from "@effect-rx/rx-react"
import { Clipboard } from "@effect/platform-browser"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import packageJson from "../../../../snapshots/tutorials/package.json"
import { WorkspaceCompression } from "../services/workspace-compression"
import { editorRx } from "./editor"
import { hashRx } from "@/rx/location"
import {
  retrieveCompressed,
  shortenHash
} from "../services/actions/shortenHash"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareRx = Rx.family(({ handle, workspace }: WorkspaceHandle) =>
  runtime.fn((_: void, get) =>
    Effect.gen(function* () {
      const compression = yield* WorkspaceCompression
      const editor = yield* Result.toExit(
        get.once(editorRx(workspace).editor)
      )

      yield* editor.save

      const compressed = yield* compression.compress(workspace, handle.read)
      const hash = yield* Effect.promise(() => shortenHash(compressed))
      const url = new URL(location.href)
      url.hash = hash
      return url.toString()
    }).pipe(Effect.tapErrorCause(Effect.logError))
  )
)

const defaultWorkspace = new Workspace({
  name: "playground",
  dependencies: packageJson.dependencies,
  shells: [new WorkspaceShell({ command: "../run main.ts" })],
  initialFilePath: "main.ts",
  snapshot: "tutorials",
  tree: [
    new File({
      name: "main.ts",
      initialContent: `import { Effect } from "effect"

Effect.gen(function* () {
  yield* Effect.log("Welcome to the Effect Playground!")
}).pipe(Effect.runPromise)
`
    })
  ]
})

const makeDefaultWorkspace = () =>
  defaultWorkspace.withName(`playground-${Date.now()}`)

export const importRx = runtime
  .rx((get) =>
    Effect.gen(function* (_) {
      const hash = get(hashRx)
      if (hash._tag === "None") return makeDefaultWorkspace()
      const compressed = yield* Effect.promise(() =>
        retrieveCompressed(hash.value)
      )
      if (!compressed) return makeDefaultWorkspace()
      const compression = yield* WorkspaceCompression
      return yield* _(
        compression.decompress({
          shells: [new WorkspaceShell({ command: "../run main.ts" })],
          initialFilePath: "main.ts",
          whitelist: ["package.json", "main.ts"],
          compressed
        }),
        Effect.orElseSucceed(makeDefaultWorkspace)
      )
    })
  )
  .pipe(Rx.setIdleTTL("10 seconds"))
