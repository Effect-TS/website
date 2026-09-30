import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Schema from "effect/Schema"
import * as Atom from "effect/unstable/reactivity/Atom"

const kvsRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

export const checkpointKey = (slug: string) =>
  `effect-website:tutorial:checkpoint:${slug}`

/**
 * Saved resume point for one tutorial page. Value is the 1-based checkpoint
 * index. `0` means no checkpoint is marked. Persisted per page in localStorage.
 */
export const currentCheckpointAtom = Atom.family((slug: string) =>
  Atom.kvs({
    runtime: kvsRuntime,
    key: checkpointKey(slug),
    schema: Schema.Number,
    defaultValue: () => 0,
  }).pipe(Atom.withLabel(`checkpoint:${slug}`)),
)
