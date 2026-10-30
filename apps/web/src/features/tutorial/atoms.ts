import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Schema from "effect/Schema"
import * as Atom from "effect/reactivity/Atom"

const kvsRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

/** Slugs of the lessons the learner completed. */
export const completedAtom = Atom.kvs({
  runtime: kvsRuntime,
  key: "effect-website:tutorial:completed",
  schema: Schema.Array(Schema.String),
  defaultValue: (): ReadonlyArray<string> => [],
})

export const markCompletedAtom = Atom.fnSync<string>()((slug, get) => {
  const completed = get(completedAtom)
  if (!completed.includes(slug)) get.set(completedAtom, [...completed, slug])
})

/** The learner's code for one lesson. Empty means "not edited yet". */
export const codeAtom = Atom.family((slug: string) =>
  Atom.kvs({
    runtime: kvsRuntime,
    key: `effect-website:tutorial:code:${slug}`,
    schema: Schema.String,
    defaultValue: () => "",
  }),
)

/** First lesson in `order` that is not completed, or `undefined`. */
export const firstUnfinished = (
  order: ReadonlyArray<string>,
  completed: ReadonlyArray<string>,
): string | undefined => order.find((slug) => !completed.includes(slug))

/** A lesson opens when every lesson before it is completed. */
export const isUnlocked = (
  order: ReadonlyArray<string>,
  completed: ReadonlyArray<string>,
  slug: string,
): boolean => {
  const first = firstUnfinished(order, completed)
  return first === undefined || order.indexOf(slug) <= order.indexOf(first)
}
