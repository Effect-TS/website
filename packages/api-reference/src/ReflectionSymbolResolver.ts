import type { ApiReferenceEntry } from "@website/domain/ApiReference"

export interface ReflectionSymbolTarget {
  readonly packageName: string
  readonly packagePath: string
  readonly qualifiedName: string
}

type ResolverEntry = Pick<
  ApiReferenceEntry,
  "modulePath" | "packageName" | "packageSlug" | "sourcePath" | "version"
>

export function createReflectionSymbolResolver(
  entries: ReadonlyArray<ResolverEntry>,
): (target: ReflectionSymbolTarget) => string | undefined {
  const entriesByTarget = Map.groupBy(entries, (entry) =>
    symbolKey(entry.packageName, normalizeSourcePath(entry.sourcePath)),
  )

  return (target) => {
    const sourcePath = normalizeSourcePath(target.packagePath)
    if (sourcePath === undefined) return undefined
    const matches = entriesByTarget.get(
      symbolKey(target.packageName, sourcePath),
    )
    const entry = matches?.length === 1 ? matches[0] : undefined
    return entry === undefined
      ? undefined
      : `/docs/${entry.version}/api/${entry.packageSlug}/${entry.modulePath}`
  }
}

function symbolKey(
  packageName: string,
  sourcePath: string | undefined,
): string {
  return JSON.stringify([packageName, sourcePath])
}

function normalizeSourcePath(value: string): string | undefined {
  const normalized = value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part === "." || part === "..")
  ) {
    return undefined
  }
  return normalized
}
