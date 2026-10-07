import type { Loader } from "astro/loaders"
import { relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { readApiReferenceDataset } from "@website/api-reference/ApiReferenceDataset"

/**
 * One entry per package that has a changelog, from the package manifests the
 * API reference loader already read. Releases stay in their file.
 */
export function changelogLoader(options: { base: URL }): Loader {
  return {
    name: "changelog-loader",
    load: async ({
      config,
      generateDigest,
      logger,
      parseData,
      store,
      watcher,
    }) => {
      const baseDirectory = fileURLToPath(options.base)
      const { packages } = await readApiReferenceDataset(baseDirectory)
      store.clear()

      let loaded = 0
      for (const pkg of packages) {
        const { changelog } = pkg
        if (changelog === undefined) continue
        const id = `${pkg.channel}/${pkg.slug}`
        const filePath = relative(
          fileURLToPath(config.root),
          resolve(baseDirectory, changelog.path),
        )
        const data = await parseData({
          id,
          filePath,
          data: {
            channel: pkg.channel,
            name: pkg.name,
            slug: pkg.slug,
            packageVersion: pkg.version,
            description: pkg.description,
            sourceUrl: changelog.sourceUrl,
            releaseCount: changelog.releaseCount,
            latestDate: changelog.latestDate,
            jsonPath: changelog.path,
            sha256: changelog.sha256,
          },
        })
        store.set({ id, data, filePath, digest: generateDigest(data) })
        loaded += 1
      }

      if (loaded === 0) {
        logger.warn(`No changelogs found in ${baseDirectory}`)
      } else {
        logger.info(`Loaded ${loaded} changelogs`)
      }
      watcher?.add(baseDirectory)
    },
  }
}
