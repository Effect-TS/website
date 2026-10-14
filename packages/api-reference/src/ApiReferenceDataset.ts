import { createHash } from "node:crypto"
import { readFile, readdir, stat } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import type {
  ApiReferenceChangelogSummary,
  ApiReferenceEntry,
} from "@website/domain/ApiReference"
import {
  ApiReferenceDatasetManifest,
  ApiReferencePackageManifest,
  packageNameToSlug,
} from "@website/domain/ApiReference"
import type { ChangelogRelease } from "@website/domain/Changelog"
import { ChangelogFile } from "@website/domain/Changelog"
import * as Schema from "effect/Schema"

export { packageNameToSlug }

export interface ApiReferenceDatasetEntry {
  readonly data: ApiReferenceEntry
  readonly id: string
  readonly reflectionPath: string
}

/** Package-level data from the package manifest, read once with the rest. */
export interface ApiReferencePackage {
  readonly channel: string
  readonly revision: string
  readonly name: string
  readonly slug: string
  readonly version: string
  readonly description: string
  readonly npmUrl: string
  readonly sourceUrl: string
  readonly changelog:
    | (ApiReferenceChangelogSummary & {
        // Releases file relative to the dataset's base directory.
        readonly path: string
      })
    | undefined
}

export interface ApiReferenceDataset {
  readonly packages: ReadonlyArray<ApiReferencePackage>
  readonly modules: ReadonlyArray<ApiReferenceDatasetEntry>
}

const datasets = new Map<
  string,
  { readonly signature: string; readonly dataset: Promise<ApiReferenceDataset> }
>()

/**
 * Read the manifests of every channel. The result is shared by everything that
 * asks for the same directory until the generator rewrites a dataset manifest,
 * so the API reference and the changelog collections do not read it twice.
 */
export async function readApiReferenceDataset(
  baseDirectory: string,
): Promise<ApiReferenceDataset> {
  const base = resolve(baseDirectory)
  const signature = await datasetSignature(base)
  const cached = datasets.get(base)
  if (cached?.signature === signature) return cached.dataset

  const dataset = readDataset(base)
  datasets.set(base, { signature, dataset })
  // A failed read must not stay cached.
  dataset.catch(() => {
    if (datasets.get(base)?.dataset === dataset) datasets.delete(base)
  })
  return dataset
}

export async function loadApiReferenceDataset(
  baseDirectory: string,
): Promise<ReadonlyArray<ApiReferenceDatasetEntry>> {
  return (await readApiReferenceDataset(baseDirectory)).modules
}

/**
 * Read one package's releases. Like a module's reflection, the file is not part
 * of the manifest: only the pages and the search index that show releases pay
 * for it, and its checksum comes from the manifest.
 */
export async function loadChangelogReleases(
  changelog: { readonly jsonPath: string; readonly sha256: string },
  options: { readonly baseDirectory: string },
): Promise<ReadonlyArray<ChangelogRelease>> {
  const path = safeResolve(options.baseDirectory, changelog.jsonPath)
  const contents = await readFile(path)
  const digest = createHash("sha256").update(contents).digest("hex")
  if (digest !== changelog.sha256) {
    throw new Error(
      `Changelog checksum mismatch for ${changelog.jsonPath}: expected ${changelog.sha256}, received ${digest}`,
    )
  }
  return Schema.decodeUnknownSync(ChangelogFile)(
    JSON.parse(contents.toString("utf8")),
  ).releases
}

async function datasetSignature(baseDirectory: string): Promise<string> {
  const parts = await Promise.all(
    (await readDirectories(baseDirectory)).map(async (version) => {
      try {
        const { mtimeMs, size } = await stat(
          join(baseDirectory, version, "manifest.json"),
        )
        return `${version}:${mtimeMs}:${size}`
      } catch {
        return `${version}:-`
      }
    }),
  )
  return parts.join("|")
}

