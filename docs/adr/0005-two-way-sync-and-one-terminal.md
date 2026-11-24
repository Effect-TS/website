---
status: accepted
---

# Two-way Container sync and one terminal for Runs and commands

ADR 0004 made the Container a one-way mirror of the page Workspace, and it made Runs page-driven with output in a read-only panel. To replace the Playground, the Scratchpad needs an interactive terminal, and anything the terminal does to files has to show up in the editor, as it does on `/play`. This ADR replaces two parts of ADR 0004: the "one-way mirror" and the "nothing else flows Container → page" rules. The rest of ADR 0004 still holds: the page Workspace remains the source of truth for editing, Runs stay page-driven and gated by tsrs errors, and types still come from installed `node_modules`.

## Decision

**Two-way sync.** The page keeps writing each Workspace change to the Container as it happens. The Container's Workspace directory is also watched recursively, and changes there are pulled back into the Workspace:

- **Ignored paths:** `node_modules`, `dist`, `.git`, `.tsc-run.json`, any file over 1 MB, and any file that isn't valid UTF-8. These stay in the Container only.
- **Conflicts:** a file is _dirty_ from the page's last change until the Container has written that exact content. A Container-side change to a dirty file is dropped, so the editor wins (the same rule as `/play`, whose window is 2 s). Otherwise the change replaces the Workspace file. Open editors update in place, keeping the cursor where possible, and the language server sees the change.
- **Created and deleted files** appear in and disappear from the Workspace, the explorer and the tabs.
- **Protected files** (`package.json`, `tsconfig.json`) are restored if deleted in the Container. Edits to them sync like any other file.
- **`package.json` changes from the Container** mean something like `pnpm add` already ran. The page doesn't reinstall; it waits for the install to settle, syncs the lockfile back, and reloads types.
- Synced files go into shares and autosave like any other Workspace file.

**One terminal.** The Output panel becomes a single interactive `jsh` shell in an xterm, with `/play`'s look. The page types each Run's command into that shell:

- **Run bar:** a bar above the terminal shows the current Run (state, entry file, trigger, time) with Stop and Restart.
- **Stopping the old Run:** a new Run sends Ctrl+C to whatever is in the foreground before typing the command.
- **Typing guard:** if the visitor has typed part of a command, the Run waits and a chip says so. Enter finishes the command, then the Run goes; Esc discards the input, then the Run goes.
- **Skipped Runs:** when the tsrs gate skips a Run, a banner above the terminal lists the errors with clickable `file:line:col` links. It stays until the next Run starts.

## Considered options

- **Keep the one-way mirror and only sync back `package.json` and the lockfile.** Rejected. Files created or changed in the terminal would silently vanish from the editor, shares and autosave, which is worse than `/play`.
- **`/play`'s model exactly: the terminal runs `tsc --watch` and node.** Rejected for the reasons in ADR 0004 (double type-checking, slower, no clickable skip report).
- **Separate Output and Terminal panes, or Warp-style blocks.** Not chosen for now. Blocks would mean replacing xterm's model, and split panes stray from `/play`'s single terminal.

## Consequences

- The Container now writes to the Workspace, so `WorkspaceEvent`s have two sources. Events from the Container are tagged so the mirror doesn't write them back.
- Recursive watches on the Container root froze it after installs (ADR 0004). The watch is on the Workspace directory with `node_modules` ignored in the callback. If the freeze shows up there too, fall back to polling.
- Runs and the visitor share one shell, so a long-running visitor command (say a dev server) is interrupted by the next Run. That's also what happens on `/play`.
