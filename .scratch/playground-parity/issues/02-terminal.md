# 02: One interactive terminal for Runs and commands (variant B)

Type: task
Status: resolved
Blocked by:
Spec: ../spec.md

Replace the read-only Output terminal with one interactive `jsh` shell, as described in ADR 0005 ("One terminal"). Mockup variant B: `.scratch/playground-parity/terminal-variants.html` (section B; the user chose B). `/play`'s shell wiring is in `features/playground/atoms/workspace.ts` (`createTerminal`) and `services/webcontainer.ts` (`createShell`).

- [x] Container service: `shell({ cols, rows })` gives a scoped interactive `jsh` (input writer, output stream, resize), in the Workspace dir with `node_modules/.bin` on PATH. The fake Container gets an equivalent
- [x] The panel's terminal tab is that shell (xterm with fit and theme, at the current font size). It starts when the panel first mounts and restarts after a Container retry. Install output (`pnpm install`) is written into it, as on `/play`
- [x] Runs are typed into the shell: Ctrl+C for the foreground, then the run command (the current `node --experimental-transform-types --import <preload> src/main.ts` line; consider a short wrapper script in `.scratchpad/` so the typed line is short, like `/play`'s `../run src/main.ts`). Keep Run state (running/exited/exit code): for example the wrapper prints an OSC marker or writes the exit code to a file, or a `jsh` feature if one exists. Find the most reliable way
- [x] Run bar above the terminal: state dot, entry file, trigger and time, elapsed, Stop and Restart. Replaces the current header/Restart controls
- [x] Skip banner: when the gate skips a Run, an amber banner lists the first error with a clickable `file:line:col` link (reveal in editor) and expands to show all. It clears when the next Run starts. Skip reports are no longer written into the xterm
- [x] Typing guard: track whether the visitor has typed input at the prompt (onData since the last Enter, cleared on Enter, Ctrl+C or Ctrl+U). If they have, the Run waits and a chip says "Run waiting for your command · Enter to finish · Esc to discard it and run". Esc sends Ctrl+U (or Ctrl+C), then the Run goes
- [x] Clear button. The `file:line:col` link provider stays on the terminal for stack traces
- [x] Keep the readiness indicator, failure strip and install-failed log working (the install log may now simply be in the shell)
- [x] Unit tests for the Run/typing-guard state machine with a fake shell. Update the e2e specs (container: a Run's output appears in the terminal, `pnpm add` typed into the terminal works and types reload once ticket 01 lands, so make that part tolerant or `test.fixme` with a note; worker e2e: skip banner with a clickable link)

## Answer

Implemented in `apps/web/src/features/scratchpad/`.

- **`container.ts`**: new `shell(size)` op → scoped `ContainerShell { output, write, resize, exitCode }`. Backend op `shell(size, { env })`. The WebContainer backend spawns `jsh` in `workspace/` with a PTY, `PATH=CONTAINER_BIN_PATH` and `NODE_NO_WARNINGS=1`, as `/play` does. The fake backend (`test/features/scratchpad/fake-container.ts`) has a scripted jsh (`FakeShell`). It echoes input, runs entered lines through `command(line)`, prints a `❯` prompt, and handles Ctrl+C and Ctrl+U. It wraps Run lines in the wrapper's markers.
- **`terminal.ts`** (new, `Terminal` service, `layerTerminal`): owns the one shell.
  - It starts on the first `open(size)` (the panel mounting) or the first Run, once the Container is ready. After a failed boot it waits for `retry` and starts then. If the shell exits, it prints a line and starts a new one after 1 s.
  - Output is buffered as `TerminalOutput { generation, text, total }` (last 256 KiB), so the xterm can be recreated and replay it. `clear` keeps only the current line (the prompt) and bumps `generation`.
  - Every `pnpm install` (from `Dependencies.installLogChanges`) is printed into the terminal: `$ pnpm install`, pnpm's output, and a red line if it failed. Afterwards an Enter is sent for a fresh prompt if the visitor isn't using it.
  - **Run state from OSC markers.** `run-wrapper.cjs` is written to `.scratchpad/run.cjs` and typed as `node ../.scratchpad/run.cjs src/main.ts`. It runs the old node line (transform-types plus preload) as a child, and prints `ESC]7777;scratchpad-run;start BEL` and `…;exit;<code> BEL`. It handles SIGINT/SIGTERM: kill the child, report 130/143. The parser strips the markers, including ones split across chunks. The exit marker becomes `exited with code N · HH:MM:SS`. An exit marker that arrives before the current Run's start marker belongs to an earlier wrapper and is ignored. Ctrl+C (sent by the page or typed by the visitor) marks the Run interrupted at once, so a Run never gets stuck as running if the wrapper is killed without printing.
  - **Foreground tracking** (`idle | run | command | stopping`) and `typing` come from the visitor's keystrokes (`input`), the markers, and jsh's prompt. Real jsh prints `~/scratchpad/workspace [6s]` then `❯ `, and `SHELL_PROMPT_PATTERN = /❯ $/` was checked against it in a real Container.
  - `run(line, id)`: if a Run or visitor command is in the foreground, it sends Ctrl+C and waits up to 1.5 s for the exit marker or prompt. Then it types the line. Events (`RunExited` / `RunInterrupted`) carry the Run id.
- **`runs.ts`**: Runs no longer spawn. They type into the `Terminal`. Removed: `RunOutput`, `runOutputAtom`, `skipReport` and the header/exit lines in the output (the terminal keeps history; Clear empties it). `RunInfo` gains `entry` and `endedAt`. `RunSkip` loses `previousRun*`. `RunsState` gains `waiting: "typing" | "command" | undefined`.
  - The **typing guard** runs after the debounce and install wait, before the gate. While the visitor has typed at the prompt, the Run waits (`typing`). After they press Enter, it also waits for their command to finish (`command`) rather than Ctrl+C-ing it straight away. That's a deliberate tightening of ADR 0005's "a long-running visitor command is interrupted by the next Run": the chip offers Esc instead.
  - Esc → `Terminal.discardInput`: Ctrl+U for a typed line, Ctrl+C for a running command. Then the Run goes. Edits made while waiting are folded into that Run's trigger.
  - A skip sends Ctrl+C to a running Run (as before, the previous program stops) and sets `skipped` until the next Run.
- **UI**:
  - `OutputPanel.tsx`: one `Terminal` tab, Clear, collapse.
  - `TerminalView.tsx` (was `RunOutputTerminal.tsx`): interactive xterm with fit, light/dark theme and a visible cursor. It keeps the `file:line:col` link provider for stack traces and maps `file:///…/workspace/…` to Workspace paths, without linking `node_modules`.
  - `RunBar.tsx`: `RunBar` (dot, state, entry, trigger and time, elapsed, Stop, Restart), `SkipBanner` (amber, first error's link, "all N" expands every error), and `RunWaitingChip`.
  - FailureStrip, the readiness indicator and the dependencies-unavailable line are unchanged. The install-failed log is now simply in the shell.

### Interface notes for other tickets

- **Traces (07)**: add `{ id: "traces", label: "Traces" }` to `PANEL_TABS` in `OutputPanel.tsx`, and a sibling body `<div role="tabpanel" className={tab === "traces" && !layout.collapsed ? "relative flex min-h-0 flex-1 flex-col" : "hidden"}>` after the terminal one. Bodies stay mounted while hidden. A new Run is `runStateAtom` → `run.id` changing. The program now runs as a child of `run.cjs` (same env, same port 34437 for devtools).
- **Two-way sync (01)**: Runs are triggered by the mirror's `onChange` (`Applied` events). If Container-sourced events skip the mirror, terminal-made edits won't trigger Runs. That's probably what you want, but check it. `pnpm add` typed in the terminal is a visitor `command`, so a due Run waits for it to finish. The container e2e still calls `__scratchpadTest.install()` after typing `pnpm add`, to sync back until 01 lands. Once 01 lands it is a harmless extra install and can go.
- **Session API**: `runOutputAtom` is gone. New atoms: `terminalOutputAtom`, `openTerminalAtom`, `resizeTerminalAtom`, `terminalInputAtom`, `discardTerminalInputAtom`, `clearTerminalAtom` (in the session context). The Container service has `shell`. Anything implementing `ContainerBackend` needs a `shell` method.
- Test ids: `terminal`, `terminal-clear`, `run-bar`, `run-bar-status`, `run-elapsed`, `run-skip-banner`, `run-skip-location`, `run-skip-toggle`, `run-skip-errors`, `run-waiting` (`data-waiting`), `panel-tab-terminal`. `run-output` keeps `data-run-id/status/skipped` and adds `data-run-waiting`. `run-output-terminal` and `run-output-empty` are gone.

### Verification

- Unit tests: `runs.test.ts` (16: scheduling, gate, Stop/Restart, exit codes, visitor Ctrl+C, typing guard with Enter→command→Run, Esc with Ctrl+U, Esc with Ctrl+C, line clearing) and `terminal.test.ts` (8: marker parser across chunks, start after a retried boot and resize, restart after the shell exits, stale exit markers, install printing, Clear, waiting for a stopping command). A mutation check confirmed that removing the guard fails the guard tests.
- E2E: the container spec covers Runs typed into the terminal (exit line, Run bar), `pnpm add` typed into the terminal through to a resolving import, Stop/Restart with Clear, and the typing guard with Esc. The worker spec has a new test for the skip banner and its clickable location.
- Checks, run from the repo root: `vp lint` is clean, `astro check` reports 0 errors, and `vp test run apps/web/test/features packages/tsrs-lsp-wasm` passes (579 passed, 2 skipped). Playwright worker config (port 14421): 11/11 passed. Playwright container config (port 14422): 6/6 passed against a real WebContainer.
- Screenshots: `.scratch/playground-parity/screenshots/02-{running,skipped,typing-guard}-{dark,light}.png`. The skipped shot has the banner expanded. In the typing-guard shot the chip sits in its own row under the terminal, so it covers no part of the prompt. The thing overlapping the bottom edge of the shots is Astro's dev toolbar, which only appears in dev.
