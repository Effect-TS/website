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
    assert.deepEqual(
      [
        describeContainerStatus({ _tag: "ready" }, true).running,
        describeContainerStatus({ _tag: "ready" }, false).running,
        describeContainerStatus(
          { _tag: "dependencies-unavailable", reason: "No types." },
          true,
        ).running,
        describeContainerStatus({ _tag: "installing" }, true).running,
      ],
      [true, false, true, false],
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
    assert.deepEqual(
      [view.icon, ...states(view)],
      [
        "busy",
        "Language server:done",
        "Container booted:done",
        "Installing dependencies:busy",
        "Loading types:pending",
      ],
    )
  })

  test("ready, running, and editor-only without a Container", () => {
    assert.deepEqual(
      [
        describeReadiness(ready, { _tag: "ready" }, false).icon,
        describeReadiness(ready, { _tag: "ready" }, true).icon,
        states(describeReadiness(ready, undefined, false)),
      ],
      ["ready", "running", ["Language server:done"]],
    )
  })

  test("a failed boot or install is an error offering a retry", () => {
    const summary = (view: ReturnType<typeof describeReadiness>) => [
      view.icon,
      actions(view),
    ]
    assert.deepEqual(
      [
        summary(
          describeReadiness(
            ready,
            {
              _tag: "failed",
              error: new ContainerBootFailed({ message: "boom" }),
            },
            false,
          ),
        ),
        summary(
          describeReadiness(
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
          ),
        ),
      ],
      [
        ["error", ["RetryContainer", "ShowFailure"]],
        ["error", ["RetryContainer", "ShowFailure"]],
      ],
    )
  })

  test("an unsupported browser only warns, offering browser-support help instead of a retry", () => {
    const view = describeReadiness(
      ready,
      {
        _tag: "failed",
        error: new ContainerUnsupported({ message: "No isolation." }),
      },
      false,
    )
    assert.deepEqual(
      [view.icon, actions(view)],
      ["warning", ["BrowserSupport", "ShowFailure"]],
    )
  })

  test("missing types and a recovered language server warn", () => {
    const noTypes = describeReadiness(
      ready,
      { _tag: "dependencies-unavailable", reason: "Timed out." },
      false,
    )
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
    assert.deepEqual([noTypes.icon, recovered.icon], ["warning", "warning"])
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
    assert.deepEqual(
      [stopped(true).icon, actions(stopped(true)), actions(stopped(false))],
      ["error", ["RestartLsp"], []],
    )
  })
})
