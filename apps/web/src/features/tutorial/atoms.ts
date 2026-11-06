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

/**
 * Forgets a lesson and every lesson after it. Progress is sequential: a
 * completed lesson behind an unfinished one could never be opened.
 */
export const clearFromAtom = Atom.fnSync<{
  readonly order: ReadonlyArray<string>
  readonly slug: string
}>()(({ order, slug }, get) => {
  const forgotten = order.slice(order.indexOf(slug))
  get.set(
    completedAtom,
    get(completedAtom).filter((completed) => !forgotten.includes(completed)),
  )
  for (const lesson of forgotten) get.set(codeAtom(lesson), "")
})

/** Forgets every lesson in `slugs`. */
export const clearAllAtom = Atom.fnSync<ReadonlyArray<string>>()((
  slugs,
  get,
) => {
  get.set(completedAtom, [])
  for (const slug of slugs) get.set(codeAtom(slug), "")
})

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
