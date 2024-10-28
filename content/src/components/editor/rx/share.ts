import { Result, Rx } from "@effect-rx/rx-react"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Clipboard from "@effect/platform-browser/Clipboard"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { rpcClient } from "@/services/shorten/client"
import { ShortenRequest } from "@/services/shorten/domain"
import { WorkspaceCompression } from "../services/compression"
import { WebContainer } from "../services/webcontainer"
import { editorRx } from "./editor"
import type { RxWorkspaceHandle } from "./workspace"

const runtime = Rx.runtime(Layer.mergeAll(
  Clipboard.layer,
  FetchHttpClient.layer,
  WebContainer.Default,
  WorkspaceCompression.Default
))

export const shareRx = Rx.family((handle: RxWorkspaceHandle) =>
  runtime.fn((_: void, get) =>
    Effect.gen(function*() {
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      const client = yield* rpcClient
      const workspace = get.once(handle.workspaceRx)
      const editor = yield* Result.toExit(
        get.once(editorRx(handle).editor)
      ).pipe(Effect.orDie)

      yield* editor.save

      const compressed = yield* compression.compress(
        workspace,
        container.readFileString
      )
      const hash = yield* client(new ShortenRequest({ text: compressed }))
      const url = new URL(location.href)
      url.hash = hash
      return url.toString()
    }).pipe(
      Effect.tapErrorCause(Effect.logError)
    )
  )
)
