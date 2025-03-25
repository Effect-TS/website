import { Result, Rx } from "@effect-rx/rx-react"
import * as Clipboard from "@effect/platform-browser/Clipboard"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ShortenClientLayer } from "@/services/shorten/client"
import { ShortenRpcs } from "@/services/shorten/rpc"
import { WorkspaceCompression } from "../services/compression"
import { WorkspaceDownload } from "../services/download"
import { WebContainer } from "../services/webcontainer"
import { editorRx } from "./editor"
import type { RxWorkspaceHandle } from "./workspace"

const runtime = Rx.runtime(
  Layer.mergeAll(
    Clipboard.layer,
    ShortenClientLayer,
    WebContainer.Default,
    WorkspaceCompression.Default,
    WorkspaceDownload.Default
  )
)

export const shareRx = Rx.family((handle: RxWorkspaceHandle) =>
  runtime.fn((_: void, get) =>
    Effect.gen(function*() {
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      const zip = yield* WorkspaceDownload
      const client = yield* RpcClient.make(ShortenRpcs)
      const workspace = get.once(handle.workspaceRx)
      const editor = yield* Result.toExit(
        get.once(editorRx(handle).editor)
      ).pipe(Effect.orDie)

      yield* editor.save

      const compressed = yield* compression.compress(
        workspace,
        container.readFileString
      )
      const hash = yield* client.ShortenRequest({ text: compressed })
      const url = new URL(
        window.location.pathname,
        window.location.origin
      )
      url.hash = hash

      const zipFile = yield* zip.pack(workspace, container.readFileString)

      return {
        url: url.toString(),
        zipFile: { name: `play-${hash}.zip`, content: zipFile }
      }
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.scoped
    )
  )
)
