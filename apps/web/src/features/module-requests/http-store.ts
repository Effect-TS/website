import {
  type ModuleRef,
  type ModuleRequest,
  type ModuleRequestsStore,
  VOTE_REFUSALS,
  VoteRefused,
} from "./domain"

const request = (path: string, init?: RequestInit) =>
  fetch(path, { ...init, headers: { "content-type": "application/json" } })

/**
 * Votes kept on the server, for the visitor the browser's cookie names.
 * `moduleIndex` names the modules, since the server returns ids only. Ids that
 * are not in it are left out of the ranking.
 */
export const makeHttpStore = (
  moduleIndex: ReadonlyArray<ModuleRef>,
): ModuleRequestsStore => {
  const byId = new Map(moduleIndex.map((module) => [module.id, module]))

  return {
    list: async () => {
      const response = await request("/api/module-requests")
      if (!response.ok)
        throw new Error(`Ranking request failed: ${response.status}`)
      const { requests, voted, turnstileSiteKey } = (await response.json()) as {
        readonly requests: ReadonlyArray<{
          readonly id: string
          readonly votes: number
        }>
        readonly voted: ReadonlyArray<string>
        readonly turnstileSiteKey: string
      }
      return {
        turnstileSiteKey,
        requests: requests.flatMap(
          ({ id, votes }): ReadonlyArray<ModuleRequest> => {
            const module = byId.get(id)
            return module
              ? [{ ...module, votes, voted: voted.includes(id) }]
              : []
          },
        ),
      }
    },

    vote: async (module, on, token) => {
      const response = await request("/api/module-requests/vote", {
        method: "POST",
        body: JSON.stringify({ id: module.id, on, token }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => undefined)) as
          | { readonly reason?: string }
          | undefined
        const reason = VOTE_REFUSALS.find(
          (candidate) => candidate === body?.reason,
        )
        throw reason
          ? new VoteRefused(reason)
          : new Error(`Vote failed: ${response.status}`)
      }
      const { votes, voted } = (await response.json()) as {
        readonly votes: number
        readonly voted: boolean
      }
      return { ...module, votes, voted }
    },
  }
}
