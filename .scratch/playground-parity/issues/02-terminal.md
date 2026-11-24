# 02: One interactive terminal for Runs and commands (variant B)

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

Replace the read-only Output terminal with one interactive `jsh` shell, as described in ADR 0005 ("One terminal"). Mockup variant B: `.scratch/playground-parity/terminal-variants.html` (section B; the user chose B). `/play`'s shell wiring is in `features/playground/atoms/workspace.ts` (`createTerminal`) and `services/webcontainer.ts` (`createShell`).

- [ ] Container service: `shell({ cols, rows })` gives a scoped interactive `jsh` (input writer, output stream, resize), in the Workspace dir with `node_modules/.bin` on PATH. The fake Container gets an equivalent
- [ ] The panel's terminal tab is that shell (xterm with fit and theme, at the current font size). It starts when the panel first mounts and restarts after a Container retry. Install output (`pnpm install`) is written into it, as on `/play`
- [ ] Runs are typed into the shell: Ctrl+C for the foreground, then the run command (the current `node --experimental-transform-types --import <preload> src/main.ts` line; consider a short wrapper script in `.scratchpad/` so the typed line is short, like `/play`'s `../run src/main.ts`). Keep Run state (running/exited/exit code): for example the wrapper prints an OSC marker or writes the exit code to a file, or a `jsh` feature if one exists. Find the most reliable way
- [ ] Run bar above the terminal: state dot, entry file, trigger and time, elapsed, Stop and Restart. Replaces the current header/Restart controls
- [ ] Skip banner: when the gate skips a Run, an amber banner lists the first error with a clickable `file:line:col` link (reveal in editor) and expands to show all. It clears when the next Run starts. Skip reports are no longer written into the xterm
- [ ] Typing guard: track whether the visitor has typed input at the prompt (onData since the last Enter, cleared on Enter, Ctrl+C or Ctrl+U). If they have, the Run waits and a chip says "Run waiting for your command · Enter to finish · Esc to discard it and run". Esc sends Ctrl+U (or Ctrl+C), then the Run goes
- [ ] Clear button. The `file:line:col` link provider stays on the terminal for stack traces
- [ ] Keep the readiness indicator, failure strip and install-failed log working (the install log may now simply be in the shell)
- [ ] Unit tests for the Run/typing-guard state machine with a fake shell. Update the e2e specs (container: a Run's output appears in the terminal, `pnpm add` typed into the terminal works and types reload once ticket 01 lands, so make that part tolerant or `test.fixme` with a note; worker e2e: skip banner with a clickable link)
