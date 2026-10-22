import { getLatestModules } from "@/features/module-of-the-week/http"
import { getApiModules } from "./api-modules"
import { coveredModuleIds, type MotwVoteData } from "./catalog"

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
