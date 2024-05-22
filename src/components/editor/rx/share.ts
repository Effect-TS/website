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

const runtime = Rx.runtime(
  Layer.mergeAll(WorkspaceCompression.Live, Clipboard.layer)
)

export const shareRx = Rx.family(({ handle, workspace }: WorkspaceHandle) => {
  const state = Rx.make<"idle" | "loading" | "success">("idle")
  const share = runtime.fn((_: void, get) =>
    Effect.gen(function* () {
      get.setSync(state, "loading")

      const compression = yield* WorkspaceCompression
      const editor = yield* Result.toExit(
        get.once(editorRx(workspace).editor)
      )

      yield* editor.save

      const hash = yield* compression.compress(
        workspace,
        `playground-${Date.now()}`,
        handle.read
      )
      const url = new URL(location.href)
      url.hash = hash
      const urlString = url.toString()

      get.setSync(state, "success")

      yield* Effect.sleep(2000).pipe(
        Effect.andThen(get.set(state, "idle")),
        Effect.forkScoped
      )

      return urlString
    }).pipe(
      Effect.tapErrorCause((cause) => {
        get.setSync(state, "idle")
        return Effect.log(cause)
      })
    )
  )
  return { state, share } as const
})

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

export const importRx = runtime.rx((get) =>
  Effect.gen(function* () {
    const hash = get(hashRx)
    if (hash._tag === "None") return defaultWorkspace
    const compression = yield* WorkspaceCompression
    return yield* compression
      .decompress({
        shells: [new WorkspaceShell({ command: "../run main.ts" })],
        initialFilePath: "main.ts",
        whitelist: ["package.json", "main.ts"],
        compressed: hash.value
      })
      .pipe(Effect.orElseSucceed(() => defaultWorkspace))
  })
)
