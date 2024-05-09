import { workspaceHandleRx } from "@/CodeEditor/rx/workspace"
import { File, Workspace } from "@/domain/Workspace"
import { emptyPackageJson } from "@/tutorials/common"
import { Result, Rx } from "@effect-rx/rx-react"
import { Clipboard } from "@effect/platform-browser"
import { Effect, Layer } from "effect"
import { WorkspaceCompression } from "../services/WorkspaceCompression"
import { editorRx } from "@/CodeEditor/rx/editor"
import { hashRx } from "@/rx/location"

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareStateRx = Rx.make<"idle" | "loading" | "success">("idle")

export const shareRx = runtime.fn((_: void, get) =>
  Effect.gen(function* () {
    get.setSync(shareStateRx, "loading")

    const compression = yield* WorkspaceCompression
    const clipboard = yield* Clipboard.Clipboard
    const handle = yield* Result.toExit(get.once(workspaceHandleRx))
    const editor = yield* Result.toExit(get.once(editorRx))

    yield* editor.save

    const hash = yield* compression.compress(
      handle.workspace,
      `playground-${Date.now()}`,
      handle.handle.read
    )
    const url = new URL(location.href)
    url.hash = hash
    const urlString = url.toString()

    yield* clipboard.writeString(urlString)

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
  prepare: `pnpm add -E ${defaultPackages.join(" ")}`,
  command: `tsx --watch main.ts`,
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

export const importRx = runtime.rx((get) =>
  Effect.gen(function* () {
    const hash = get(hashRx)
    if (hash._tag === "None") return defaultWorkspace
    const compression = yield* WorkspaceCompression
    return yield* compression
      .decompress({
        command: "tsx --watch main.ts",
        initialFilePath: "main.ts",
        whitelist: ["package.json", "main.ts"],
        compressed: hash.value
      })
      .pipe(Effect.orElseSucceed(() => defaultWorkspace))
  })
)
