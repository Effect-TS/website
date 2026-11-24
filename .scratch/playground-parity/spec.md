# Playground parity: the rest of the cutover bar

Status: ready-for-agent

## Problem

The Scratchpad runs code, shares and autosaves (`../webcontainer-execution/spec.md`). It still lacks what `/play` users rely on: an interactive terminal (the only way to add dependencies), the trace viewer, format-on-save, Effect v3, zip download, reset, and go-to-definition into libraries. It also has no quick fixes, which `/play` lacks too.

## Decisions (grilling round 2, 2026-11-23)

1. **Two-way sync**, as in `/play`, with the conflict rule "editor wins while dirty". See ADR 0005.
2. **One terminal (variant B).** An interactive `jsh` replaces the read-only Output terminal. Runs are typed into it. A Run bar sits above it, a skip banner shows tsrs errors, and a typing guard stops Runs from wiping half-typed input. See ADR 0005.
3. **Format-on-save with dprint**, as `/play` does: Ctrl/Cmd+S formats the active file using the Workspace's `dprint.json` and `/play`'s plugin loading, with plugins loaded lazily.
4. **Effect v3:** a v3/v4 toggle like `/play`'s. Switching asks for confirmation, resets to that version's seed, and the choice is remembered. v3 shares, `?code=` links and autosaves load directly. Types come from the install.
5. **Library go-to-definition** opens a read-only tab with the `.d.ts`, read from the worker's file system through a new worker op. The tab is labelled `node_modules/…` and doesn't appear in the explorer.
6. **Quick fixes:** tsrs `codeAction`s appear as buttons in the diagnostic tooltip (CodeMirror lint actions), and Ctrl/Cmd+. opens a menu of the fixes and refactors at the cursor. Inlay hints are out for now.
7. **Reset:** a Reset button, with a confirmation dialog, next to Share. It goes back to the current version's seed, clears the Scratchpad autosave and removes the share hash.
8. **Zip download:** a download button next to Share. The zip holds the same files as a share and is named after the Workspace. It reuses `/play`'s download service through `features/share/`.
9. **Trace viewer:** `/play`'s trace viewer and devtools model move into a shared `features/devtools/`. The Scratchpad reads the dev-tools proxy's output into a Traces tab. Spans reset per Run.
10. **Cutover is its own ticket** and happens only on the user's say-so. The production `_headers` check and making the CI job required stay with the user.

## Tickets

See `issues/`. 01–07 can run in parallel; 08 (cutover) waits for all of them.
