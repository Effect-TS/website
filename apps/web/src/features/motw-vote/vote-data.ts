import { getLatestModules } from "@/features/module-of-the-week/http"
import type { ModulePost } from "@/features/module-of-the-week/domain"
import { getApiModules } from "./api-modules"

/** What the server needs to check a vote, written at build time. */
export interface MotwVoteData {
  /** Ids of every API module. */
  readonly modules: ReadonlyArray<string>
  /** Ids of the API modules the series covered, so they cannot be voted for. */
  readonly covered: ReadonlyArray<string>
}

/** The API modules the posts name in their `apiModules` frontmatter. */
export const coveredModuleIds = (
  posts: ReadonlyArray<ModulePost>,
): ReadonlyArray<string> => [
  ...new Set(posts.flatMap((post) => post.data.apiModules ?? [])),
]

export const getVoteData = async (): Promise<MotwVoteData> => {
  const [modules, apiModules] = await Promise.all([
    getLatestModules(),
    getApiModules(),
  ])
  return {
    modules: apiModules.map(({ id }) => id),
    covered: coveredModuleIds(modules.map(({ post }) => post)),
  }
}
