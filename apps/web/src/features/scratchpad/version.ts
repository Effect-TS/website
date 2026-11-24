import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { EffectVersion } from "@/features/share/workspace"

/**
 * The Effect version the visitor last picked with the toggle. Stored like
 * `/play`'s `playground-effect-version` (the version as JSON), under the
 * Scratchpad's own key until the cutover.
 */
export const SCRATCHPAD_EFFECT_VERSION_KEY = "scratchpad-effect-version"

const preferenceStore = Effect.map(KeyValueStore.KeyValueStore, (store) =>
  KeyValueStore.toSchemaStore(store, EffectVersion),
)

/**
 * The stored version, or none when nothing was picked yet. A value that
 * doesn't decode, or storage that can't be read, counts as none.
 */
export const readEffectVersionPreference: Effect.Effect<
  Option.Option<EffectVersion>,
  never,
  KeyValueStore.KeyValueStore
> = preferenceStore.pipe(
  Effect.flatMap((store) => store.get(SCRATCHPAD_EFFECT_VERSION_KEY)),
  Effect.catchCause(() => Effect.succeedNone),
)

export const writeEffectVersionPreference = (version: EffectVersion) =>
  preferenceStore.pipe(
    Effect.flatMap((store) =>
      store.set(SCRATCHPAD_EFFECT_VERSION_KEY, version),
    ),
  )
