import type { Loader } from "astro/loaders"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"
import { loadChangelogDataset } from "@website/api-reference/Changelog"

/** One entry per package and channel, read from the generated API reference data. */
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
      const entries = await loadChangelogDataset(baseDirectory)
      store.clear()

      if (entries.length === 0) {
        logger.warn(`No generated changelogs found in ${baseDirectory}`)
        watcher?.add(baseDirectory)
        return
      }

      for (const { data, path } of entries) {
        const id = `${data.channel}/${data.slug}`
        const filePath = relative(fileURLToPath(config.root), path)
        store.set({
          id,
          data: await parseData({ id, filePath, data }),
          filePath,
          digest: generateDigest(data),
        })
      }

      logger.info(`Loaded ${entries.length} changelogs`)
      watcher?.add(baseDirectory)
    },
  }
}
