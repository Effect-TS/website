import { assert, describe, test } from "vite-plus/test"
import {
  ContainerBootFailed,
  ContainerUnsupported,
  InstallFailed,
} from "../../../src/features/scratchpad/container.ts"
import type { LspStatus } from "../../../src/features/scratchpad/session.ts"
import {
  describeContainerStatus,
  describeReadiness,
} from "../../../src/features/scratchpad/status.ts"

describe("describeContainerStatus", () => {
  test("a live Run counts as running only in a phase that can run code", () => {
    const running = describeContainerStatus({ _tag: "ready" }, true)
    assert.equal(running.state, "ready", "the phase stays readable")
    assert.isTrue(running.running)
    assert.isFalse(describeContainerStatus({ _tag: "ready" }, false).running)
    assert.isTrue(
      describeContainerStatus(
        { _tag: "dependencies-unavailable", reason: "No types." },
        true,
      ).running,
    )
    assert.isFalse(
      describeContainerStatus({ _tag: "installing" }, true).running,
    )
  })
})

describe("describeReadiness", () => {
  const ready: LspStatus = { _tag: "ready" }
  const states = (view: ReturnType<typeof describeReadiness>) =>
    view.steps.map((step) => `${step.label}:${step.state}`)
  const actions = (view: ReturnType<typeof describeReadiness>) =>
    view.actions.map((action) => action._tag)

  test("busy while anything starts, with a checklist of the steps", () => {
    const view = describeReadiness(ready, { _tag: "installing" }, false)
    assert.equal(view.icon, "busy")
    assert.deepEqual(states(view), [
      "Language server:done",
      "Container booted:done",
      "Installing dependencies:busy",
      "Loading types:pending",
    ])
    assert.deepEqual(view.actions, [])

    const downloading = describeReadiness(
      {
        _tag: "loading",
        phase: "downloading",
        loadedBytes: 2 * 1024 * 1024,
        totalBytes: 4 * 1024 * 1024,
      },
      { _tag: "ready" },
      false,
    )
    assert.equal(downloading.icon, "busy")
    assert.equal(downloading.steps[0]?.state, "busy")
    assert.include(downloading.steps[0]?.detail, "50%")
  })

  test("ready, running, and editor-only without a Container", () => {
    assert.equal(
      describeReadiness(ready, { _tag: "ready" }, false).icon,
      "ready",
    )
    assert.equal(
      describeReadiness(ready, { _tag: "ready" }, true).icon,
      "running",
    )
    assert.deepEqual(states(describeReadiness(ready, undefined, false)), [
      "Language server:done",
    ])
  })

  test("a failed install is an error offering a retry, and skips loading types", () => {
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
    assert.deepEqual(states(view), [
      "Language server:done",
      "Container booted:done",
      "Installing dependencies:error",
      "Loading types:skipped",
    ])
    assert.deepEqual(actions(view), ["RetryContainer", "ShowFailure"])
  })

  test("a failed boot is an error offering a retry; an unsupported browser only warns and offers none", () => {
    const failed = describeReadiness(
      ready,
      { _tag: "failed", error: new ContainerBootFailed({ message: "boom" }) },
      false,
    )
    assert.equal(failed.icon, "error")
    assert.deepEqual(states(failed).slice(1), [
      "Container booted:error",
      "Installing dependencies:skipped",
      "Loading types:skipped",
    ])
    assert.deepEqual(actions(failed), ["RetryContainer", "ShowFailure"])

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
    assert.deepEqual(actions(unsupported), ["BrowserSupport", "ShowFailure"])
  })

  test("missing types and a recovered language server warn, naming the reason and the file", () => {
    const noTypes = describeReadiness(
      ready,
      { _tag: "dependencies-unavailable", reason: "Timed out." },
      false,
    )
    assert.equal(noTypes.icon, "warning")
    assert.equal(noTypes.steps[3]?.state, "warning")
    assert.equal(noTypes.steps[3]?.detail, "Timed out.")

    const recovered = describeReadiness(
      {
        _tag: "recovered",
        recovery: {
          reason: "RuntimeError: unreachable",
          method: "textDocument/diagnostic",
          uri: "file:///workspace/src/deep%20one.ts",
          ms: 400,
          quarantined: ["file:///workspace/src/deep%20one.ts"],
        },
      },
      { _tag: "ready" },
      false,
    )
    assert.equal(recovered.icon, "warning")
    assert.equal(recovered.steps[0]?.state, "warning")
    assert.include(recovered.steps[0]?.detail, "deep one.ts")
  })

  test("a stopped language server is an error, with a restart only when it can be retried", () => {
    const stopped = (retryable: boolean) =>
      describeReadiness(
        {
          _tag: "error",
          code: "crashed",
          message: "The language server stopped.",
          retryable,
        },
        { _tag: "ready" },
        false,
      )
    assert.equal(stopped(true).icon, "error")
    assert.deepEqual(actions(stopped(true)), ["RestartLsp"])
    assert.deepEqual(actions(stopped(false)), [])
  })
})