async function readDataset(
  baseDirectory: string,
): Promise<ApiReferenceDataset> {
  const versions = await readDirectories(baseDirectory)
  const packages: Array<ApiReferencePackage> = []
  const entries: Array<ApiReferenceDatasetEntry> = []

  for (const version of versions) {
    const versionDirectory = join(baseDirectory, version)
    const datasetManifestPath = join(versionDirectory, "manifest.json")
    const dataset = Schema.decodeUnknownSync(ApiReferenceDatasetManifest)(
      await readJson(datasetManifestPath),
    )
    if (dataset.channel !== version) {
      throw new Error(
        `API reference dataset channel mismatch: ${datasetManifestPath} declares ${dataset.channel}`,
      )
    }

    const packageSlugs = new Map<string, string>()
    for (const packageEntry of dataset.packages) {
      const packageManifestPath = safeResolve(
        versionDirectory,
        packageEntry.manifest,
      )
      const packageManifest = Schema.decodeUnknownSync(
        ApiReferencePackageManifest,
      )(await readJson(packageManifestPath))
      if (
        packageManifest.channel !== version ||
        packageManifest.revision !== dataset.revision ||
        packageManifest.name !== packageEntry.name ||
        packageManifest.version !== packageEntry.version
      ) {
        throw new Error(
          `API package manifest does not match its dataset entry: ${packageManifestPath}`,
        )
      }
      const packageSlug = packageNameToSlug(packageManifest.name)
      const existingPackage = packageSlugs.get(packageSlug)
      if (
        existingPackage !== undefined &&
        existingPackage !== packageManifest.name
      ) {
        throw new Error(
          `API package slug ${JSON.stringify(packageSlug)} is shared by ${existingPackage} and ${packageManifest.name}`,
        )
      }
      packageSlugs.set(packageSlug, packageManifest.name)

      const packageDirectory = dirname(packageManifestPath)
      packages.push({
        channel: version,
        revision: dataset.revision,
        name: packageManifest.name,
        slug: packageSlug,
        version: packageManifest.version,
        description: packageManifest.description,
        npmUrl: packageManifest.npmUrl,
        sourceUrl: packageManifest.sourceUrl,
        changelog:
          packageManifest.changelog === undefined
            ? undefined
            : {
                ...packageManifest.changelog,
                path: relative(
                  baseDirectory,
                  safeResolve(packageDirectory, packageManifest.changelog.json),
                ),
              },
      })

      const barrelExports = new Set(
        packageManifest.barrels.map((barrel) => barrel.export),
      )
      for (const module of packageManifest.modules) {
        if (module.barrel !== undefined && !barrelExports.has(module.barrel)) {
          throw new Error(
            `API module ${module.export} references unknown barrel ${module.barrel}: ${packageManifestPath}`,
          )
        }
        const modulePath = exportPathToModulePath(module.export)
        const reflectionPath = safeResolve(packageDirectory, module.json)
        const id = `${version}/${packageSlug}/${modulePath}`
        entries.push({
          id,
          reflectionPath,
          data: {
            version,
            revision: dataset.revision,
            packageName: packageManifest.name,
            packageSlug,
            packageVersion: packageManifest.version,
            packageDescription: packageManifest.description,
            packageHasChangelog: packageManifest.changelog !== undefined,
            packageModuleCount: packageManifest.modules.length,
            packageNpmUrl: packageManifest.npmUrl,
            packageSourceUrl: packageManifest.sourceUrl,
            modulePath,
            barrelPath:
              module.barrel === undefined
                ? undefined
                : exportPathToModulePath(module.barrel),
            exportPath: module.export,
            sourcePath: module.source,
            reflectionPath: relative(baseDirectory, reflectionPath),
            reflectionDigest: module.sha256,
            typedocSchemaVersion: dataset.typedocSchemaVersion,
          },
        })
      }
    }
  }

  return { packages, modules: entries }
}

async function readDirectories(path: string): Promise<ReadonlyArray<string>> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareStrings)
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return []
    throw error
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"))
}

function exportPathToModulePath(exportPath: string): string {
  const modulePath =
    exportPath === "." ? "index" : exportPath.replace(/^\.\//, "")
  if (
    modulePath.length === 0 ||
    modulePath
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(
      `Cannot derive an API module path from export ${JSON.stringify(exportPath)}`,
    )
  }
  return modulePath
}

function safeResolve(base: string, path: string): string {
  const resolvedBase = resolve(base)
  const resolvedPath = resolve(resolvedBase, path)
  const relativePath = relative(resolvedBase, resolvedPath)
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`API reference path escapes its dataset: ${path}`)
  }
  return resolvedPath
}

function isNodeError(
  error: unknown,
): error is Error & { readonly code: string } {
  return (
    error instanceof Error && "code" in error && typeof error.code === "string"
  )
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
