import { assert, describe, test } from "vite-plus/test"
import {
  ContainerBootFailed,
  ContainerUnsupported,
  InstallFailed,
} from "../../../src/features/scratchpad/container.ts"
import {
  describeContainerPhase,
  describeLspStatus,
} from "../../../src/features/scratchpad/status.ts"

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

  test("renders error states with retryable flag controlling interactivity", () => {
    const unreachableBlocked = describeLspStatus({
      _tag: "error",
      code: "unreachable",
      message: "Unable to connect to language server.",
      retryable: false,
    })
    assert.equal(unreachableBlocked.state, "error")
    assert.equal(unreachableBlocked.interactive, false)
    assert.equal(unreachableBlocked.tone, "error")
    assert.isUndefined(unreachableBlocked.actionLabel)

    const unreachable = describeLspStatus({
      _tag: "error",
      code: "unreachable",
      message: "Unable to connect to language server.",
      retryable: true,
    })
    assert.equal(unreachable.state, "error")
    assert.equal(unreachable.interactive, true)
    assert.equal(unreachable.actionLabel, "Retry connection")
    assert.isTrue(unreachable.detail.includes("Unable to connect"))
  })

  test("renders the in-browser server's loading phases, recovery and crash", () => {
    const downloading = describeLspStatus({
      _tag: "loading",
      phase: "downloading",
      loadedBytes: 2 * 1024 * 1024,
      totalBytes: 4 * 1024 * 1024,
    })
    assert.equal(downloading.state, "loading")
    assert.equal(downloading.label, "Downloading 50%…")
    assert.include(downloading.detail, "2.0 MB of 4.0 MB")
    assert.equal(downloading.interactive, false)

    assert.equal(
      describeLspStatus({
        _tag: "loading",
        phase: "compiling",
        loadedBytes: 1,
        totalBytes: 1,
      }).label,
      "Compiling…",
    )
    assert.equal(
      describeLspStatus({
        _tag: "loading",
        phase: "starting",
        loadedBytes: 1,
        totalBytes: 1,
      }).label,
      "Starting…",
    )

    const recovered = describeLspStatus({
      _tag: "recovered",
      recovery: {
        reason: "RangeError: Maximum call stack size exceeded",
        method: "textDocument/didChange",
        uri: "file:///workspace/src/deep%20one.ts",
        ms: 412.4,
        quarantined: ["file:///workspace/src/deep%20one.ts"],
      },
    })
    assert.equal(recovered.state, "recovered")
    assert.equal(recovered.tone, "warning")
    assert.equal(recovered.interactive, false)
    assert.include(recovered.detail, "restarted in 412 ms")
    assert.include(recovered.detail, "deep one.ts until its next edit")

    const crashed = describeLspStatus({
      _tag: "error",
      code: "crashed",
      message: "Fetching /lsp.wasm failed with 404",
      retryable: true,
    })
    assert.equal(crashed.interactive, true)
    assert.equal(crashed.actionLabel, "Restart language server")
    assert.include(crashed.detail, "404")
  })
})

describe("describeContainerPhase", () => {
  test("labels booting, ready and the two failures", () => {
    assert.equal(describeContainerPhase({ _tag: "booting" }).tone, "neutral")
    assert.equal(describeContainerPhase({ _tag: "ready" }).tone, "success")
    const unsupported = describeContainerPhase({
      _tag: "failed",
      error: new ContainerUnsupported({ message: "No isolation." }),
    })
    assert.equal(unsupported.tone, "error")
    assert.equal(unsupported.label, "Can't run here")
    assert.include(unsupported.detail, "Editing still works")
    const failed = describeContainerPhase({
      _tag: "failed",
      error: new ContainerBootFailed({ message: "boom" }),
    })
    assert.equal(failed.label, "Container failed")
  })

  test("labels the install and types phases, and pulses while busy", () => {
    const installing = describeContainerPhase({ _tag: "installing" })
    assert.equal(installing.label, "Installing…")
    assert.isTrue(installing.busy)
    const loading = describeContainerPhase({ _tag: "loading-types" })
    assert.equal(loading.label, "Loading types…")
    assert.isTrue(loading.busy)
    assert.isFalse(describeContainerPhase({ _tag: "ready" }).busy)

    const installFailed = describeContainerPhase({
      _tag: "install-failed",
      error: new InstallFailed({
        exitCode: 1,
        outputTail: "ERR_PNPM",
        message: "pnpm install exited with code 1.",
      }),
    })
    assert.equal(installFailed.label, "Install failed")
    assert.equal(installFailed.tone, "error")
    assert.include(installFailed.detail, "exited with code 1")

    const unavailable = describeContainerPhase({
      _tag: "dependencies-unavailable",
      reason: "Installed types did not reach the editor in time.",
    })
    assert.equal(unavailable.state, "dependencies-unavailable")
    assert.equal(unavailable.label, "Dependencies unavailable")
    assert.equal(unavailable.tone, "warning")
    assert.include(unavailable.detail, "did not reach the editor")
  })
})
