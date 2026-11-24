---
status: proposed
---

# A /play-style watch runner, gated by the web worker's diagnostics

ADR 0005 made the page decide when to Run and type each Run into the visitor's shell. That needed a Run bar, a skip banner and a typing guard so the page and the visitor didn't type over each other, and the result didn't feel like `/play`. This ADR replaces ADR 0005's "One terminal" part. Its two-way sync part still stands.

## Decision

- **The Container drives Runs, as on `/play`.** After the install, the page types the Workspace shell's command once (`../run src/main.ts`, the command legacy shares already carry in `shells[].command`). `run` is a long-running watcher in the Container. It re-runs the entry when a file in the program changes, and owns the terminal until Ctrl+C.
- **tsrs in the web worker is still the only type checker.** Whenever the worker's diagnostics are current for the files it checks, the page writes `.scratchpad/diagnostics.json` (outside the synced Workspace) with a content hash per checked file and the errors, pre-formatted like `tsc`. The runner waits until those hashes match the files on disk, then prints the errors and doesn't run, or runs the program. If no matching diagnostics arrive within about 5 s, it runs anyway with a one-line warning.
- **The terminal looks like `/play`.** The screen clears before each Run. Time-only status lines frame the output (`[12:04:31] File change detected…`, `Exited with code 0. Watching for file changes.`). There's no Run bar, banner or chip; the panel header keeps Clear and a Restart button, which re-triggers the runner without typing.
- The runner keeps printing the invisible OSC start/exit markers, so the page still knows the Run state (readiness indicator, Traces reset).

## Consequences

- The page's Run scheduler, the skip banner, the typing guard and the Run bar go away.
- While the visitor is in the shell (after Ctrl+C), nothing runs, as on `/play`.
- One extra hop (page writes, runner watches) adds tens of milliseconds per Run.
- Experimental: built on `feat/scratchpad-watch-runner`; if it's rejected, ADR 0005's terminal stays.
