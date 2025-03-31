import { Rx } from "@effect-rx/rx-react"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as String from "effect/String"
import { hashRx } from "@/rx/location"
import { ShortenClient } from "@/services/shorten/client"
import {
  makeDirectory,
  makeFile,
  Workspace,
  WorkspaceShell
} from "../domain/workspace"
import { WorkspaceCompression } from "../services/compression"

const runtime = Rx.runtime(
  Layer.mergeAll(
    ShortenClient.Default,
    WorkspaceCompression.Default
  )
)

const main = makeFile(
  "main.ts",
  String.stripMargin(
    `|import { NodeRuntime } from "@effect/platform-node"
     |import { Effect } from "effect"
     |import { DevToolsLive } from "./DevTools"
     |
     |const program = Effect.gen(function*() {
     |  yield* Effect.log("Welcome to the Effect Playground!")
     |}).pipe(Effect.withSpan("program", {
     |  attributes: { source: "Playground" }
     |}))
     |
     |program.pipe(
     |  Effect.provide(DevToolsLive),
     |  NodeRuntime.runMain
     |)     
     |`
  )
)

const devTools = makeFile(
  "DevTools.ts",
  String.stripMargin(
    `|import { DevTools } from "@effect/experimental"
     |import { NodeSocket } from "@effect/platform-node"
     |import { Layer } from "effect"
     |
     |export const DevToolsLive = DevTools.layerSocket.pipe(
     |  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
     |)
     |`
  )
)

const defaultWorkspace = new Workspace({
  name: "playground",
  dependencies: {
    "@effect/experimental": "latest",
    "@effect/platform": "latest",
    "@effect/platform-node": "latest",
    "@types/node": "latest",
    effect: "latest",
    "tsc-watch": "latest",
    typescript: "latest"
  },
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  initialFilePath: "src/main.ts",
  tree: [makeDirectory("src", [main, devTools])]
})

function makeDefaultWorkspace() {
  return defaultWorkspace.withName(`playground-${Date.now()}`)
}

export const importRx = runtime.rx((get) =>
  Effect.gen(function*() {
    const hash = get(hashRx)
    if (Option.isNone(hash)) {
      const params = new URLSearchParams(window.location.search)
      if (params.has("code")) {
        const code = params.get("code")!
        const content = yield* Encoding.decodeBase64UrlString(code)
        const node = makeFile("main.ts", content, false)
        return defaultWorkspace.replaceNode(main, node)
      }
      return makeDefaultWorkspace()
    }

    const client = yield* ShortenClient
    const compressed = yield* client.retrieve({ hash: hash.value })

    if (Option.isNone(compressed)) {
      return makeDefaultWorkspace()
    }

    const compression = yield* WorkspaceCompression
    return yield* compression
      .decompress(compressed.value)
      .pipe(Effect.orElseSucceed(makeDefaultWorkspace))
  })
)
