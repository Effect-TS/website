import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRegistry from "effect/reactivity/AtomRegistry"
import type { FlatWorkspaceMetadata } from "@/features/share/flat"
import {
  type EffectVersion,
  Workspace as ShareWorkspace,
} from "@/features/share/workspace"
import { SCRATCHPAD_ENTRY_PATH } from "./config.ts"
import type { ReplaceWorkspaceInput } from "./editor.ts"
import { SCRATCHPAD_AUTOSAVE_KEY } from "./load.ts"
import { scratchpadSeed } from "./seed.ts"
import { writeEffectVersionPreference } from "./version.ts"
import type { Workspace, WorkspaceError } from "./workspace.ts"

export interface ScratchpadResetAtoms {
  /** The Effect version the Workspace targets, shown by the version toggle. */
  readonly effectVersionAtom: Atom.Writable<EffectVersion>
  /**
   * Resets the Scratchpad to a version's seed: replaces every file, clears
   * the autosave and drops the share hash and query from the URL. A version
   * other than the current one is a switch, and is remembered for the seed
   * on a fresh visit.
   */
  readonly resetAtom: Atom.AtomResultFn<EffectVersion, void, unknown>
}

const AutosaveSchema = Schema.Option(ShareWorkspace)

/**
 * Stores an empty autosave rather than removing the key: the loader reads
 * `/play`'s autosave only while the Scratchpad has none, and a Reset should
 * open the seed on the next visit.
 */
const clearAutosave = Effect.gen(function* () {
  const store = KeyValueStore.toSchemaStore(
    yield* KeyValueStore.KeyValueStore,
    AutosaveSchema,
  )
  yield* store.set(SCRATCHPAD_AUTOSAVE_KEY, Option.none())
})

export const makeScratchpadResetAtoms = <R, ER>(options: {
  readonly runtime: Atom.AtomRuntime<R | Workspace, ER>
  readonly metadataAtom: Atom.Writable<FlatWorkspaceMetadata | undefined>
  readonly initialVersion: EffectVersion
  /** The atom to keep the version in; one is made when left out. */
  readonly effectVersionAtom?: Atom.Writable<EffectVersion> | undefined
  readonly replaceWorkspace: (
    input: ReplaceWorkspaceInput,
  ) => Effect.Effect<
    void,
    WorkspaceError,
    Workspace | AtomRegistry.AtomRegistry
  >
}): ScratchpadResetAtoms => {
  const effectVersionAtom =
    options.effectVersionAtom ??
    Atom.make(options.initialVersion).pipe(Atom.keepAlive)

  const resetAtom = options.runtime.fn<EffectVersion>()(
    Effect.fnUntraced(
      function* (version, get) {
        const seed = scratchpadSeed(version)
        const switching = version !== get(effectVersionAtom)
        // Set before the files change, so the autosave sees the seed's
        // metadata and skips the unchanged seed.
        get.set(options.metadataAtom, seed.metadata)
        yield* options.replaceWorkspace({
          files: seed.files,
          entryPath: seed.metadata?.initialFilePath ?? SCRATCHPAD_ENTRY_PATH,
        })
        get.set(effectVersionAtom, version)
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname,
        )
        yield* clearAutosave
        if (switching) {
          yield* writeEffectVersionPreference(version)
        }
      },
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
      Effect.tapCause(Effect.logError),
    ),
  )

  return { effectVersionAtom, resetAtom }
}
