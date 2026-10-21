import {
  type ModuleRef,
  type ModuleRequest,
  type ModuleRequestsStore,
  VOTE_REFUSALS,
  VoteRefused,
} from "./domain"

const VOTER_KEY = "effect:motw-voter"

/** A random id for this browser, kept in localStorage. It is not a cookie. */
const voterId = (): string => {
  try {
    const stored = window.localStorage.getItem(VOTER_KEY)
    if (stored) return stored
    const created = crypto.randomUUID()
    window.localStorage.setItem(VOTER_KEY, created)
    return created
  } catch {
    // Storage blocked: this visit votes under a fresh id
    return (memory ??= crypto.randomUUID())
  }
}

let memory: string | undefined

const request = async (path: string, init?: RequestInit): Promise<Response> =>
  fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-voter-id": voterId() },
  })

/**
 * Votes kept on the server. `moduleIndex` names the modules, since the server
 * returns ids only. Ids that are not in it are left out of the ranking.
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
      const { requests, voted } = (await response.json()) as {
        readonly requests: ReadonlyArray<{
          readonly id: string
          readonly votes: number
        }>
        readonly voted: ReadonlyArray<string>
      }
      return requests.flatMap(({ id, votes }): ReadonlyArray<ModuleRequest> => {
        const module = byId.get(id)
        return module ? [{ ...module, votes, voted: voted.includes(id) }] : []
      })
    },

    vote: async (module, on) => {
      const response = await request("/api/module-requests/vote", {
        method: "POST",
        body: JSON.stringify({ id: module.id, on }),
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
