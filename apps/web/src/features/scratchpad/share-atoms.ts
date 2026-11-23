import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Atom from "effect/reactivity/Atom"
import { WorkspaceCompression } from "@/features/share/compression"
import type { FlatWorkspaceMetadata } from "@/features/share/flat"
import { ShortenClient } from "@/features/share/shorten/client"
import { runAutosave } from "./autosave.ts"
import { shareScratchpad, shareSourceFromSnapshot } from "./share.ts"
import { Workspace } from "./workspace.ts"

export interface ScratchpadShareResult {
  readonly url: string
  /** False when the clipboard refused the write; the URL is still shown. */
  readonly copied: boolean
}

export interface ScratchpadShareAtoms {
  /** Shares the Workspace, copies the link and puts the hash in the page URL. */
  readonly shareAtom: Atom.AtomResultFn<void, ScratchpadShareResult, unknown>
  /** Mount to autosave the Workspace while the Scratchpad is open. */
  readonly autosaveAtom: Atom.Atom<unknown>
}

const shareLayer = Layer.mergeAll(
  ShortenClient.layer,
  WorkspaceCompression.layer,
)

const copyToClipboard = (text: string) =>
  Effect.tryPromise(() => navigator.clipboard.writeText(text)).pipe(
    Effect.as(true),
    Effect.catchCause((cause) =>
      Effect.logWarning("Scratchpad: couldn't copy the share link", cause).pipe(
        Effect.as(false),
      ),
    ),
  )

/**
 * Share and autosave for one Scratchpad session, run on the session's
 * runtime so they see the same Workspace as the editor.
 */
export const makeScratchpadShareAtoms = <R, ER>(options: {
  readonly runtime: Atom.AtomRuntime<R | Workspace, ER>
  readonly metadataAtom: Atom.Atom<FlatWorkspaceMetadata | undefined>
  readonly initialFiles: Readonly<Record<string, string>>
}): ScratchpadShareAtoms => {
  const shareAtom = options.runtime.fn<void>()(
    Effect.fnUntraced(
      function* (_, get) {
        const workspace = yield* Workspace
        const snapshot = yield* workspace.snapshot
        const { hash, url } = yield* shareScratchpad(
          shareSourceFromSnapshot(snapshot, get(options.metadataAtom)),
          { origin: window.location.origin },
        )
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}#${hash}`,
        )
        const copied = yield* copyToClipboard(url)
        return { url, copied } satisfies ScratchpadShareResult
      },
      Effect.provide(shareLayer),
      Effect.tapCause(Effect.logError),
    ),
  )

  const autosaveAtom = options.runtime
    .atom(
      Effect.fnUntraced(function* (get) {
        const workspace = yield* Workspace
        yield* runAutosave({
          workspace,
          metadata: Effect.sync(() => get.once(options.metadataAtom)),
          initialFiles: options.initialFiles,
        }).pipe(Effect.forkScoped)
      }, Effect.provide(BrowserKeyValueStore.layerLocalStorage)),
    )
    .pipe(Atom.keepAlive)

  return { shareAtom, autosaveAtom }
}
