import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import {
  toFlatWorkspace,
  type FlatWorkspaceMetadata,
} from "@/features/share/flat"
import { Workspace } from "@/features/share/workspace"
import { SCRATCHPAD_AUTOSAVE_KEY } from "./load.ts"
import { SCRATCHPAD_SEED } from "./seed.ts"
import { shareSourceFromSnapshot, toShareWorkspace } from "./share.ts"
import type { WorkspaceService } from "./workspace.ts"

/** How long the Workspace must be quiet before an autosave. */
export const AUTOSAVE_DEBOUNCE: Duration.Input = "2 seconds"

const AutosaveSchema = Schema.Option(Workspace)

export interface AutosaveOptions {
  readonly workspace: WorkspaceService
  /** Read at each save, so a later metadata change is picked up. */
  readonly metadata: Effect.Effect<FlatWorkspaceMetadata | undefined>
  /**
   * The files the Scratchpad opened with (the seed or an import). A save that
   * matches them, or the seed, is skipped.
   */
  readonly initialFiles: Readonly<Record<string, string>>
  readonly debounce?: Duration.Input | undefined
}

/**
 * Saves the Workspace once if it differs from what the Scratchpad opened with
 * and from the seed. Skipping unchanged content keeps a visit without edits
 * from overwriting a real autosave (say, after a v3 link loaded the seed with
 * a notice) and leaves `/play`'s autosave to be read on a later visit.
 */
export const saveAutosave = Effect.fnUntraced(function* (
  options: AutosaveOptions,
) {
  const metadata = yield* options.metadata
  const snapshot = yield* options.workspace.snapshot
  const current = toShareWorkspace(shareSourceFromSnapshot(snapshot, metadata))
  const baselines = [options.initialFiles, SCRATCHPAD_SEED.files]
  if (baselines.some((files) => hasContent(current, files))) {
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
 * Whether `workspace` holds exactly `files` (same paths, same contents) and
 * no empty directories. Only content counts: metadata such as `language` and
 * `userManaged` differs between the seed and the same files decoded from an
 * autosave, so comparing it would save a Workspace nobody changed.
 * `package.json` is left out as in `Workspace.isUnchangedFrom`: `pnpm install
 * -E` rewrites it without a user edit.
 */
const hasContent = (
  workspace: Workspace,
  files: Readonly<Record<string, string>>,
): boolean => {
  const flat = toFlatWorkspace(workspace)
  if (flat.directories.length > 0) return false
  const withoutManifest = (entries: Readonly<Record<string, string>>) =>
    Object.entries(entries).filter(([path]) => path !== "package.json")
  const actual = withoutManifest(flat.files)
  const expected = withoutManifest(files)
  return (
    actual.length === expected.length &&
    actual.every(([path, content]) => files[path] === content)
  )
}
