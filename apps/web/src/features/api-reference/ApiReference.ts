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
  "[&_a]:text-brand",
  "[&_a]:underline",
  "[&_a]:decoration-current",
  "[&_a]:underline-offset-4",
  "[&_a]:transition-colors",
  "[&_a:hover]:text-foreground",
  "[&_a_code]:text-inherit",
  "[&_code:not(pre_*)]:rounded-md",
  "[&_code:not(pre_*)]:bg-muted",
  "[&_code:not(pre_*)]:px-1.5",
  "[&_code:not(pre_*)]:py-0.5",
  "[&_code:not(pre_*)]:text-[0.85em]",
  "[&_code:not(pre_*)]:font-normal",
  "[&_code:not(pre_*)::before]:content-none",
  "[&_code:not(pre_*)::after]:content-none",
  "[&_:is(h4,p:has(>strong:only-child))]:mt-4",
  "[&_:is(h4,p:has(>strong:only-child))]:mb-1.5",
  "[&_:is(h4,p:has(>strong:only-child))]:text-base",
  "[&_:is(h4,p:has(>strong:only-child))]:font-semibold",
  "[&_:is(h4,p:has(>strong:only-child))]:tracking-normal",
  "[&_:is(h4,p:has(>strong:only-child))]:text-foreground",
  "[&_p:has(>strong:only-child)_strong]:[font-weight:inherit]",
].join(" ")
