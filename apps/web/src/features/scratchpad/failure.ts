/**
 * Container failures as the Scratchpad shows them (ticket 10, variant B2 from
 * ticket 03): a strip across the top of the Output panel with a
 * plain-language explanation, Retry where it can help, browser-support help
 * and dismiss. The strip covers nothing. The pnpm output of a failed install
 * is printed by the Output panel as ordinary output, not by the strip.
 *
 * "Dependencies unavailable" (installed, but types never reached the editor)
 * is not a failure here: it gets the status badge plus one output line.
 */
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Atom from "effect/reactivity/Atom"
import {
  Container,
  type ContainerBootError,
  type ContainerPhase,
  type InstallFailed,
} from "./container.ts"
import { Dependencies } from "./dependencies.ts"

export const BROWSER_SUPPORT_URL =
  "https://webcontainers.io/guides/browser-support"

export type ContainerFailureKind =
  | "unsupported"
  | "boot-failed"
  | "install-failed"

export interface ContainerFailure {
  readonly kind: ContainerFailureKind
  readonly title: string
  /** Plain-language explanation, one or two sentences. */
  readonly message: string
  /** The underlying error message, for a tooltip. */
  readonly detail: string
  /** Whether Retry can help. Never for an unsupported browser. */
  readonly canRetry: boolean
  readonly retryLabel: string
  readonly helpUrl: string | undefined
  readonly helpLabel: string | undefined
  /** Identifies this failure: dismissing it hides the strip until a new failure. */
  readonly error: ContainerBootError | InstallFailed
}

/** The failure a phase shows as a strip, if any. */
export const containerFailureOf = (
  phase: ContainerPhase,
): Option.Option<ContainerFailure> => {
  switch (phase._tag) {
    case "failed":
      return Option.some(
        phase.error._tag === "ContainerUnsupported"
          ? {
              kind: "unsupported",
              title: "This browser can't run code here",
              message:
                "Running code needs WebContainers, which work in Chromium-based browsers such as Chrome, Edge, Brave and Arc. You can keep editing, and type checking still works.",
              detail: phase.error.message,
              canRetry: false,
              retryLabel: "Retry",
              helpUrl: BROWSER_SUPPORT_URL,
              helpLabel: "Browser support",
              error: phase.error,
            }
          : {
              kind: "boot-failed",
              title: "The runtime didn't start",
              message:
                "The in-browser Node.js runtime failed to boot. A browser extension or a privacy setting that blocks site storage is the usual cause. Your code is safe, and type checking still works.",
              detail: phase.error.message,
              canRetry: true,
              retryLabel: "Retry",
              helpUrl: BROWSER_SUPPORT_URL,
              helpLabel: "Browser support",
              error: phase.error,
            },
      )
    case "install-failed":
      return Option.some({
        kind: "install-failed",
        title: "Installing dependencies failed",
        message:
          phase.error.exitCode === -1
            ? "pnpm install couldn't start, so nothing can run yet. You can keep editing, and type checking still works."
            : `pnpm install exited with code ${phase.error.exitCode}, so nothing can run yet. A misspelled package name in package.json is the most common cause.`,
        detail: phase.error.message,
        canRetry: true,
        retryLabel: "Retry install",
        helpUrl: undefined,
        helpLabel: undefined,
        error: phase.error,
      })
    default:
      return Option.none()
  }
}

/**
 * The output panel's one line for "dependencies unavailable": Runs keep
 * working, so there is no strip.
 */
const dependenciesUnavailableLineOf = (
  phase: ContainerPhase,
): Option.Option<string> =>
  phase._tag === "dependencies-unavailable"
    ? Option.some(
        `Dependencies unavailable: ${phase.reason} Type checking runs without your packages' types, and code still runs.`,
      )
    : Option.none()

export interface ContainerFailureAtoms {
  /** The current failure, whether or not its strip is dismissed. */
  readonly failureAtom: Atom.Atom<Option.Option<ContainerFailure>>
  /** The error whose strip was dismissed. */
  readonly dismissedFailureAtom: Atom.Writable<
    Option.Option<ContainerFailure["error"]>
  >
  /** The failure whose strip is showing: current and not dismissed. */
  readonly visibleFailureAtom: Atom.Atom<Option.Option<ContainerFailure>>
  /** The output panel's "dependencies unavailable" line, if any. */
  readonly dependenciesUnavailableLineAtom: Atom.Atom<Option.Option<string>>
  /**
   * Re-runs the failed phase without reloading the page: boots the Container
   * again after a boot failure, or installs again after an install failure.
   */
  readonly retryAtom: Atom.AtomResultFn<void, void, unknown>
}

export const makeContainerFailureAtoms = <R, ER>(options: {
  readonly runtime: Atom.AtomRuntime<R, ER>
  readonly containerPhaseAtom: Atom.Atom<Option.Option<ContainerPhase>>
}): ContainerFailureAtoms => {
  const failureAtom = Atom.map(options.containerPhaseAtom, (phase) =>
    Option.flatMap(phase, containerFailureOf),
  )
  const dismissedFailureAtom = Atom.make<
    Option.Option<ContainerFailure["error"]>
  >(Option.none()).pipe(Atom.keepAlive)
  const visibleFailureAtom = Atom.make((get) => {
    const failure = get(failureAtom)
    const dismissed = get(dismissedFailureAtom)
    return Option.filter(
      failure,
      (failure) =>
        Option.isNone(dismissed) || dismissed.value !== failure.error,
    )
  })
  const dependenciesUnavailableLineAtom = Atom.map(
    options.containerPhaseAtom,
    (phase) => Option.flatMap(phase, dependenciesUnavailableLineOf),
  )
  const retryAtom = options.runtime.fn<void>()(
    Effect.fnUntraced(function* (_, get) {
      const phase = get(options.containerPhaseAtom)
      if (Option.isNone(phase)) return
      switch (phase.value._tag) {
        case "failed": {
          if (phase.value.error._tag === "ContainerUnsupported") return
          const container = yield* Effect.serviceOption(Container)
          if (Option.isSome(container)) yield* container.value.retry
          return
        }
        case "install-failed": {
          const deps = yield* Effect.serviceOption(Dependencies)
          if (Option.isSome(deps)) yield* deps.value.install
          return
        }
      }
    }),
  )
  return {
    failureAtom,
    dismissedFailureAtom,
    visibleFailureAtom,
    dependenciesUnavailableLineAtom,
    retryAtom,
  }
}
