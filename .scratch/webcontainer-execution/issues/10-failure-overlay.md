# 10: Failure states and overlay

Type: task
Status: resolved
Blocked by: 03, 07, 08
Spec: ../spec.md

Make the Scratchpad degrade instead of failing when the Container can't do its job.

- [x] Variant B2 from ticket 03: a strip across the top of the output panel that covers nothing, with the pnpm output printed below it as normal output
- [x] Strip states: unsupported browser (with browser-support help), boot failed, install failed (with pnpm output visible)
- [x] Dependencies unavailable (install succeeded, types never reached the editor): the badge plus one output line, with no strip, and Runs keep working
- [x] Retry re-runs the failed phase without reloading the page
- [x] Editing, LSP, share and autosave keep working in every failure state
- [x] Unit tests for each state with the fake Container

## Answer

Implemented in `apps/web/src/features/scratchpad/`.

### Retry

- **Boot** (`container.ts`): `ContainerService.retry` boots again after a failed boot and does nothing in any other phase. `makeContainer` runs each boot attempt in its own child scope. A failed attempt's scope is closed before the failure is announced, so the partly booted WebContainer is torn down and the one-instance guard in `container-webcontainer.ts` is released before the next attempt takes it. The successful attempt's scope lives until the Container's scope closes. The phase goes `failed → booting → ready`, and operations wait on the current attempt. A second Retry while the retried boot is still running does nothing.
- **Mirror**: a failed boot no longer ends `mirrorWorkspace`. It drops its event buffer, waits for the phase to leave `failed`, lists the Workspace again and mounts it, so edits made while the Container was down land in one mount and are not replayed.
- **Dependencies**: the mount after a retry starts the install as usual. The types timeout now starts on the first `ready` from `phaseChanges` rather than `awaitReady`, so it also runs after a retried boot. An install failure is retried with the existing `Dependencies.install`.
- **Unsupported browser**: no Retry, since it cannot succeed. `retryAtom` ignores `ContainerUnsupported`, and the strip shows browser-support help instead.
- Nothing rebuilds a layer, so editing, the language server, share and autosave are untouched by a failure or a retry.

### UI

- **`failure.ts`**: `containerFailureOf(phase)` maps a phase to `Option<ContainerFailure>` (`kind: "unsupported" | "boot-failed" | "install-failed"`, `title`, `message`, `detail`, `canRetry`, `retryLabel`, `helpUrl`, `helpLabel`, `installLogTail`, `error`). `dependenciesUnavailableLineOf(phase)` returns the one output line for `dependencies-unavailable`, which has no strip. `makeContainerFailureAtoms({ runtime, containerPhaseAtom })` returns `failureAtom`, `visibleFailureAtom`, `dismissedFailureAtom`, `dependenciesUnavailableLineAtom` and `retryAtom`. A dismissal is keyed by the error object, so the next failure shows the strip again.
- **`FailureStrip.tsx`**: variant B2 with an icon, a bold title and a plain-language message, Retry where it helps, a browser-support link for unsupported and boot failures (https://webcontainers.io/guides/browser-support), and Hide (×). It uses `data-testid="container-failure"` and `data-failure-kind`, and comes in light and dark. It never renders the pnpm log. `useFailureState()` returns `Option<FailureState>`, which is the failure plus `visible`, `retry`, `dismiss` and `show`.
- **Badge**: while a failure is active, `ContainerStatusIndicator` is a button that shows a hidden strip again.
- **Context**: the session context now carries `installLogAtom` and the failure atoms. `Scratchpad.tsx` builds them next to the share atoms.
- **Copy**: adapted from the prototype's `failures.tsx` (recovered from a t3 checkpoint ref).

### For ticket 09 (Output panel)

- Move `<FailureStrip />` from under `<EditorTabs />` in `Scratchpad.tsx` (marked "Temporary") into the panel's `banner` slot.
- When the phase is `install-failed`, print `installLogAtom`'s `output` (raw ANSI, last 64 KiB) as ordinary output below the strip. `useFailureState()`'s `installLogTail` is the last 4 KiB if the full log has been replaced.
- Print `dependenciesUnavailableLineAtom`'s line, when `Some`, as one output line. Runs stay allowed in that phase.
- Until the panel lands, the pnpm output of a failed install is not shown anywhere.

### Verification

- Unit tests: `failure.test.ts` (new). It covers each state's copy, Retry and help, and no strip for the other phases. On a Scratchpad session with the fake Container it covers: boot failed → Retry → ready, with the edit made while failed remounted; install failed → Retry → ready; unsupported with Retry doing nothing; hide and show, plus a new failure after a dismissed one; and dependencies-unavailable as a line with no strip. In every state it checks that typing reaches the Workspace, and that autosave and share compression run against it. `container.test.ts` adds retry (scope released before the next attempt, phase sequence, no-op while booting or ready) and the mirror remount after a retry. `dependencies.test.ts` adds install and types after a retried boot, the types timeout after a retried boot, and a retried install. Removing the mirror's remount fails 4 of these.
- E2E (`scratchpad-worker.spec.ts`, Chromium): the page is served without COOP/COEP through `page.route`, which needs no test-only flag. The test checks the unsupported strip with no Retry and the help link, that the language server reaches ready and editing works, and that Hide followed by a badge click brings the strip back. Boot-failure retry in a real WebContainer has no e2e: forcing a boot to fail would need a test hook in production code, and the unit tests cover it.
