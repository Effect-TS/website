import { resolve } from "node:path"
import { loadChangelogReleases } from "@website/api-reference/ApiReferenceDataset"
import type { ChangelogEntry } from "@website/domain/ChangelogView"

const datasetDirectory = resolve(".data/api-reference")

/** The releases of one changelog, read and checked when a page needs them. */
export const loadReleases = (entry: ChangelogEntry) =>
  loadChangelogReleases(entry, { baseDirectory: datasetDirectory })
