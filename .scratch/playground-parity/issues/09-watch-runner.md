# 09: A /play-style watch runner gated by the worker (experimental)

Type: task
Status: ready-for-agent
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
