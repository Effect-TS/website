/**
 * Library files: installed declarations below `node_modules` that
 * go-to-definition opens in a read-only tab. They live in the language server
 * worker's file system (copied from the Container, ADR 0004), never in the
 * Scratchpad Workspace: they are not in the explorer, not autosaved and not
 * shared. The Workspace rejects `node_modules` paths, so a library path never
 * names a Workspace file.
 */

export const LIBRARY_ROOT = "node_modules"

/** Whether a Workspace-relative path is below `node_modules`. */
export const isLibraryPath = (relPath: string): boolean =>
  relPath.startsWith(`${LIBRARY_ROOT}/`)

/**
 * Whether a library file is a TypeScript document the language server can
 * answer requests about (`.d.ts`, `.d.mts`, `.ts`, ...).
 */
export const isLibraryDocumentPath = (relPath: string): boolean =>
  isLibraryPath(relPath) && /\.[cm]?tsx?$/.test(relPath)

/**
 * The package a library path belongs to (`effect`, `@effect/platform`), or
 * `undefined` for a path that is not below a package.
 */
export const libraryPackageOf = (relPath: string): string | undefined => {
  if (!isLibraryPath(relPath)) return undefined
  const segments = relPath.slice(LIBRARY_ROOT.length + 1).split("/")
  const first = segments[0]
  if (first === undefined || first === "") return undefined
  if (first.startsWith("@")) {
    const second = segments[1]
    return second === undefined || segments.length < 3
      ? undefined
      : `${first}/${second}`
  }
  return segments.length < 2 ? undefined : first
}

/**
 * The tab label for a library file: `node_modules/<pkg>/<file>`, with the
 * folders between the package and the file shortened to `…`.
 */
export const libraryTabLabel = (relPath: string): string => {
  const pkg = libraryPackageOf(relPath)
  if (pkg === undefined) return relPath
  const prefix = `${LIBRARY_ROOT}/${pkg}/`
  const rest = relPath.slice(prefix.length)
  const slash = rest.lastIndexOf("/")
  return slash === -1 ? relPath : `${prefix}…/${rest.slice(slash + 1)}`
}

/**
 * The library path of a URI below `<root>/node_modules/`, or `undefined`.
 * (`workspaceUriToPath` answers `undefined` for these: they are not
 * Workspace files.)
 */
export const libraryUriToPath = (
  uri: string,
  rootUri: string,
): string | undefined => {
  const prefix = `${rootUri.replace(/\/+$/, "")}/${LIBRARY_ROOT}/`
  if (!uri.startsWith(prefix)) return undefined
  try {
    const rest = uri
      .slice(prefix.length)
      .split("/")
      .map((segment) => decodeURIComponent(segment))
    if (
      rest.some(
        (segment) => segment === "" || segment === "." || segment === "..",
      )
    ) {
      return undefined
    }
    return `${LIBRARY_ROOT}/${rest.join("/")}`
  } catch {
    return undefined
  }
}
