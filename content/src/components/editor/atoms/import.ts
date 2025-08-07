import { Atom } from "@effect-atom/atom-react"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { hashAtom } from "@/atoms/location"
import { ShortenClient } from "@/services/shorten/client"
import { makeFile, Workspace } from "../domain/workspace"
import { WorkspaceCompression } from "../services/compression"
import * as Schema from "effect/Schema"
import { defaultWorkspace, main, makeDefaultWorkspace, type AtomWorkspaceHandle } from "./workspace"
import { WebContainer } from "../services/webcontainer"
import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import { NoSuchElementException } from "effect/Cause"

const runtime = Atom.runtime(Layer.mergeAll(ShortenClient.Default, WorkspaceCompression.Default, WebContainer.Default))

const codeAtom = Atom.searchParam("code", {
  schema: Schema.StringFromBase64Url.pipe(Schema.nonEmptyString())
})

export const autoSaveAtom = Atom.family((handle: AtomWorkspaceHandle) =>
  runtime.atom(
    Effect.fnUntraced(function* (get) {
      const workspace = get(handle.workspaceAtom)
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
          get.set(autoSaveWorkspaceAtom, Option.some(snapshot))
        }),
        Effect.andThen(Effect.sleep("2 seconds")),
        Effect.forever,
        Effect.forkScoped
      )
    }, Effect.tapErrorCause(Effect.logError))
  )
)

export const resetAtom = Atom.fnSync((handle: AtomWorkspaceHandle, get) => {
  const workspace = makeDefaultWorkspace()
  get.set(handle.workspaceAtom, workspace)
  get.set(autoSaveWorkspaceAtom, Option.none())
  get.refresh(importAtom)
})

const autoSaveWorkspaceAtom = Atom.kvs({
  runtime: Atom.runtime(BrowserKeyValueStore.layerLocalStorage),
  key: "workspace-autosave",
  schema: Schema.Option(Workspace),
  defaultValue: Option.none
})

export const importAtom = runtime.atom(
  Effect.fnUntraced(
    function* (get) {
      const hash = get(hashAtom)
      if (Option.isSome(hash)) {
        const client = yield* ShortenClient
        const compressed = yield* client.retrieve({ hash: hash.value }).pipe(Effect.flatten)

        const compression = yield* WorkspaceCompression
        return yield* compression.decompress(compressed)
      }

      const code = get(codeAtom)
      if (Option.isSome(code)) {
        const node = makeFile("main.ts", code.value, false)
        return defaultWorkspace.replaceNode(main, node)
      }

      return yield* new NoSuchElementException()
    },
    (effect, get) =>
      Effect.catchAll(effect, () =>
        Effect.succeed(Option.getOrElse(get.once(autoSaveWorkspaceAtom), makeDefaultWorkspace))
      )
  )
)
