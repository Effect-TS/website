import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  computeBackoffDelayMs,
  LSP_CLIENT_TIMEOUT_MS,
  makeScratchpadSession,
  type LspStatus,
} from "../../../src/features/scratchpad/session.ts"
import {
  LspTransport,
  makeFakeLspTransport,
  type FakeLspTransportOptions,
} from "../../../src/features/scratchpad/transport.ts"

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
  test("starts connecting, configures LSPClient with 10_000 ms timeout, and transitions to ready after initialize", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      assert.deepEqual(ctx.getStatus(), { _tag: "connecting" })

      const clientRes = ctx.registry.get(ctx.session.clientAtom)
      assert.equal(clientRes._tag, "Success")
      if (clientRes._tag === "Success") {
        // Verify LSPClient timeout is 10_000 ms
        assert.equal(
          (clientRes.value as unknown as { timeout: number }).timeout,
          LSP_CLIENT_TIMEOUT_MS,
        )
        assert.equal(LSP_CLIENT_TIMEOUT_MS, 10_000)
      }

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

  test("LSPClient.initializing timeout and rejection stop the server and retry with backoff", async () => {
    const ctx = await setupTestSession({ autoHandshake: false })
    try {
      assert.deepEqual(ctx.getStatus(), { _tag: "connecting" })
      const firstInit = await Effect.runPromise(
        ctx.fake.controller.waitForRequest("initialize"),
      )
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.isConnected),
        true,
      )

      // Stall initialize past 10 s timeout -> stops the server and enters reconnecting
      await ctx.adjust("10 seconds")
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.isConnected),
        false,
      )
      assert.deepEqual(ctx.getStatus(), {
        _tag: "reconnecting",
        attempt: 1,
        maxAttempts: 5,
      })

      // Advance backoff -> reconnects and sends a fresh initialize
      await ctx.adjust("500 millis")
      const secondInit = await Effect.runPromise(
        ctx.fake.controller.waitForRequest("initialize"),
      )
      assert.notEqual(secondInit.id, firstInit.id)
      assert.equal(
        await Effect.runPromise(ctx.fake.controller.isConnected),
        true,
      )

      // Server rejects initialize with JSON-RPC error -> stops the server and retries (attempt 2)
      await Effect.runPromise(
        ctx.fake.controller.replyError(secondInit.id, {
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
        attempt: 2,
        maxAttempts: 5,
      })

      // Advance backoff -> next initialize succeeds -> ready
      await Effect.runPromise(ctx.fake.controller.setAutoHandshake(true))
      await ctx.adjust("1 second")
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("reconnecting clears pending outbound queue before client.disconnect and client.connect so stale frames never precede initialize", async () => {
    const ctx = await setupTestSession({ autoHandshake: true })
    try {
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      // Grab the underlying LspTransport to enqueue stale frames while disconnected
      const transportAtom = ctx.session.runtime.atom(LspTransport)
      const unmountTransport = ctx.registry.mount(transportAtom)
      await flushMicrotasks(10)
      const transportRes = ctx.registry.get(transportAtom)
      assert.equal(transportRes._tag, "Success")

      // The server fails for good
      await Effect.runPromise(ctx.fake.controller.crash("dropped"))
      await flushMicrotasks(20)
      assert.equal(ctx.getStatus()._tag, "error")

      // Queue stale frames while disconnected
      if (transportRes._tag === "Success") {
        transportRes.value.transport.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didChange",
            params: { stale: 1 },
          }),
        )
        transportRes.value.transport.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 999,
            method: "textDocument/hover",
            params: { stale: 2 },
          }),
        )
      }

      // Manual retry reconnects
      ctx.registry.set(ctx.session.reconnectAtom, undefined)
      await flushMicrotasks(20)
      assert.deepEqual(ctx.getStatus(), { _tag: "ready" })

      const msgsOnNewConn = await Effect.runPromise(
        ctx.fake.controller.currentConnectionMessages,
      )
      assert.ok(msgsOnNewConn.length >= 1)
      assert.equal(msgsOnNewConn[0]!.method, "initialize")
      assert.equal(
        msgsOnNewConn.some(
          (m) =>
            m.method === "textDocument/didChange" ||
            m.method === "textDocument/hover",
        ),
        false,
      )

      unmountTransport()
    } finally {
      ctx.dispose()
    }
  })
})
