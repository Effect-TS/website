import { Array, Option } from "effect"
import { EXAMPLES_CATALOG, type ExampleCategory } from "../catalog/index"
import type {
  AnyExampleControl,
  ExampleDefinition,
} from "../model/example-definition"

export const CATEGORIES: ReadonlyArray<ExampleCategory> = [
  "concurrency",
  "schedule",
  "error-handling",
  "constructors",
  "scope",
]

/** The first view: what the server renders and the first Model holds. */
export const DEFAULT_CATEGORY: ExampleCategory = "concurrency"

export interface CatalogEntry {
  /** Stable across server and browser. The definition's own key is random. */
  readonly key: string
  readonly category: ExampleCategory
  readonly example: ExampleDefinition
}

export const exampleKeyOf = (
  category: ExampleCategory,
  index: number,
): string => `${category}/${index}`

export const ENTRIES: ReadonlyArray<CatalogEntry> = Array.flatMap(
  CATEGORIES,
  (category) =>
    Array.map(EXAMPLES_CATALOG[category].examples, (example, index) => ({
      key: exampleKeyOf(category, index),
      category,
      example,
    })),
)

export const DEFAULT_KEY = exampleKeyOf(DEFAULT_CATEGORY, 0)

export const findEntry = (key: string): Option.Option<CatalogEntry> =>
  Array.findFirst(ENTRIES, (entry) => entry.key === key)

export const entriesOf = (
  category: ExampleCategory,
): ReadonlyArray<CatalogEntry> =>
  Array.filter(ENTRIES, (entry) => entry.category === category)

export const firstKeyOf = (category: ExampleCategory): string =>
  exampleKeyOf(category, 0)

/** A step is named by its place in the example. Its own id is random. */
export const stepKeyOf = (exampleKey: string, index: number): string =>
  `${exampleKey}:${index}`

export const controlValueOf = (
  controls: Readonly<Record<string, Readonly<Record<string, string>>>>,
  exampleKey: string,
  control: AnyExampleControl,
): string => controls[exampleKey]?.[control.id] ?? control.initialValue
