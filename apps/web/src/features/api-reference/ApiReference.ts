import type { ApiReferenceEntry } from "@website/domain/ApiReference"
import { resolve } from "node:path"
import { loadReflection as loadDatasetReflection } from "@website/api-reference/Reflection"

export * from "@website/api-reference/ApiReference"

const datasetDirectory = resolve(".data/api-reference")

export const loadReflection = (entry: ApiReferenceEntry) =>
  loadDatasetReflection(entry, { baseDirectory: datasetDirectory })
