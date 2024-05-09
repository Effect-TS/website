import { workspaceHandleRx } from "@/CodeEditor/rx/workspace"
import { Rx } from "@effect-rx/rx-react"
import { Effect, Layer } from "effect"
import { WorkspaceCompression } from "../services/Compression/Workspace"
import { File, Workspace } from "@/domain/Workspace"
import { Clipboard } from "@effect/platform-browser"
import { effectPackageJson } from "@/tutorials/common"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareStateRx = Rx.make<"idle" | "loading" | "success">("idle")

export const shareRx = runtime.fn((_: void, get) =>
  Effect.gen(function* () {
    get.setSync(shareStateRx, "loading")

    const compression = yield* WorkspaceCompression
    const clipboard = yield* Clipboard.Clipboard
    const handle = yield* get
      .result(workspaceHandleRx)
      .pipe(Effect.orElse(() => Effect.never))
    const hash = yield* compression.compress(
      handle.workspace,
      handle.handle.read
    )
    const url = new URL(location.href)
    url.hash = hash
    const urlString = url.toString()

    yield* clipboard.writeString(urlString)
    location.hash = hash

    get.setSync(shareStateRx, "success")
    yield* Effect.sleep(2000)
  }).pipe(Effect.ensuring(get.set(shareStateRx, "idle")))
)

const defaultWorkspace = new Workspace({
  name: "playground",
  command: "tsx --watch main.ts",
  tree: [
    effectPackageJson,
    new File({
      name: "main.ts",
      initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Welcome to the playground!"))
`
    })
  ]
})

export const importRx = runtime.rx(
  Effect.gen(function* () {
    const hash = location.hash.slice(1)
    if (!hash) return defaultWorkspace
    const compression = yield* WorkspaceCompression
    return yield* compression
      .decompress({
        name: "playground",
        command: "tsx --watch main.ts",
        compressed: hash
      })
      .pipe(Effect.orElseSucceed(() => defaultWorkspace))
  })
)
