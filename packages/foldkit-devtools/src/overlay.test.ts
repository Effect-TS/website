import {
  Effect,
  Fiber,
  HashMap,
  HashSet,
  Option,
  Queue,
  Stream,
  SubscriptionRef,
} from "effect"
import { DEVTOOLS_HOST_ID } from "foldkit/devtools-host"
import type {
  DevToolsProgramList,
  DevToolsPrograms,
  DevToolsStore,
  StoreState,
} from "foldkit/devtools-host"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createOverlay } from "./overlay.js"

const initialStoreState: StoreState = {
  entries: [],
  keyframes: HashMap.make([0, {}]),
  maybeInitModel: Option.some({}),
  initCommands: [],
  initMountStarts: [],
  startIndex: 0,
  isPaused: false,
  pausedAtIndex: 0,
  maybeLatestModel: Option.some({}),
}

const makeStore = (
  stateRef: SubscriptionRef.SubscriptionRef<StoreState>,
): DevToolsStore => ({
  recordInit: () => Effect.void,
  recordMessage: () => Effect.void,
  recordResolvedCommand: () => Effect.void,
  updateLatestModel: () => Effect.void,
  attachRenderedMounts: () => Effect.void,
  getModelAtIndex: () => Effect.succeed({}),
  getMessageAtIndex: () => Effect.succeed(Option.none()),
  getDiffAtIndex: () =>
    Effect.succeed({
      changedPaths: HashSet.empty(),
      affectedPaths: HashSet.empty(),
    }),
  jumpTo: () => Effect.succeed({}),
  resume: Effect.void,
  clear: Effect.void,
  stateRef,
})

const matchMedia = (): MediaQueryList => ({
  matches: false,
  media: "",
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
})

const overlayShadow = (): ShadowRoot => {
  const host = document.getElementById(DEVTOOLS_HOST_ID)
  if (host?.shadowRoot === null || host?.shadowRoot === undefined) {
    throw new Error("Expected the DevTools shadow root to exist")
  }
  return host.shadowRoot
}

const makePrograms = (initial: DevToolsProgramList) => {
  let current = initial
  const listeners = new Set<() => void>()
  const selected: Array<number> = []
  const programs: DevToolsPrograms = {
    snapshot: () => current,
    changes: Stream.callback<DevToolsProgramList>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const listener = () => {
            Queue.offerUnsafe(queue, current)
          }
          listeners.add(listener)
          listener()
          return listener
        }),
        listener => Effect.sync(() => listeners.delete(listener)),
      ),
    ),
    select: id => {
      selected.push(id)
    },
  }
  return {
    programs,
    selected,
    publish: (next: DevToolsProgramList) => {
      current = next
      listeners.forEach(listener => listener())
    },
  }
}

const startOverlay = (store: DevToolsStore, programs?: DevToolsPrograms) =>
  Effect.runFork(
    Effect.scoped(
      Effect.gen(function* () {
        yield* createOverlay(
          store,
          "BottomRight",
          "TimeTravel",
          Option.none(),
          programs,
        )
        return yield* Effect.never
      }),
    ),
  )

const programsButton = (): HTMLButtonElement | null =>
  overlayShadow().querySelector<HTMLButtonElement>("#dt-programs-button")

const panelShown = () => {
  expect(overlayShadow().querySelector(".dt-panel")).not.toBeNull()
}

const withOverlay = async (
  initial: DevToolsProgramList | undefined,
  run: (
    context: Readonly<{ harness: ReturnType<typeof makePrograms> | undefined }>,
  ) => Promise<void>,
) => {
  const stateRef = await Effect.runPromise(
    SubscriptionRef.make(initialStoreState),
  )
  const harness = initial === undefined ? undefined : makePrograms(initial)
  const fiber = startOverlay(makeStore(stateRef), harness?.programs)
  try {
    await vi.waitFor(panelShown)
    await run({ harness })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: matchMedia,
  })
  localStorage.setItem(
    "foldkit-devtools",
    JSON.stringify({ isOpen: true, isFlattened: true }),
  )
})

afterEach(() => {
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  localStorage.clear()
})

describe("Programs dropdown", () => {
  it("is absent for a single Program", async () => {
    await withOverlay({ items: [{ id: 1, name: "Alpha" }], selectedId: 1 }, async () => {
      expect(programsButton()).toBeNull()
    })
  })

  it("is absent when no Programs are given", async () => {
    await withOverlay(undefined, async () => {
      expect(programsButton()).toBeNull()
    })
  })

  it("shows the selected Program when several are listed", async () => {
    await withOverlay(
      {
        items: [
          { id: 1, name: "Alpha" },
          { id: 2, name: "Beta" },
        ],
        selectedId: 2,
      },
      async () => {
        await vi.waitFor(() => {
          expect(programsButton()?.textContent).toContain("Beta")
        })
      },
    )
  })

  it("appears when a second Program joins and follows the selection", async () => {
    await withOverlay(
      { items: [{ id: 1, name: "Alpha" }], selectedId: 1 },
      async ({ harness }) => {
        expect(programsButton()).toBeNull()
        harness?.publish({
          items: [
            { id: 1, name: "Alpha" },
            { id: 2, name: "Beta" },
          ],
          selectedId: 1,
        })
        await vi.waitFor(() => {
          expect(programsButton()?.textContent).toContain("Alpha")
        })
        harness?.publish({
          items: [
            { id: 1, name: "Alpha" },
            { id: 2, name: "Beta" },
          ],
          selectedId: 2,
        })
        await vi.waitFor(() => {
          expect(programsButton()?.textContent).toContain("Beta")
        })
      },
    )
  })

  it("disappears when only one Program is left", async () => {
    await withOverlay(
      {
        items: [
          { id: 1, name: "Alpha" },
          { id: 2, name: "Beta" },
        ],
        selectedId: 1,
      },
      async ({ harness }) => {
        await vi.waitFor(() => {
          expect(programsButton()).not.toBeNull()
        })
        harness?.publish({ items: [{ id: 2, name: "Beta" }], selectedId: 2 })
        await vi.waitFor(() => {
          expect(programsButton()).toBeNull()
        })
      },
    )
  })

  it("asks the host to select the Program the user picks", async () => {
    await withOverlay(
      {
        items: [
          { id: 1, name: "Alpha" },
          { id: 2, name: "Beta" },
        ],
        selectedId: 1,
      },
      async ({ harness }) => {
        const button = await vi.waitFor(() => {
          const found = programsButton()
          expect(found).not.toBeNull()
          return found
        })
        button?.click()
        const option = await vi.waitFor(() => {
          const found = Array.from(
            overlayShadow().querySelectorAll<HTMLElement>('[role="option"]'),
          ).find(candidate => candidate.textContent?.includes("Beta"))
          expect(found).toBeDefined()
          return found
        })
        option?.click()
        await vi.waitFor(() => {
          expect(harness?.selected).toEqual([2])
        })
      },
    )
  })
})
