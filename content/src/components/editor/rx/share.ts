import { Rx } from "@effect-rx/rx-react"
import * as Clipboard from "@effect/platform-browser/Clipboard"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ShortenClient } from "@/services/shorten/client"
import { WorkspaceCompression } from "../services/compression"
import { WorkspaceDownload } from "../services/download"
import { WebContainer } from "../services/webcontainer"
import { editorRx } from "./editor"
import type { RxWorkspaceHandle } from "./workspace"

const runtime = Rx.runtime(
  Layer.mergeAll(
    Clipboard.layer,
    ShortenClient.Default,
    WebContainer.Default,
    WorkspaceCompression.Default,
    WorkspaceDownload.Default
  )
)

export const shareRx = Rx.family((handle: RxWorkspaceHandle) => {
  const rx = editorRx(handle)
  return runtime.fn<void>()(
    Effect.fnUntraced(function* (_, get) {
      const workspace = get(handle.workspaceRx)
      const editor = yield* get.result(rx.editor)
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      const zip = yield* WorkspaceDownload
      const client = yield* ShortenClient

      yield* editor.save

      const compressed = yield* compression.compress(workspace, container.readFileString)
      const hash = yield* client.shorten({ text: compressed })
      const url = new URL(window.location.pathname, window.location.origin)
      url.hash = hash

      const zipFile = yield* zip.pack(workspace, container.readFileString)

      return {
        url: url.toString(),
        zipFile: { name: `play-${hash}.zip`, content: zipFile }
      }
    }, Effect.tapErrorCause(Effect.logError))
  )
})
