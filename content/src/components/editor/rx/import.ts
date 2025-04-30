import { Rx } from "@effect-rx/rx-react"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { hashRx } from "@/rx/location"
import { ShortenClient } from "@/services/shorten/client"
import { makeFile, Workspace } from "../domain/workspace"
import { WorkspaceCompression } from "../services/compression"
import * as Schema from "effect/Schema"
import { defaultWorkspace, main, makeDefaultWorkspace, type RxWorkspaceHandle } from "./workspace"
import { WebContainer } from "../services/webcontainer"
import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"

const runtime = Rx.runtime(Layer.mergeAll(ShortenClient.Default, WorkspaceCompression.Default, WebContainer.Default))

const codeRx = Rx.searchParam("code", {
  schema: Schema.StringFromBase64Url.pipe(Schema.nonEmptyString())
})

export const autoSaveRx = Rx.family((handle: RxWorkspaceHandle) =>
  runtime.rx(
    Effect.fnUntraced(function* (get) {
      const workspace = get(handle.workspaceRx)
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      yield* compression.snapshot(workspace, container.readFileString).pipe(
        Effect.map((snapshot) => {
          const similar =
            snapshot.filePaths.size === defaultWorkspace.filePaths.size &&
            snapshot.findFile("src/main.ts").pipe(
              Option.filter(([file]) => file.initialContent === main.initialContent),
              Option.isSome
            )
          if (similar) return
          get.set(autoSaveWorkspaceRx, Option.some(snapshot))
        }),
        Effect.andThen(Effect.sleep("2 seconds")),
        Effect.forever,
        Effect.forkScoped
      )
    }, Effect.tapErrorCause(Effect.logError))
  )
)

export const resetRx = Rx.fnSync((handle: RxWorkspaceHandle, get) => {
  const workspace = makeDefaultWorkspace()
  get.set(handle.workspaceRx, workspace)
  get.set(autoSaveWorkspaceRx, Option.none())
  get.refresh(importRx)
})

const autoSaveWorkspaceRx = Rx.kvs({
  runtime: Rx.runtime(BrowserKeyValueStore.layerLocalStorage),
  key: "workspace-autosave",
  schema: Schema.Option(Workspace),
  defaultValue: Option.none
})

export const importRx = runtime
  .rx(
    Effect.fnUntraced(function* (get) {
      const hash = get(hashRx)
      if (Option.isNone(hash)) {
        const code = get(codeRx)
        if (Option.isSome(code)) {
          const node = makeFile("main.ts", code.value, false)
          return defaultWorkspace.replaceNode(main, node)
        }
        return Option.getOrElse(get.once(autoSaveWorkspaceRx), makeDefaultWorkspace)
      }

      const client = yield* ShortenClient
      const compressed = yield* client.retrieve({ hash: hash.value })

      if (Option.isNone(compressed)) {
        return get.once(autoSaveWorkspaceRx)
      }

      const compression = yield* WorkspaceCompression
      return yield* compression
        .decompress(compressed.value)
        .pipe(Effect.orElseSucceed(() => Option.getOrElse(get.once(autoSaveWorkspaceRx), makeDefaultWorkspace)))
    })
  )
  .pipe(Rx.refreshable)
