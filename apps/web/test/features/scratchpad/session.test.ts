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
  type LspStatus,
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
  const statusHistory: Array<LspStatus> = []
  const unsubStatus = registry.subscribe(
    session.statusAtom,
    (s) => statusHistory.push(s),
    { immediate: true },
  )
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
    statusHistory,
    adjust,
    dispose,
    getStatus: () => registry.get(session.statusAtom),
  }
}

describe("ScratchpadSession", () => {
  test("starts connecting and transitions to ready after initialize", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      assert.deepEqual(ctx.getStatus(), { _tag: "connecting" })

      const initReq = await Effect.runPromise(
        ctx.fake.controller.waitForRequest("initialize"),
      )
      assert.deepEqual(ctx.getStatus(), { _tag: "connecting" })

      await Effect.runPromise(ctx.fake.controller.replyToInitialize(initReq.id))
      await flushMicrotasks(20)

      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("initialize failures retry with jittered exponential backoff up to 5 attempts, then enter a retryable error that a manual retry clears", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      await Effect.runPromise(ctx.fake.controller.stallRequest("initialize"))

      for (let attempt = 1; attempt <= 5; attempt++) {
        // initialize times out -> backoff attempt N of 5
        await ctx.adjust("10 seconds")
        assert.deepEqual(ctx.getStatus(), {
          _tag: "reconnecting",
          attempt,
          maxAttempts: 5,
        })
        // The jittered delay is at most 500 ms * 2^(N - 1)
        const opensBefore = await Effect.runPromise(
          ctx.fake.controller.openCount,
        )
        await ctx.adjust(Math.min(10_000, 500 * 2 ** (attempt - 1)))
        assert.equal(
          await Effect.runPromise(ctx.fake.controller.openCount),
          opensBefore + 1,
        )
      }

      // The 6th failure exhausts the retry budget
      await ctx.adjust("10 seconds")
      const exhausted = ctx.getStatus()
      assert.equal(exhausted._tag, "error")
      if (exhausted._tag === "error") {
        assert.equal(exhausted.code, "unreachable")
        assert.equal(exhausted.retryable, true)
      }

      // No further automatic retries
      const opensAtExhaustion = await Effect.runPromise(
        ctx.fake.controller.openCount,
      )
      await ctx.adjust("60 seconds")
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.openCount),
        opensAtExhaustion,
      )

      // A manual retry starts over and reaches ready
      await Effect.runPromise(ctx.fake.controller.unstallRequest("initialize"))
      await Effect.runPromise(ctx.fake.controller.setAutoHandshake(true))
      ctx.registry.set(ctx.session.reconnectAtom, undefined)
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("a fatal error shows a retryable crashed error without backoff; a manual retry restarts the server", async () => {
    const ctx = await setupTestSession({ autoHandshake: true })
    try {
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      await Effect.runPromise(ctx.fake.controller.crash("wasm trap"))
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), {
        _tag: "error",
        code: "crashed",
        message: "wasm trap",
        retryable: true,
      })

      const opensAfterCrash = await Effect.runPromise(
        ctx.fake.controller.openCount,
      )
      await ctx.adjust("60 seconds")
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.openCount),
        opensAfterCrash,
      )

      ctx.registry.set(ctx.session.reconnectAtom, undefined)
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.openCount),
        opensAfterCrash + 1,
      )
    } finally {
      ctx.dispose()
    }
  })

  test("backoff delay doubles from 500 ms and caps at 10 s with jitter", () => {
    // At randomUnit = 1 (upper bound of equal jitter [0.5 * raw, raw])
    assert.equal(computeBackoffDelayMs(1, 1), 500)
    assert.equal(computeBackoffDelayMs(2, 1), 1_000)
    assert.equal(computeBackoffDelayMs(3, 1), 2_000)
    assert.equal(computeBackoffDelayMs(4, 1), 4_000)
    assert.equal(computeBackoffDelayMs(5, 1), 8_000)
    assert.equal(computeBackoffDelayMs(6, 1), 10_000)
    assert.equal(computeBackoffDelayMs(10, 1), 10_000)

    // At randomUnit = 0 (lower bound of equal jitter [0.5 * raw, raw])
    assert.equal(computeBackoffDelayMs(1, 0), 250)
    assert.equal(computeBackoffDelayMs(6, 0), 5_000)
  })

  test("an initialize rejection stops the server and retries with backoff", async () => {
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
      await flushMicrotasks(20)
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.isConnected),
        false,
      )
      assert.deepEqual(ctx.getStatus(), {
        _tag: "reconnecting",
        attempt: 1,
        maxAttempts: 5,
      })

      // The backoff elapses -> a fresh initialize succeeds -> ready
      await Effect.runPromise(ctx.fake.controller.setAutoHandshake(true))
      await ctx.adjust("500 millis")
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })
})
