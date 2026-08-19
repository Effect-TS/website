import { readFile } from "node:fs/promises"
import { parse } from "devalue"
import type { Plugin } from "vite"

const moduleId = "virtual:open-graph-metadata"
const resolvedModuleId = `\0${moduleId}`

interface ContentEntry {
  readonly id: string
  readonly data: Readonly<Record<string, unknown>>
}

const readEntry = (collection: string, value: unknown): ContentEntry => {
  if (typeof value !== "object" || value === null) {
    throw new Error(
      `Open Graph metadata entry in ${collection} is not an object`,
    )
  }
  const id = Reflect.get(value, "id")
  const data = Reflect.get(value, "data")
  if (typeof id !== "string" || typeof data !== "object" || data === null) {
    throw new Error(
      `Open Graph metadata entry in ${collection} is missing its id or data`,
    )
  }
  return { id, data }
}

const readString = (
  collection: string,
  entry: ContentEntry,
  field: string,
): string => {
  const value = entry.data[field]
  if (typeof value !== "string") {
    throw new Error(
      `Open Graph metadata entry ${collection}/${entry.id} is missing ${field}`,
    )
  }
  return value
}

const readCollection = (
  store: unknown,
  collection: string,
): ReadonlyArray<ContentEntry> => {
  if (!(store instanceof Map)) {
    throw new Error("Astro content store is not a map")
  }
  const entries: unknown = store.get(collection)
  if (!(entries instanceof Map)) {
    throw new Error(`Astro content store is missing ${collection}`)
  }
  return Array.from(entries.values(), (entry) => readEntry(collection, entry))
}

const readCategory = (entryId: string): string | undefined => {
  const segments = entryId.split("/")
  return segments.length >= 3
    ? segments[1]?.replace(/-/g, " ").toUpperCase()
    : undefined
}

export const openGraphMetadataPlugin = (): Plugin => ({
  name: "open-graph-metadata",
  resolveId(id) {
    return id === moduleId ? resolvedModuleId : undefined
  },
  async load(id) {
    if (id !== resolvedModuleId) return undefined

    const storePath = new URL(
      "../../../.astro/data-store.json",
      import.meta.url,
    )
    this.addWatchFile(storePath.pathname)
    const store: unknown = parse(await readFile(storePath, "utf8"))

    const docs = Object.fromEntries(
      readCollection(store, "docs").map((entry) => [
        entry.id,
        {
          title: readString("docs", entry, "title"),
          subtitle: readCategory(entry.id),
        },
      ]),
    )
    const blog = Object.fromEntries(
      readCollection(store, "blog").map((entry) => [
        entry.id,
        {
          title: readString("blog", entry, "title"),
          subtitle: readString("blog", entry, "excerpt"),
        },
      ]),
    )
    const apiReference = Object.fromEntries(
      readCollection(store, "apiReference").flatMap((entry) => {
        const version = readString("apiReference", entry, "version")
        const packageSlug = readString("apiReference", entry, "packageSlug")
        const packageName = readString("apiReference", entry, "packageName")
        const modulePath = readString("apiReference", entry, "modulePath")
        const moduleName = modulePath.split("/").at(-1) ?? modulePath
        return [
          [
            `${version}/api`,
            { eyebrow: "Effect Docs", title: "API Reference" },
          ],
          [
            `${version}/api/${packageSlug}`,
            { eyebrow: "API Reference", title: packageName },
          ],
          [
            `${version}/api/${packageSlug}/${modulePath}`,
            { eyebrow: "API Reference", title: moduleName },
          ],
        ]
      }),
    )

    return `export default ${JSON.stringify({ apiReference, blog, docs })}`
  },
})
