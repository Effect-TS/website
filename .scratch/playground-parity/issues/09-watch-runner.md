# 09: A /play-style watch runner gated by the worker (experimental)

Type: task
Status: resolved
Blocked by: 02
Spec: ../spec.md

Implement `docs/adr/0006-watch-runner-gated-by-the-worker.md` on branch `feat/scratchpad-watch-runner`. Mockup: `.scratch/playground-parity/watch-runner.html`. It replaces ticket 02's Run model; keep 02's shell, terminal view, theme, fonts, link provider and Clear.

- [ ] `run` runner script in the Container (replacing `run-wrapper.cjs`'s role), reachable as `../run` from the Workspace dir like `/play`'s. It watches the program's files (the paths listed in the diagnostics file; also `package.json`), debounces, clears the screen, prints `[HH:MM:SS] File change detected. …`, waits for matching diagnostics, then prints tsc-style errors (`path:line:col - error TSxxxx: message`, code frame with `~~~` underline) plus `Found N errors. Not running. Watching for file changes.`, or runs the entry under the existing preload (`node --experimental-transform-types --import <preload>`), killing the previous program first. After exit: `[HH:MM:SS] Exited with code N. Watching for file changes.` Keeps the OSC start/exit markers. Ctrl+C kills the program and exits the runner
- [ ] Page: after each tsrs diagnostics settle for the current documents (reuse the Run gate's freshness logic: versions pushed, types mounted), write `.scratchpad/diagnostics.json` `{ files: { path: sha }, errors: [...] }`. Hash the same bytes the Container sees
- [ ] After the first install, type the Workspace shell's command (default `../run src/main.ts`) into the shell once, as `/play` does. Restart after a Container retry
- [ ] Restart button in the panel header: signals the runner to re-run (touch a `.scratchpad/restart` file the runner watches) without typing. Disabled when the runner isn't in the foreground (no OSC marker seen since its last exit)
- [ ] Remove the page's Run scheduler, typing guard, Run bar, skip banner and waiting chip, and the code and tests only they used. Keep the readiness indicator's running state and the Traces reset working from the OSC markers
- [ ] Two-way sync stays: Container-side changes reach the editor, and the runner re-runs on them like `/play`
- [ ] Unit tests for the diagnostics file writer and the runner (run it under Node in vitest against a temp dir with a fake entry); update the e2e specs (container: seed runs, an edit re-runs with a cleared screen, a type error prints tsc-style and doesn't run, fixing it runs, Ctrl+C gives a shell and `pnpm add` works, Restart; worker spec: remove the skip-banner test or replace it)

## Answer

Implemented in `apps/web/src/features/scratchpad/` on branch `t3/scratchpad-watch-runner` (not `feat/…`: the worktree came with this branch).

- **`run-watch.cjs`** (new; replaces `run-wrapper.cjs`): the watch runner. It is written to the workdir as an executable `run`, so the shell reaches it as `../run src/main.ts`. It polls the entry, `package.json` and the files listed in `.scratchpad/diagnostics.json` every 100 ms, because `fs.watch` is unreliable in the Container. A path that joins the watched set (a new diagnostics file lists it) is recorded, not counted as a change.
  - **Cycle**: a change waits 150 ms of quiet. Then the runner kills the previous program (quietly, `exit;137` marker), clears the screen and scrollback, and waits until every hash in the diagnostics file matches the disk. With errors it prints them and `Found N errors. Not running. Watching for file changes.` Otherwise it prints `Running <entry>…` and runs `node --experimental-transform-types --import <preload> <entry>`, then `[HH:MM:SS] Exited with code N. Watching for file changes.`
  - **Status lines**: the first line of each cycle says why (`Starting in watch mode.`, `File change detected.`, `Restarting.`) and the result (`Type-checked in the editor: 0 errors.`).
  - **Timeout**: if no matching file arrives within 5 s, it prints a yellow `No type check from the editor after 5 s: running anyway.` It runs again (`Type check arrived.`) once a matching file shows up.
  - **Install**: while the page installs, the file is `{ installing: true }`. The runner waits with no timeout and, after 1 s, prints `Waiting for the install to finish…`.
  - **Restart**: a change to `.scratchpad/restart` re-runs.
  - **Markers**: `watch;start` and `watch;exit` around the runner, `start` and `exit;<code>` around each program. Ctrl+C (SIGINT) kills the program and exits with 130.
  - Env overrides (`SCRATCHPAD_RUN_POLL_MS`, `_DEBOUNCE_MS`, `_DIAGNOSTICS_TIMEOUT_MS`) exist for the unit tests.
- **`diagnostics-file.ts`** (new): `diagnosticErrorsOf` (moved from `runs.ts`), `formatTscError` (tsc `--pretty` style: cyan path, yellow position, red `error`, grey code, a code frame with an inverse gutter and a red `~` underline over the range's first line), `encodeDiagnosticsFile` (SHA-256 of each file's UTF-8 text via `crypto.subtle`, which matches Node's `createHash`), `installRunner`, and `runDiagnosticsWriter`.
  - **When the writer writes**: on every diagnostics push, Workspace event or Dependencies state change, it checks `current` (polling every 50 ms, giving up after 15 s until the next wake-up). It writes the file only if the content changed. While the Container can't run code, it writes `INSTALLING_FILE` instead.
- **`editor.ts`**: the Run gate became `currentDiagnosticsCheck`, which reuses the gate's freshness logic: every Workspace document has a push for its current version, made after the latest types mount, and no push has come for 400 ms. It hashes the LSP documents' text (what tsrs checked), plus the Workspace's `package.json`. Unlike the old gate it never calls `client.sync()`. Polled every 50 ms, that sent each keystroke at once and kept the worker re-pulling, which made the worker spec's lint-tooltip hover flaky (2 of 3 failed; 4 of 4 passed without it). New config `shellCommand`; `Scratchpad.tsx` passes the loaded share's `shells[0].command`.
- **`terminal.ts`**: no more typing guard, foreground tracking, `run`, `interrupt`, `discardInput` or exit line.
  - **State**: `TerminalState` is `{ shell, runner, run }` and comes from the markers. A new `start` makes a new Run id. If the shell exits while the runner is up, the runner flag clears and a running Run becomes `stopped`.
  - **Typing the command**: after the first install (`canRun`), the terminal writes the runner and preload, then types the command (default `../run src/main.ts`) into the first shell of each boot. A shell restarted after `exit` gets nothing; the first shell after a Container retry gets the command again.
  - **Restart**: `restart` touches the restart file, only while the runner is in the foreground.
  - **Install output**: still printed into the terminal, without the extra Enter afterwards.
- **`container.ts`**: new op `writeExecutable(name, content)`, which writes to the workdir and runs `chmod +x`, as `/play` does.
- **UI**:
  - `OutputPanel.tsx`: Restart (`run-restart`) joins Clear in the header and is disabled while the runner isn't in the foreground. `run-output` keeps `data-run-id` and `data-run-status`, adds `data-runner`, and drops `data-run-skipped`, `data-run-waiting` and `data-runs-available`.
  - `TerminalView.tsx`: lost `onEscape`.
  - The readiness indicator's running state and the Traces reset read `TerminalState.run`.
- **Removed**: `runs.ts`, `RunBar.tsx` (Run bar, skip banner, waiting chip), `run-wrapper.cjs`, `runs.test.ts`, the session's `runStateAtom`, `stopRunAtom` and `discardTerminalInputAtom`, and the old terminal tests for the typing guard and Run typing. `runStateAtom` became `terminalStateAtom`.
- `GLOSSARY.md`: "Run" now says the watch runner starts it, and "Watch runner" is a new entry.

### Verification

- **Unit tests**:
  - `run-watch.test.ts` (8, new): the runner under real Node in a temp dir laid out like the workdir. It waits for a matching check and runs with TypeScript syntax; it prints errors without running, and the fix runs on a cleared screen; an edit kills a running program; it re-runs on another listed file, `package.json` and Restart; a file joining the watched set isn't a change; it runs anyway after the timeout with a warning, then again once the check arrives; it waits past the timeout while installing; Ctrl+C kills the program and exits 130 with the markers.
  - `diagnostics-file.test.ts` (5, new): tsc formatting, hashes equal to Node's `createHash`, `diagnosticErrorsOf`, and the writer (`installing` marker, a write once current, no rewrite of the same check, polling until current, the marker again on reinstall).
  - `terminal.test.ts` (9, rewritten): the markers, typing the command once runnable and after the runner is written, not retyping after `exit`, the command on a retried boot, the Run state from the markers and the shell exiting, and Restart.
  - `runs.test.ts` is gone.
- From the repo root: `vp lint` is clean, `astro check` reports 0 errors, and `vp test run apps/web/test/features packages/tsrs-lsp-wasm` passes (58 files, 639 passed, 2 skipped).
- **Playwright worker** (port 14491): 17/17 passed. The skip-banner test was removed, since nothing on the page reports skips any more; type errors are now covered in the container spec.
- **Playwright container** (port 14492): 9/9 passed against a real WebContainer.
  - It covers: seed Run; an edit re-runs on a cleared screen; a tsc-style type error that doesn't run, and its fix that does; file sync; Ctrl+C gives a shell where Restart is disabled, `pnpm add` works, and `../run src/main.ts` starts the runner again; legacy share; v3 switch; Restart on a long-running program, then Ctrl+C with no Runs on later edits; Traces.
  - The v3 test now waits for the reinstall to start before `awaitInstalledTypes`. Otherwise the old `ready` could satisfy it, and the test skipped as "did not install".
- **Screenshots**: `.scratch/playground-parity/screenshots/09-{clean-run,type-error,shell-after-ctrl-c}-{dark,light}.png`. The dark thing at the bottom edge is Astro's dev toolbar.

### Notes

- The runner polls instead of using `fs.watch`. That costs about 10 small file reads every 100 ms and has been fine in the Container.
- While the visitor has the shell (after Ctrl+C), the page keeps writing the diagnostics file. Nothing runs until `../run` starts again, as on `/play`.
- The first cycle may briefly see the install marker left by the first install. The `Waiting for the install to finish…` line only prints after 1 s, so it normally doesn't show.
