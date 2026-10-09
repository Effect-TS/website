import type { ApiReferenceEntry } from "@website/domain/ApiReference"
import { resolve } from "node:path"
import { loadReflection as loadDatasetReflection } from "@website/api-reference/Reflection"

export * from "@website/api-reference/ApiReference"
export * from "@website/api-reference/ReflectionSymbolResolver"

const datasetDirectory = resolve(".data/api-reference")

export const loadReflection = (entry: ApiReferenceEntry) =>
  loadDatasetReflection(entry, { baseDirectory: datasetDirectory })

export const API_JSDOC_CLASS = [
  "[&_a]:font-medium",
  "[&_a]:text-foreground",
  "[&_a]:underline",
  "[&_a]:underline-offset-4",
  "[&_a:hover]:no-underline",
  "[&_a_code]:text-inherit",
  "[&_code:not(pre_*)]:rounded-md",
  "[&_code:not(pre_*)]:bg-muted",
  "[&_code:not(pre_*)]:px-1.5",
  "[&_code:not(pre_*)]:py-0.5",
  "[&_code:not(pre_*)]:text-[0.85em]",
  "[&_code:not(pre_*)]:font-normal",
  "[&_code:not(pre_*)::before]:content-none",
  "[&_code:not(pre_*)::after]:content-none",
].join(" ")
