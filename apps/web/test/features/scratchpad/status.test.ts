import { assert, describe, test } from "vite-plus/test"
import {
  ContainerBootFailed,
  ContainerUnsupported,
  InstallFailed,
} from "../../../src/features/scratchpad/container.ts"
import type { LspStatus } from "../../../src/features/scratchpad/session.ts"
import {
  describeContainerPhase,
  describeContainerStatus,
  describeLspStatus,
  describeReadiness,
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

describe("describeContainerStatus", () => {
  test("shows a live Run as running, over the ready phases only", () => {
    const running = describeContainerStatus({ _tag: "ready" }, true)
    assert.equal(running.state, "ready", "the phase stays readable")
    assert.isTrue(running.running)
    assert.equal(running.label, "Running")
    assert.equal(running.tone, "info")
    assert.isTrue(running.busy)

    const idle = describeContainerStatus({ _tag: "ready" }, false)
    assert.isFalse(idle.running)
    assert.equal(idle.label, "Container ready")

    const unavailable = describeContainerStatus(
      { _tag: "dependencies-unavailable", reason: "No types." },
      true,
    )
    assert.equal(unavailable.label, "Running")
    assert.equal(unavailable.tone, "warning", "still flags missing types")
    assert.include(unavailable.detail, "No types.")

    const installing = describeContainerStatus({ _tag: "installing" }, true)
    assert.isFalse(installing.running)
    assert.equal(installing.label, "Installing…")
  })
})

describe("describeReadiness", () => {
  const ready: LspStatus = { _tag: "ready" }
  const states = (view: ReturnType<typeof describeReadiness>) =>
    view.steps.map((step) => `${step.label}:${step.state}`)

  test("busy while anything starts, with a checklist of the steps", () => {
    const view = describeReadiness(ready, { _tag: "installing" }, false)
    assert.equal(view.icon, "busy")
    assert.equal(view.title, "Getting ready")
    assert.deepEqual(states(view), [
      "Language server:done",
      "Container booted:done",
      "Installing dependencies:busy",
      "Loading types:pending",
    ])
    assert.deepEqual(view.actions, [])
  })

  test("ready, running, and editor-only without a Container", () => {
    assert.equal(
      describeReadiness(ready, { _tag: "ready" }, false).icon,
      "ready",
    )
    const running = describeReadiness(ready, { _tag: "ready" }, true)
    assert.equal(running.icon, "running")
    assert.equal(running.title, "Running src/main.ts")
    assert.deepEqual(states(describeReadiness(ready, undefined, false)), [
      "Language server:done",
    ])
  })

  test("a failed install is an error with Retry install and the step's reason", () => {
    const view = describeReadiness(
      ready,
      {
        _tag: "install-failed",
        error: new InstallFailed({
          exitCode: 1,
          outputTail: "ERR_PNPM",
          message: "pnpm install failed",
        }),
      },
      false,
    )
    assert.equal(view.icon, "error")
    assert.equal(view.title, "Can't run code")
    assert.deepEqual(states(view), [
      "Language server:done",
      "Container booted:done",
      "Installing dependencies:error",
      "Loading types:skipped",
    ])
    assert.equal(view.steps[2]?.detail, "pnpm install exited with code 1")
    assert.deepEqual(
      view.actions.map((action) => action._tag),
      ["RetryContainer", "ShowFailure"],
    )
  })

  test("a failed boot is an error; an unsupported browser only warns", () => {
    const failed = describeReadiness(
      ready,
      { _tag: "failed", error: new ContainerBootFailed({ message: "boom" }) },
      false,
    )
    assert.equal(failed.icon, "error")
    assert.equal(failed.message, "Editing, sharing and autosave still work.")
    assert.deepEqual(states(failed).slice(1), [
      "Container booted:error",
      "Installing dependencies:skipped",
      "Loading types:skipped",
    ])

    const unsupported = describeReadiness(
      ready,
      {
        _tag: "failed",
        error: new ContainerUnsupported({ message: "No isolation." }),
      },
      false,
    )
    assert.equal(unsupported.icon, "warning")
    assert.deepEqual(states(unsupported), [
      "Language server:done",
      "Container:warning",
    ])
    assert.notInclude(
      unsupported.actions.map((action) => action._tag),
      "RetryContainer",
    )
  })

  test("missing types and a recovered language server warn", () => {
    const noTypes = describeReadiness(
      ready,
      { _tag: "dependencies-unavailable", reason: "Timed out." },
      false,
    )
    assert.equal(noTypes.icon, "warning")
    assert.equal(noTypes.title, "Ready, without package types")
    assert.equal(noTypes.steps[3]?.detail, "Timed out.")

    const recovered = describeReadiness(
      {
        _tag: "recovered",
        recovery: {
          reason: "RuntimeError: unreachable",
          method: "textDocument/diagnostic",
          uri: "file:///workspace/src/main.ts",
          ms: 400,
          quarantined: ["file:///workspace/src/main.ts"],
        },
      },
      { _tag: "ready" },
      false,
    )
    assert.equal(recovered.icon, "warning")
    assert.match(recovered.steps[0]!.detail!, /main\.ts crashed it/)
  })

  test("a stopped language server is an error with a restart action", () => {
    const view = describeReadiness(
      {
        _tag: "error",
        code: "crashed",
        message: "The language server stopped.",
        retryable: true,
      },
      { _tag: "ready" },
      false,
    )
    assert.equal(view.icon, "error")
    assert.equal(view.title, "Type checking stopped")
    assert.deepEqual(view.actions, [
      { _tag: "RestartLsp", label: "Restart language server" },
    ])
  })
})
