import type { AstroIntegration } from "astro"
import { readFileSync } from "node:fs"

/**
 * Reports how many prerendered pages `experimental.incrementalBuild` reused.
 *
 * Astro marks reused pages `(cached)` in its info-level log, but Alchemy runs
 * the build at `logLevel: "warn"`, so CI never shows it and a cache that stops
 * hitting goes unnoticed. This compares the manifest restored before the build
 * with the one Astro writes, applying the same checks as Astro's `canSkip`, and
 * prints the outcome directly to stdout.
 */

interface PathEntry {
  readonly cacheKey: string
  readonly contentHashes?: Readonly<Record<string, string>>
}

interface Manifest {
  readonly version: number
  readonly configHash: string
  readonly lockfileHash: string
  readonly routes: Readonly<
    Record<
      string,
      {
        readonly dependencyHash: string
        readonly paths: Readonly<Record<string, PathEntry>>
      }
    >
  >
}

const readManifest = (file: URL): Manifest | undefined => {
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as Manifest
  } catch {
    return undefined
  }
}

const sameContent = (previous: PathEntry, next: PathEntry): boolean =>
  JSON.stringify(previous.contentHashes ?? {}) ===
  JSON.stringify(next.contentHashes ?? {})

const describe = (previous: Manifest | undefined, next: Manifest) => {
  if (previous === undefined) return "no previous cache was restored"
  if (previous.version !== next.version) return "the cache format changed"
  if (previous.configHash !== next.configHash) return "the Astro config changed"
  if (previous.lockfileHash !== next.lockfileHash) return "the lockfile changed"
  return undefined
}

export const incrementalBuildReport = (): AstroIntegration => {
  let manifestFile: URL | undefined
  let previous: Manifest | undefined

  return {
    name: "incremental-build-report",
    hooks: {
      "astro:config:done": ({ config }) => {
        if (config.experimental.incrementalBuild !== true) return
        manifestFile = new URL("incremental-build.json", config.cacheDir)
      },
      "astro:build:start": () => {
        if (manifestFile !== undefined) previous = readManifest(manifestFile)
      },
      "astro:build:done": ({ pages }) => {
        if (manifestFile === undefined) return
        const next = readManifest(manifestFile)
        if (next === undefined) return

        const lines: Array<string> = []
        let keyed = 0
        let reused = 0
        const invalidated = describe(previous, next)

        for (const [route, entry] of Object.entries(next.routes)) {
          const paths = Object.entries(entry.paths)
          keyed += paths.length
          if (invalidated !== undefined) continue

          const previousRoute = previous?.routes[route]
          if (previousRoute?.dependencyHash !== entry.dependencyHash) {
            lines.push(
              `  ${route}: ${paths.length} re-rendered (${previousRoute === undefined ? "new route" : "module graph changed"})`,
            )
            continue
          }
          const routeReused = paths.filter(([pathname, path]) => {
            const previousPath = previousRoute.paths[pathname]
            return (
              previousPath !== undefined &&
              previousPath.cacheKey === path.cacheKey &&
              sameContent(previousPath, path)
            )
          }).length
          reused += routeReused
          if (routeReused < paths.length) {
            lines.push(
              `  ${route}: ${paths.length - routeReused} of ${paths.length} re-rendered (data changed)`,
            )
          }
        }

        const summary =
          invalidated === undefined
            ? `reused ${reused} of ${keyed} keyed paths`
            : `reused 0 of ${keyed} keyed paths because ${invalidated}`
        console.log(
          [
            `[incremental-build] ${summary} (${pages.length} pages prerendered in total).`,
            ...lines,
          ].join("\n"),
        )
      },
    },
  }
}
