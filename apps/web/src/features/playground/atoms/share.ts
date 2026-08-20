import * as Clipboard from "@effect/platform-browser/Clipboard"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import { ShortenClient } from "@/features/playground/services/shorten/client"
import type { AtomWorkspaceHandle } from "./workspace"
import { WorkspaceCompression } from "../services/compression"
import { WorkspaceDownload } from "../services/download"
import { WebContainer } from "../services/webcontainer"
import { editorAtom } from "./editor"

const runtime = Atom.runtime(
  Layer.mergeAll(
    Clipboard.layer,
    ShortenClient.layer,
    WebContainer.layer,
    WorkspaceCompression.layer,
    WorkspaceDownload.layer,
  ),
)

export const shareAtom = Atom.family((handle: AtomWorkspaceHandle) => {
  const atom = editorAtom(handle)
  return runtime.fn<void>()(
    Effect.fnUntraced(function* (_, get) {
      const editor = yield* get.result(atom.editor)
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      const zip = yield* WorkspaceDownload
      const client = yield* ShortenClient

      yield* editor.save
      yield* handle.flushModels()
      const workspace = get(handle.workspaceAtom)

      const compressed = yield* compression.compress(
        workspace,
        container.readFileString,
      )
      const hash = yield* client.shorten({ payload: { text: compressed } })
      const url = new URL(window.location.pathname, window.location.origin)
      url.hash = hash

      const zipFile = yield* zip.pack(workspace, container.readFileString)

      return {
        url: url.toString(),
        zipFile: { name: `play-${hash}.zip`, content: zipFile },
      }
    }, Effect.tapCause(Effect.logError)),
  )
})

export const copyLinkAtom = Atom.fn<AtomWorkspaceHandle>()(
  Effect.fnUntraced(function* (handle, get) {
    const { url } = yield* get.result(shareAtom(handle))
    yield* Effect.promise(() => navigator.clipboard.writeText(url))
    yield* Effect.sleep(2000).pipe(
      Effect.tap(() => Effect.sync(() => get.setSelf(AsyncResult.initial()))),
      Effect.forkScoped,
    )
  }),
)

export const downloadAtom = Atom.fn<AtomWorkspaceHandle>()(
  Effect.fnUntraced(function* (handle, get) {
    const { zipFile } = yield* get.result(shareAtom(handle))
    const blobUrl = URL.createObjectURL(zipFile.content)
    const link = document.createElement("a")
    get.addFinalizer(() => link.remove())
    link.href = blobUrl
    link.download = zipFile.name
    link.innerText = "Click here to download the file"
    document.body.appendChild(link)
    link.click()
    yield* Effect.sleep(2000).pipe(
      Effect.tap(() => Effect.sync(() => get.setSelf(AsyncResult.initial()))),
      Effect.forkScoped,
    )
  }),
)
