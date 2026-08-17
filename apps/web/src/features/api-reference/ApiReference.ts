import type { ApiReferenceEntry } from "@website/domain/ApiReference"
import { fileURLToPath } from "node:url"
import { loadReflection as loadDatasetReflection } from "@website/api-reference/Reflection"

export * from "@website/api-reference/ApiReference"

const datasetDirectory = fileURLToPath(
  new URL("../../../.data/api-reference/", import.meta.url),
)

export const loadReflection = (entry: ApiReferenceEntry) =>
  loadDatasetReflection(entry, { baseDirectory: datasetDirectory })
