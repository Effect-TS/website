import { readFile, readdir } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import type { ApiReferenceEntry } from "@website/domain/ApiReference"
import {
  ApiReferenceDatasetManifest,
  ApiReferencePackageManifest,
} from "@website/domain/ApiReference"
import * as Schema from "effect/Schema"

export interface ApiReferenceDatasetEntry {
  readonly data: ApiReferenceEntry
  readonly id: string
  readonly reflectionPath: string
}

export async function loadApiReferenceDataset(
  baseDirectory: string,
): Promise<ReadonlyArray<ApiReferenceDatasetEntry>> {
  const versions = await readDirectories(baseDirectory)
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

  return entries
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

function packageNameToSlug(packageName: string): string {
  const slug = packageName.startsWith("@effect/")
    ? packageName.slice("@effect/".length)
    : packageName
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(slug)) {
    throw new Error(
      `Cannot derive an API URL slug from package name ${JSON.stringify(packageName)}`,
    )
  }
  return slug
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
