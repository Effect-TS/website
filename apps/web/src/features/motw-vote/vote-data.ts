import { getLatestModules } from "@/features/module-of-the-week/http"
import type { ModulePost } from "@/features/module-of-the-week/domain"
import { getApiModules } from "./api-modules"
import type { MotwVoteData } from "./catalog"

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
