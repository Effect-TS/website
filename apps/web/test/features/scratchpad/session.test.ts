import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  computeBackoffDelayMs,
  makeScratchpadSession,
} from "../../../src/features/scratchpad/session.ts"
import {
  makeFakeLspTransport,
  type FakeLspTransportOptions,
} from "./fake-transport.ts"

const flushMicrotasks = async (ticks = 10) => {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve()
  }
}

const setupTestSession = async (
  fakeOptions?: FakeLspTransportOptions,
  sessionOptions?: {
    readonly maxAttempts?: number
    readonly baseDelayMs?: number
    readonly maxDelayMs?: number
  },
) => {
  const fake = makeFakeLspTransport(fakeOptions)
  const layer = Layer.merge(fake.layer, TestClock.layer())
  const session = makeScratchpadSession({
    transportLayer: layer,
    rootUri: "file:///workspace",
    ...sessionOptions,
  })

  const clockAtom = session.runtime.atom(Clock.Clock)
  const registry = AtomRegistry.make()
  const unsubStatus = registry.subscribe(session.statusAtom, () => {}, {
    immediate: true,
  })
  const unmountClient = registry.mount(session.clientAtom)
  const unmountClock = registry.mount(clockAtom)

  await flushMicrotasks(20)

  const getTestClock = (): TestClock.TestClock => {
    const res = registry.get(clockAtom)
    if (res._tag !== "Success") {
      throw new Error(`Expected TestClock to be ready, got ${res._tag}`)
    }
    return res.value as TestClock.TestClock
  }

  const adjust = async (duration: Duration.Input) => {
    await Effect.runPromise(getTestClock().adjust(duration))
    await flushMicrotasks(20)
  }

  const dispose = () => {
    unsubStatus()
    unmountClock()
    unmountClient()
    registry.dispose()
  }

  return {
    fake,
    session,
    registry,
    adjust,
    dispose,
    getStatus: () => registry.get(session.statusAtom),
  }
}

describe("ScratchpadSession", () => {
  test("an initialize that keeps timing out gives up after 5 retries with a retryable unreachable error", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      await Effect.runPromise(ctx.fake.controller.stallRequest("initialize"))
      for (let attempt = 1; attempt <= 6; attempt++) {
        await ctx.adjust("10 seconds") // the initialize timeout
        await ctx.adjust("10 seconds") // the longest backoff
      }
      assert.deepInclude(ctx.getStatus(), {
        _tag: "error",
        code: "unreachable",
        retryable: true,
      })
    } finally {
      ctx.dispose()
    }
  })

  test("an initialize rejection retries and reaches ready once the server accepts", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      const init = await Effect.runPromise(
        ctx.fake.controller.waitForRequest("initialize"),
      )
      await Effect.runPromise(
        ctx.fake.controller.replyError(init.id, {
          code: -32603,
          message: "tsrs init failed",
        }),
      )
      await Effect.runPromise(ctx.fake.controller.setAutoHandshake(true))
      await ctx.adjust("500 millis")
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("a crash shows a retryable crashed error and does not retry on its own", async () => {
    const ctx = await setupTestSession({ autoHandshake: true })
    try {
      await Effect.runPromise(ctx.fake.controller.crash("wasm trap"))
      await ctx.adjust("60 seconds")
      assert.deepEqual(ctx.getStatus(), {
        _tag: "error",
        code: "crashed",
        message: "wasm trap",
        retryable: true,
      })
    } finally {
      ctx.dispose()
    }
  })

  test("a manual retry after a crash restarts the server and reaches ready", async () => {
    const ctx = await setupTestSession({ autoHandshake: true })
    try {
      await Effect.runPromise(ctx.fake.controller.crash("wasm trap"))
      await flushMicrotasks(20)
      ctx.registry.set(ctx.session.reconnectAtom, undefined)
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("backoff delay doubles from 500 ms and caps at 10 s", () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6].map((attempt) => computeBackoffDelayMs(attempt, 1)),
      [500, 1_000, 2_000, 4_000, 8_000, 10_000],
    )
  })
})
