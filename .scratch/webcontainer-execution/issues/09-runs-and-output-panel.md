# 09: Runs: page-driven runner and output panel

Type: task
Status: resolved
Blocked by: 01, 03, 07, 08
Spec: ../spec.md

Add page-driven Runs.

- [x] The runner from ticket 01: `node --experimental-transform-types --import <abs preload> src/main.ts`, with the preload from `prototypes/01-type-stripping-runner/container/runner-preload.mjs` kept outside the mirrored Workspace
- [x] The first Run starts when types are first ready, and later Runs start about 500 ms after edits settle and Container writes are flushed
- [x] Any tsrs error in the Workspace skips the Run and prints why. Warnings don't block
- [x] A new Run kills the previous process, a skipped Run also stops it, there's no time limit, and Stop and Restart work
- [x] A skipped Run shows the reason and clickable errors on top, with the previous Run's output kept below it, dimmed
- [x] The bottom panel uses the layout from ticket 03, with a read-only xterm in the "Output" tab that clears per Run and writes a header (time and trigger)
- [x] Status badge "running" state
- [x] Unit tests for gating, debounce and replacement under `TestClock` with the fake Container

## Answer

Implemented in `apps/web/src/features/scratchpad/`.

- **`runs.ts`** (new): the `Runs` service (`makeRuns`, `layerRuns`). The runner is `node --experimental-transform-types --disable-warning=ExperimentalWarning --import ../.scratchpad/run-preload.mjs src/main.ts` in the Workspace dir. `run-preload.mjs` is spike 01's preload, shipped as `?raw` and written once to the host dir with `writeHostDirFile`. The path comes from `hostDirPath`.
- **Triggering.** Runs listen to the mirror's `onChange` (after `Dependencies`), so the debounce starts from when a change _landed in the Container_: one Run 500 ms after the last change. The first Run is pending from the start. Every Run, including the first, waits until `canRun(state)`, meaning the Container phase is `ready` or `dependencies-unavailable`. There is no Run while installing or loading types, and edits made meanwhile run once after. Changes that arrive during that wait get their own debounce. Restart skips the debounce. Trigger labels: `initial`, `restart`, `<path> changed`, `N files changed`.
- **Gate.** `blockingErrors` is checked before every Run. Any severity-1 diagnostic in any TypeScript document blocks the Run; warnings, infos and hints don't. A skipped Run stops the previous process, keeps its output, and sets `skipped { trigger, at, errors, previousRunId }`. The next Run clears it. The gate in `editor.ts` (`collectRunBlockers`) calls `client.sync()`, then waits until every open document has a push for its current version and no push has arrived for 400 ms (capped at 5 s). It then reads the cached pushes. The page does not pull diagnostics itself: a first version pulled from the page doubled the pulls of a document that crashes tsrs, and the worker ended in a full reconnect instead of quarantining the document.
- **Lifecycle.** A new Run kills the previous process (fiber interrupt → scope → `kill`) and clears the output. There is no time limit. `stop` and `restart` are on the service. The output ends with `exited with code N`, `stopped`, or the spawn error.
- **State for the UI.** `RunsState { available, run?: { id, trigger, startedAt, status }, skipped? }` and `RunOutput { runId, text, total }`. The output text is ANSI, starts with the header `▶ Run #N · HH:MM:SS · trigger`, and keeps the last 256 KiB. `total` counts every character appended, so the terminal writes only what is new. The session exposes `runStateAtom`, `runOutputAtom`, `stopRunAtom`, `restartRunAtom` and `revealPositionAtom` (opens a file at a 1-based line and column), and all of them are in the session context.
- **Panel.** `OutputPanel.tsx` follows the ticket 03 layout: tabs "Output", "Terminal" (soon, disabled) and "Traces" (soon, disabled), plus Stop, Restart and collapse. It can be resized from its top edge, and its height and collapsed state are kept in localStorage. Output is a read-only xterm (`RunOutputTerminal.tsx`, `disableStdin`, hidden cursor) whose colors follow the site's `dark` class. A skipped Run shows a DOM notice above the terminal, with the reason and clickable `path:line:col` errors. Below the notice is "— previous Run (#N) —", and the terminal is dimmed. Stack traces in program output are not links (spike 01: line numbers are off inside WebContainer).
- **Badge.** `describeContainerStatus(phase, runAlive)` shows "Running" (sky, pulsing) while a Run's process is alive in `ready` (and keeps the warning tone in `dependencies-unavailable`). `data-container-phase` is unchanged. A new `data-run-state="running"|"idle"` is added.
- `container.ts` and `dependencies.ts` are unchanged.

### For ticket 10 (failure strip)

- `<OutputPanel banner={…} />`: `banner` is a `ReactNode` rendered at the top of the panel body, above the skip notice and the terminal. It covers nothing. `Scratchpad.tsx` currently renders `<OutputPanel />` with no banner.
- Whether Runs can happen now: `runStateAtom` → `.available`, which is true in the `ready` and `dependencies-unavailable` phases. The panel also sets `data-runs-available` on `[data-testid="output-panel"]`. Restart is disabled while it is false. Once a retried install succeeds, a pending Run (the initial one) starts by itself.

### Verification

- `runs.test.ts` (11 tests, fake Container, real `Dependencies`, `TestClock`): first Run after types, with the command, preload and header; the debounce; multi-file triggers; replacement killing the previous process; no time limit; skip keeping the output and stopping the process, then running again after the fix; a gated first Run; no Run during an install, then one after it; Stop and Restart (Restart gated); a non-zero exit; `runBlockingErrorsOf` (errors only, 1-based, sorted). `status.test.ts` covers the running badge.
- E2E smoke (`scratchpad-worker.spec.ts`, real Container): Run #1 (`initial`) prints the seed's "Welcome to the Effect v4 Playground!". A type error shows the skip notice with "previous Run (#1)" and a `src/main.ts:L:C` link that opens the file. Fixing it gives Run #2.
- "recovers from a document that crashes the language server" still fails on its hover step (the 40,000-character lint range is intercepted by the gutter). It fails the same way on a clean checkout of `630e0ffb`, so it is not from this ticket.
