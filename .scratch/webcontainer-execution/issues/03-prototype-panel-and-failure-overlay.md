# 03: Prototype: bottom panel layout and failure overlay

Type: prototype
Status: ready-for-human
Spec: ../spec.md

Build a throwaway visual prototype of the Scratchpad layout with execution, for the user to review. The user said their choice of overlay may change after seeing it.

- [ ] Explorer, editor, and a resizable, collapsible bottom panel with an "Output" tab (plus placeholder "Terminal" and "Traces" tabs)
- [ ] Output states: running with a Run header, a skipped Run ("2 type errors in src/main.ts"), stopped, plus the Stop and Restart controls
- [ ] Status badge phases: booting, installing, loading types, ready, running
- [ ] Non-blocking failure overlay in the output panel for an unsupported browser, a boot failure, an install failure showing pnpm output, and dependencies unavailable, each with Retry and help
- [ ] Show one modal-dialog variant next to it for comparison
- [ ] Record the user's choice under `## Answer`
