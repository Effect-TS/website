import { assert, describe, test } from "vite-plus/test"
import { describeLspStatus } from "../../../src/features/scratchpad/status.ts"

describe("describeLspStatus", () => {
  test("renders connecting, ready, and reconnecting as non-interactive states", () => {
    const connecting = describeLspStatus({ _tag: "connecting" })
    assert.equal(connecting.state, "connecting")
    assert.equal(connecting.interactive, false)
    assert.equal(connecting.tone, "neutral")
    assert.isTrue(connecting.label.toLowerCase().includes("connect"))

    const ready = describeLspStatus({ _tag: "ready" })
    assert.equal(ready.state, "ready")
    assert.equal(ready.interactive, false)
    assert.equal(ready.tone, "success")
    assert.equal(ready.label, "Ready")

    const reconnecting = describeLspStatus({
      _tag: "reconnecting",
      attempt: 2,
      maxAttempts: 5,
    })
    assert.equal(reconnecting.state, "reconnecting")
    assert.equal(reconnecting.interactive, false)
    assert.equal(reconnecting.tone, "warning")
    assert.isTrue(reconnecting.label.includes("2/5"))
  })

  test("renders idle as interactive so clicking wakes the session", () => {
    const idle = describeLspStatus({ _tag: "idle" })
    assert.equal(idle.state, "idle")
    assert.equal(idle.interactive, true)
    assert.equal(idle.tone, "neutral")
    assert.isTrue(idle.label.toLowerCase().includes("idle"))
    assert.isDefined(idle.actionLabel)
  })

  test("renders error states with retryable flag controlling interactivity", () => {
    const capacity = describeLspStatus({
      _tag: "error",
      code: "capacity",
      message: "Language server is at capacity.",
      retryable: true,
    })
    assert.equal(capacity.state, "error")
    assert.equal(capacity.interactive, true)
    assert.equal(capacity.tone, "error")
    assert.isDefined(capacity.actionLabel)
    assert.isTrue(capacity.detail.includes("capacity"))

    const tooLargeBlocked = describeLspStatus({
      _tag: "error",
      code: "doc-too-large",
      message: "Document exceeds the 256 KiB limit.",
      retryable: false,
    })
    assert.equal(tooLargeBlocked.state, "error")
    assert.equal(tooLargeBlocked.interactive, false)
    assert.equal(tooLargeBlocked.tone, "error")
    assert.isUndefined(tooLargeBlocked.actionLabel)

    const tooLargeRetryable = describeLspStatus({
      _tag: "error",
      code: "doc-too-large",
      message: "Document exceeds the 256 KiB limit.",
      retryable: true,
    })
    assert.equal(tooLargeRetryable.state, "error")
    assert.equal(tooLargeRetryable.interactive, true)
    assert.isDefined(tooLargeRetryable.actionLabel)

    const policy = describeLspStatus({
      _tag: "error",
      code: "policy",
      message: "Connection rejected by server policy.",
      retryable: false,
    })
    assert.equal(policy.state, "error")
    assert.equal(policy.interactive, false)

    const unreachable = describeLspStatus({
      _tag: "error",
      code: "unreachable",
      message: "Unable to connect to language server.",
      retryable: true,
    })
    assert.equal(unreachable.state, "error")
    assert.equal(unreachable.interactive, true)
  })
})
