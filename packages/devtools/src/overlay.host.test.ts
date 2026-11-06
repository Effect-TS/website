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
  DevToolsControllerPort,
  DevToolsControllerEvent,
  DevToolsControllerRequest,
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

const makeController = () => {
  const listeners = new Set<(request: DevToolsControllerRequest) => void>()
  const events: Array<DevToolsControllerEvent> = []
  const controller: DevToolsControllerPort = {
    requests: Stream.callback<DevToolsControllerRequest>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const listener = (request: DevToolsControllerRequest) => {
            Queue.offerUnsafe(queue, request)
          }
          listeners.add(listener)
          return listener
        }),
        listener => Effect.sync(() => listeners.delete(listener)),
      ),
    ),
    report: event => {
      events.push(event)
    },
  }
  return {
    controller,
    events,
    request: (request: DevToolsControllerRequest) =>
      listeners.forEach(listener => listener(request)),
  }
}

const startOverlay = (
  store: DevToolsStore,
  programs?: DevToolsPrograms,
  controller?: DevToolsControllerPort,
  showBadge?: boolean,
) =>
  Effect.runFork(
    Effect.scoped(
      Effect.gen(function* () {
        yield* createOverlay(
          store,
          "BottomRight",
          "TimeTravel",
          Option.none(),
          programs,
          controller,
          showBadge === undefined ? undefined : { showBadge },
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

const withController = async (
  options: Readonly<{
    isOpen: boolean
    storeState?: StoreState
    resume?: Effect.Effect<void>
    showBadge?: boolean
  }>,
  run: (harness: ReturnType<typeof makeController>) => Promise<void>,
) => {
  localStorage.setItem(
    "foldkit-devtools",
    JSON.stringify({ isOpen: options.isOpen, isFlattened: true }),
  )
  const stateRef = await Effect.runPromise(
    SubscriptionRef.make(options.storeState ?? initialStoreState),
  )
  const harness = makeController()
  const store = {
    ...makeStore(stateRef),
    ...(options.resume === undefined ? {} : { resume: options.resume }),
  }
  const fiber = startOverlay(
    store,
    undefined,
    harness.controller,
    options.showBadge,
  )
  try {
    await vi.waitFor(() => {
      if (options.isOpen) {
        expect(overlayShadow().querySelector(".dt-panel")).not.toBeNull()
      } else {
        expect(overlayShadow()).toBeDefined()
      }
    })
    await run(harness)
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

const panel = () => overlayShadow().querySelector(".dt-panel")
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe("Controller", () => {
  it("opens the Panel on request and reports Opened", async () => {
    await withController({ isOpen: false }, async (harness) => {
      expect(panel()).toBeNull()
      harness.events.length = 0
      await vi.waitFor(() => {
        harness.request("Open")
        expect(panel()).not.toBeNull()
      })
      expect(harness.events).toEqual([{ _tag: "Opened" }])
    })
  })

  it("reports its starting state when it mounts", async () => {
    await withController({ isOpen: true }, async (harness) => {
      await vi.waitFor(() => {
        expect(harness.events).toEqual([{ _tag: "Opened" }])
      })
    })
    await withController({ isOpen: false }, async (harness) => {
      await vi.waitFor(() => {
        expect(harness.events).toEqual([{ _tag: "Closed" }])
      })
    })
  })

  it("closes the Panel on request and reports Closed", async () => {
    await withController({ isOpen: true }, async (harness) => {
      expect(panel()).not.toBeNull()
      harness.events.length = 0
      await vi.waitFor(() => {
        harness.request("Close")
        expect(panel()).toBeNull()
      })
      expect(harness.events).toEqual([{ _tag: "Closed" }])
    })
  })

  it("reports nothing when the Panel is already in the requested state", async () => {
    await withController({ isOpen: true }, async (harness) => {
      harness.events.length = 0
      harness.request("Open")
      await settle()
      expect(harness.events).toEqual([])
    })
  })

  it("resumes a paused Program before it closes the Panel", async () => {
    const resumed: Array<string> = []
    await withController(
      {
        isOpen: true,
        storeState: { ...initialStoreState, isPaused: true },
        resume: Effect.sync(() => {
          resumed.push("resume")
        }),
      },
      async (harness) => {
        await vi.waitFor(() => {
          harness.request("Close")
          expect(panel()).toBeNull()
        })
        expect(resumed.length).toBeGreaterThan(0)
      },
    )
  })

  it("does not resume a running Program", async () => {
    const resumed: Array<string> = []
    await withController(
      {
        isOpen: true,
        resume: Effect.sync(() => {
          resumed.push("resume")
        }),
      },
      async (harness) => {
        await vi.waitFor(() => {
          harness.request("Close")
          expect(panel()).toBeNull()
        })
        expect(resumed).toEqual([])
      },
    )
  })

  it("hides the Badge when showBadge is false", async () => {
    await withController(
      { isOpen: false, showBadge: false },
      async () => {
        await settle()
        expect(overlayShadow().querySelector(".dt-badge")).toBeNull()
      },
    )
  })

  it("resumes a paused Program when the Overlay is torn down", async () => {
    const resumed: Array<string> = []
    await withController(
      {
        isOpen: true,
        storeState: { ...initialStoreState, isPaused: true },
        resume: Effect.sync(() => {
          resumed.push("resume")
        }),
      },
      async () => {},
    )
    expect(resumed.length).toBeGreaterThan(0)
  })
})
