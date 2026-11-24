import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import type { FlatWorkspaceMetadata } from "@/features/share/flat"
import { Workspace } from "@/features/share/workspace"
import { SCRATCHPAD_AUTOSAVE_KEY } from "./load.ts"
import { SCRATCHPAD_SEEDS } from "./seed.ts"
import { shareSourceFromSnapshot, toShareWorkspace } from "./share.ts"
import { comparePaths, type WorkspaceService } from "./workspace.ts"

/** How long the Workspace must be quiet before an autosave. */
export const AUTOSAVE_DEBOUNCE: Duration.Input = "2 seconds"

const AutosaveSchema = Schema.Option(Workspace)

export interface AutosaveOptions {
  readonly workspace: WorkspaceService
  /** Read at each save, so a later metadata change is picked up. */
  readonly metadata: Effect.Effect<FlatWorkspaceMetadata | undefined>
  /**
   * The files the Scratchpad opened with (a seed or an import). A save that
   * matches them, or either version's seed, is skipped.
   */
  readonly initialFiles: Readonly<Record<string, string>>
  readonly debounce?: Duration.Input | undefined
}

/**
 * Saves the Workspace once if it differs from what the Scratchpad opened with
 * and from both seeds, so a Reset or a version switch saves nothing.
 * Skipping unchanged content keeps a visit without edits from overwriting a
 * real autosave (say, after an over-limit share loaded the seed with a
 * notice) and leaves `/play`'s autosave to be read on a later visit.
 */
export const saveAutosave = Effect.fnUntraced(function* (
  options: AutosaveOptions,
) {
  const metadata = yield* options.metadata
  const snapshot = yield* options.workspace.snapshot
  const current = toShareWorkspace(shareSourceFromSnapshot(snapshot, metadata))
  const baselines = [
    toShareWorkspace({ files: sortByPath(options.initialFiles), metadata }),
    toShareWorkspace(SCRATCHPAD_SEEDS.v3),
    toShareWorkspace(SCRATCHPAD_SEEDS.v4),
  ]
  if (baselines.some((baseline) => current.isUnchangedFrom(baseline))) {
    return false
  }
  const store = KeyValueStore.toSchemaStore(
    yield* KeyValueStore.KeyValueStore,
    AutosaveSchema,
  )
  yield* store.set(SCRATCHPAD_AUTOSAVE_KEY, Option.some(current))
  return true
})

/**
 * Autosaves the Workspace to `SCRATCHPAD_AUTOSAVE_KEY` (the `/play` format,
 * `Option<Workspace>` as JSON) once it has been quiet for the debounce after
 * a change. Never writes `/play`'s own key. A failed save (storage blocked,
 * quota) is logged and the next change tries again.
 */
export const runAutosave = (options: AutosaveOptions) =>
  options.workspace.events.pipe(
    Stream.debounce(options.debounce ?? AUTOSAVE_DEBOUNCE),
    Stream.runForEach(() =>
      saveAutosave(options).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Scratchpad: autosave failed", cause),
        ),
      ),
    ),
  )

/**
 * The Workspace lists files sorted by path; sort the initial files the same
 * way so files the metadata doesn't list come out in the same tree order.
 */
const sortByPath = (
  files: Readonly<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => comparePaths(a, b)),
  )
