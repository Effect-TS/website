import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Atom from "effect/unstable/reactivity/Atom"
import { ShortenClient } from "@/features/playground/services/shorten/client"
import type { AtomWorkspaceHandle } from "./workspace"
import {
  defaultVersion,
  defaultMainFile,
  EffectVersion,
  effectVersionForCodeLink,
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

/**
 * Optional `?version` parameter targeting a specific Effect version, e.g. on
 * `?code` links from the docs.
 */
const versionParamAtom = Atom.searchParam("version", {
  schema: EffectVersion,
})

const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

export const EFFECT_VERSION_KEY = "playground-effect-version"

/**
 * The user's last explicitly selected Effect version. Only consulted when
 * nothing else (share hash, `?code`, autosave) determines the workspace.
 */
const versionPreferenceAtom = Atom.kvs({
  runtime: localStorageRuntime,
  key: EFFECT_VERSION_KEY,
  schema: EffectVersion,
  defaultValue: () => defaultVersion,
})

/**
 * Set when the user switches versions in the current session. Read first by
 * `importAtom`, so setting it deterministically swaps the workspace for the
 * selected version's default one. It stays set (switching is an explicit
 * "reset to this version"), so later in-page hash or `?code` changes only take
 * effect after a reload.
 */
const versionOverrideAtom = Atom.make(Option.none<EffectVersion>())

export const WORKSPACE_AUTOSAVE_KEY = "workspace-autosave"

const autoSaveWorkspaceAtom = Atom.kvs({
  runtime: localStorageRuntime,
  key: WORKSPACE_AUTOSAVE_KEY,
  schema: Schema.Option(Workspace),
  defaultValue: Option.none,
})

/**
 * Switches the playground to the given Effect version by resetting to that
 * version's default workspace. Like `resetAtom`, this drops the current
 * share hash / `?code` parameter and the autosave.
 */
export const switchVersionAtom = Atom.fnSync((version: EffectVersion, get) => {
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  )
  get.set(autoSaveWorkspaceAtom, Option.none())
  get.set(versionPreferenceAtom, version)
  get.set(versionOverrideAtom, Option.some(version))
})

type AutoSaveHandle = Pick<
  AtomWorkspaceHandle,
  "flushModels" | "initialWorkspace" | "workspaceAtom"
>

export function makeAutoSaveAtom(options: {
  readonly runtime: typeof autoSaveRuntime
  readonly versionOverrideAtom: Atom.Atom<Option.Option<EffectVersion>>
  readonly autoSaveWorkspaceAtom: Atom.Writable<
    Option.Option<Workspace>,
    Option.Option<Workspace>
  >
}) {
  return Atom.family((handle: AutoSaveHandle) =>
    options.runtime.atom(
      Effect.fnUntraced(function* (get) {
        const container = yield* WebContainer
        const compression = yield* WorkspaceCompression
        yield* Effect.suspend(() => {
          return handle.flushModels().pipe(
            Effect.andThen(
              Effect.suspend(() => {
                const workspace = get(handle.workspaceAtom)
                return compression.snapshot(workspace, container.readFileString)
              }),
            ),
            Effect.map((snapshot) => {
              const unchanged =
                snapshot.isUnchangedFrom(
                  makeDefaultWorkspace(snapshot.effectVersion),
                ) || snapshot.isUnchangedFrom(handle.initialWorkspace)

              // After a version switch this loop keeps ticking for the outgoing
              // handle until it unmounts; saving then would resurrect the old
              // workspace on the next load.
              // A user can edit package.json after mounting, so identify the
              // outgoing handle by its immutable initial version.
              const stale = get
                .once(options.versionOverrideAtom)
                .pipe(
                  Option.exists(
                    (version) =>
                      version !== handle.initialWorkspace.effectVersion,
                  ),
                )

              if (unchanged || stale) {
                return
              }

              get.set(options.autoSaveWorkspaceAtom, Option.some(snapshot))
            }),
          )
        }).pipe(
          Effect.andThen(Effect.sleep("2 seconds")),
          Effect.forever,
          Effect.forkScoped,
        )
      }, Effect.tapCause(Effect.logError)),
    ),
  )
}

export const autoSaveAtom = makeAutoSaveAtom({
  runtime: autoSaveRuntime,
  versionOverrideAtom,
  autoSaveWorkspaceAtom,
})

export const resetAtom = Atom.fnSync((handle: AtomWorkspaceHandle, get) => {
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`,
  )
  get.set(autoSaveWorkspaceAtom, Option.none())
  get.set(handle.resetContent, undefined)
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
      .retrieve({ params: { hash: hash.value } })
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

  const version = effectVersionForCodeLink(get(versionParamAtom))
  const node = makeFile("main.ts", code.value, false)
  return Option.some(
    makeDefaultWorkspace(version).replaceNode(defaultMainFile(version), node),
  )
}

export const importAtom = runtime.atom(
  Effect.fnUntraced(function* (get) {
    const override = get(versionOverrideAtom)
    if (Option.isSome(override)) {
      yield* Effect.logInfo(
        `Playground: switched to the Effect ${override.value} workspace`,
      )
      return makeDefaultWorkspace(override.value)
    }

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

    const version = Option.getOrElse(get(versionParamAtom), () =>
      get.once(versionPreferenceAtom),
    )
    yield* Effect.logInfo(
      `Playground: no saved workspace found, loading the default ${version} workspace`,
    )
    return makeDefaultWorkspace(version)
  }),
)
