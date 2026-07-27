import type { Loader } from "astro/loaders"
import { readFile, readdir } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ApiReferenceDatasetManifest, ApiReferencePackageManifest } from "./schema"

export function apiReferenceLoader(options: { base: URL }): Loader {
  return {
    name: "api-reference-loader",
    load: async ({ config, generateDigest, logger, parseData, store, watcher }) => {
      const baseDirectory = fileURLToPath(options.base)
      const versions = await readDirectories(baseDirectory)
      let loadedEntries = 0
      store.clear()

      if (versions.length === 0) {
        logger.warn(`No local API reference datasets found in ${baseDirectory}`)
        watcher?.add(baseDirectory)
        return
      }

      for (const version of versions) {
        const versionDirectory = join(baseDirectory, version)
        const datasetManifestPath = join(versionDirectory, "manifest.json")
        const dataset = ApiReferenceDatasetManifest.parse(await readJson(datasetManifestPath))
        if (dataset.channel !== version) {
          throw new Error(
            `API reference dataset channel mismatch: ${datasetManifestPath} declares ${dataset.channel}`,
          )
        }

        const packageSlugs = new Map<string, string>()
        for (const packageEntry of dataset.packages) {
          const packageManifestPath = safeResolve(versionDirectory, packageEntry.manifest)
          const packageManifest = ApiReferencePackageManifest.parse(
            await readJson(packageManifestPath),
          )
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
          if (existingPackage !== undefined && existingPackage !== packageManifest.name) {
            throw new Error(
              `API package slug ${JSON.stringify(packageSlug)} is shared by ${existingPackage} and ${packageManifest.name}`,
            )
          }
          packageSlugs.set(packageSlug, packageManifest.name)

          const packageDirectory = dirname(packageManifestPath)
          for (const module of packageManifest.modules) {
            const modulePath = exportPathToModulePath(module.export)
            const reflectionPath = safeResolve(packageDirectory, module.json)
            const id = `${version}/${packageSlug}/${modulePath}`
            const data = await parseData({
              id,
              filePath: relative(fileURLToPath(config.root), reflectionPath),
              data: {
                version,
                revision: dataset.revision,
                packageName: packageManifest.name,
                packageSlug,
                packageVersion: packageManifest.version,
                modulePath,
                exportPath: module.export,
                sourcePath: module.source,
                reflectionPath: relative(baseDirectory, reflectionPath),
                reflectionDigest: module.sha256,
                typedocSchemaVersion: dataset.typedocSchemaVersion,
              },
            })

            store.set({
              id,
              data,
              filePath: relative(fileURLToPath(config.root), reflectionPath),
              digest: generateDigest(`${dataset.revision}:${module.sha256}`),
            })
            loadedEntries += 1
          }
        }
      }

      logger.info(`Loaded ${loadedEntries} API reference modules`)
      watcher?.add(baseDirectory)
    },
  }
}

async function readDirectories(path: string): Promise<ReadonlyArray<string>> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareStrings)
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return []
    }
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
  const modulePath = exportPath === "." ? "index" : exportPath.replace(/^\.\//, "")
  if (
    modulePath.length === 0 ||
    modulePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`Cannot derive an API module path from export ${JSON.stringify(exportPath)}`)
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
