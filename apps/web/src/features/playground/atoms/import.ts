import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Atom from "effect/unstable/reactivity/Atom"
import { ShortenClient } from "@/services/shorten/client"
import type { AtomWorkspaceHandle } from "./workspace"
import {
  defaultWorkspace,
  main,
  makeDefaultWorkspace,
  makeFile,
  Workspace,
} from "../domain/workspace"
import { WorkspaceCompression } from "../services/compression"
import { WebContainer } from "../services/webcontainer"
import { hashAtom } from "./location"

const runtime = Atom.runtime(
  Layer.mergeAll(ShortenClient.layer, WorkspaceCompression.layer),
)

const autoSaveRuntime = Atom.runtime(
  Layer.mergeAll(WebContainer.layer, WorkspaceCompression.layer),
)

const codeAtom = Atom.searchParam("code", {
  schema: Schema.StringFromBase64Url.pipe(Schema.check(Schema.isNonEmpty())),
})

export const autoSaveAtom = Atom.family((handle: AtomWorkspaceHandle) =>
  autoSaveRuntime.atom(
    Effect.fnUntraced(function* (get) {
      const workspace = get(handle.workspaceAtom)
      const container = yield* WebContainer
      const compression = yield* WorkspaceCompression
      yield* compression.snapshot(workspace, container.readFileString).pipe(
        Effect.map((snapshot) => {
          const unchanged =
            snapshot.isUnchangedFrom(defaultWorkspace) ||
            snapshot.isUnchangedFrom(handle.initialWorkspace)

          if (unchanged) {
            return
          }

          get.set(autoSaveWorkspaceAtom, Option.some(snapshot))
        }),
        Effect.andThen(Effect.sleep("2 seconds")),
        Effect.forever,
        Effect.forkScoped,
      )
    }, Effect.tapCause(Effect.logError)),
  ),
)

export const resetAtom = Atom.fnSync((handle: AtomWorkspaceHandle, get) => {
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`,
  )
  get.set(autoSaveWorkspaceAtom, Option.none())
  get.set(handle.resetContent, undefined)
})

export const WORKSPACE_AUTOSAVE_KEY = "workspace-autosave"

const autoSaveWorkspaceAtom = Atom.kvs({
  runtime: Atom.runtime(BrowserKeyValueStore.layerLocalStorage),
  key: WORKSPACE_AUTOSAVE_KEY,
  schema: Schema.Option(Workspace),
  defaultValue: Option.none,
})

/**
 * Reads a workspace from the URL's `#hash` (a shared playground). Failing to
 * retrieve or decompress the shared workspace is logged and treated as "not
 * present", so import falls through to the next source (`?code`, then the
 * autosave) instead of masking the `?code` parameter.
 */
const fromHash = Effect.fnUntraced(
  function* (get: Atom.FnContext) {
    const hash = get(hashAtom)
    if (Option.isNone(hash)) {
      return Option.none<Workspace>()
    }

    const client = yield* ShortenClient
    const compressed = yield* client
      .retrieve({ hash: hash.value })
      .pipe(Effect.flatMap(Effect.fromOption))
    const compression = yield* WorkspaceCompression
    return Option.some(yield* compression.decompress(compressed))
  },
  Effect.catch((error) =>
    Effect.logWarning(
      "Playground: could not load the shared workspace from the URL hash; trying the next source",
      error,
    ).pipe(Effect.as(Option.none<Workspace>())),
  ),
)

/** Reads a workspace from the `?code` search parameter (a single-file link). */
function fromCode(get: Atom.FnContext): Option.Option<Workspace> {
  const code = get(codeAtom)
  if (Option.isNone(code)) {
    return Option.none()
  }

  const node = makeFile("main.ts", code.value, false)
  return Option.some(defaultWorkspace.replaceNode(main, node))
}

export const importAtom = runtime.atom(
  Effect.fnUntraced(function* (get) {
    const hash = yield* fromHash(get)
    if (Option.isSome(hash)) {
      yield* Effect.logInfo("Playground: loaded workspace from the URL hash")
      return hash.value
    }

    const code = fromCode(get)
    if (Option.isSome(code)) {
      yield* Effect.logInfo(
        "Playground: loaded workspace from the ?code parameter",
      )
      return code.value
    }

    const autoSaved = get.once(autoSaveWorkspaceAtom)
    if (Option.isSome(autoSaved)) {
      yield* Effect.logInfo(
        "Playground: loaded workspace from the localStorage autosave",
      )
      return autoSaved.value
    }

    yield* Effect.logInfo(
      "Playground: no saved workspace found, loading the default workspace",
    )
    return makeDefaultWorkspace()
  }),
)
