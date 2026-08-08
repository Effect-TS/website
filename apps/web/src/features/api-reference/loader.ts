import type { Loader } from "astro/loaders"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"
import { loadApiReferenceDataset } from "./dataset"

export function apiReferenceLoader(options: { base: URL }): Loader {
  return {
    name: "api-reference-loader",
    load: async ({
      config,
      generateDigest,
      logger,
      parseData,
      store,
      watcher,
    }) => {
      const baseDirectory = fileURLToPath(options.base)
      const entries = await loadApiReferenceDataset(baseDirectory)
      store.clear()

      if (entries.length === 0) {
        logger.warn(`No local API reference datasets found in ${baseDirectory}`)
        watcher?.add(baseDirectory)
        return
      }

      for (const entry of entries) {
        const filePath = relative(
          fileURLToPath(config.root),
          entry.reflectionPath,
        )
        const data = await parseData({
          id: entry.id,
          filePath,
          data: entry.data,
        })
        store.set({
          id: entry.id,
          data,
          filePath,
          digest: generateDigest(
            `${entry.data.revision}:${entry.data.reflectionDigest}`,
          ),
        })
      }

      logger.info(`Loaded ${entries.length} API reference modules`)
      watcher?.add(baseDirectory)
    },
  }
}
