import { workspaceHandleRx } from "@/CodeEditor/rx/workspace"
import { File, Workspace } from "@/domain/Workspace"
import { emptyPackageJson } from "@/tutorials/common"
import { Rx } from "@effect-rx/rx-react"
import { Clipboard } from "@effect/platform-browser"
import { Effect, Layer } from "effect"
import { WorkspaceCompression } from "../services/Compression/Workspace"
import { editorRx } from "@/CodeEditor/rx/editor"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareStateRx = Rx.make<"idle" | "loading" | "success">("idle")

export const shareRx = runtime.fn((_: void, get) =>
  Effect.gen(function* () {
    get.setSync(shareStateRx, "loading")

    const compression = yield* WorkspaceCompression
    const clipboard = yield* Clipboard.Clipboard
    const handle = yield* get.result(workspaceHandleRx)
    const editor = yield* get.result(editorRx)

    yield* editor.save

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

const defaultPackages = [
  "effect",
  "@effect/platform",
  "@effect/platform-node",
  "@effect/schema"
]

const defaultWorkspace = new Workspace({
  name: "playground",
  command: `pnpm add -E ${defaultPackages.join(
    " "
  )} && clear && tsx --watch main.ts`,
  initialFilePath: "main.ts",
  tree: [
    emptyPackageJson,
    new File({
      name: "main.ts",
      initialContent: `import { Effect } from "effect"
import assert from "assert"

Effect.gen(function* () {
  const result = yield* Effect.succeed("Effect is ...")
  assert.strictEqual(result, "Effect is awesome!!")
}).pipe(Effect.runPromise)
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
        command: "clear && tsx --watch main.ts",
        initialFilePath: "main.ts",
        whitelist: ["package.json", "main.ts"],
        compressed: hash
      })
      .pipe(Effect.orElseSucceed(() => defaultWorkspace))
  })
)
